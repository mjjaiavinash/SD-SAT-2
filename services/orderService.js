const db = require('../database');
const cartService = require('./cartService');
const inventoryService = require('./inventoryService');
const paymentService = require('./paymentService');
const deliveryService = require('./deliveryService');
const cacheService = require('./cacheService');
const eventQueue = require('./eventQueue');

/**
 * Order Service
 * Orchestrates checkout workflow across Inventory, Payment, Delivery, and Cache.
 */
class OrderService {
  /**
   * Place an order from current cart items or direct items payload
   */
  async createOrder({ customer_name, customer_email, shipping_address, payment_method = 'Credit Card' }) {
    // 1. Validate customer input
    if (!customer_name || typeof customer_name !== 'string' || customer_name.trim() === '') {
      throw new Error('Customer name is required');
    }
    if (!customer_email || typeof customer_email !== 'string' || !customer_email.includes('@')) {
      throw new Error('A valid customer email is required');
    }
    if (!shipping_address || typeof shipping_address !== 'string' || shipping_address.trim() === '') {
      throw new Error('Shipping address is required');
    }

    // 2. Retrieve cart items
    const cart = cartService.getCart();
    if (!cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty. Please add products before placing an order.');
    }

    // 3. Format items for inventory check
    const itemsToCheck = cart.items.map(i => ({
      productId: i.productId,
      quantity: i.quantity
    }));

    // 4. Check stock availability
    const stockCheck = inventoryService.checkAvailability(itemsToCheck);
    if (!stockCheck.available) {
      const details = stockCheck.insufficientItems
        .map(i => `${i.productName}: requested ${i.requested}, only ${i.available} left in stock`)
        .join('; ');
      throw new Error(`Cannot place order due to stock shortage: ${details}`);
    }

    // 5. Process simulated payment
    const paymentResult = await paymentService.processPayment({
      amount: cart.total,
      method: payment_method,
      customerName: customer_name.trim()
    });

    // 6. Deduct inventory atomically
    inventoryService.reserveStock(itemsToCheck);

    // Evict product caches so new inventory count is reflected
    cacheService.delByPrefix('products:');

    // 7. Generate order ID and timestamp
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    // 8. Insert into SQLite orders table
    db.run(
      `INSERT INTO orders 
        (id, customer_name, customer_email, shipping_address, payment_method, payment_id, total_amount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        customer_name.trim(),
        customer_email.trim(),
        shipping_address.trim(),
        paymentResult.method,
        paymentResult.transactionId,
        cart.total,
        'PLACED',
        now,
        now
      ]
    );

    // 9. Insert order items
    for (const item of cart.items) {
      db.run(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.productName, item.price, item.quantity]
      );
    }

    // 10. Insert initial event in order_events
    db.run(
      `INSERT INTO order_events (order_id, stage, description, timestamp)
       VALUES (?, ?, ?, ?)`,
      [orderId, 'PLACED', `Order received and confirmed. Payment authorized via ${paymentResult.method} (Txn: ${paymentResult.transactionId})`, now]
    );

    // 11. Clear cart
    cartService.clearCart();

    const createdOrder = this.getOrderById(orderId);

    // 12. Publish event to asynchronous message queue
    eventQueue.publish('order.created', createdOrder);

    console.log(`[Order Service] Order #${orderId} successfully created for $${cart.total}`);
    return createdOrder;
  }

  /**
   * Get all orders with items
   */
  getAllOrders() {
    const orders = db.query('SELECT * FROM orders ORDER BY created_at DESC');
    return orders.map(o => {
      const items = db.query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
      return {
        ...o,
        items
      };
    });
  }

  /**
   * Get single order by ID with items and timeline
   */
  getOrderById(orderId) {
    const order = db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return null;

    const items = db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    const events = db.query('SELECT * FROM order_events WHERE order_id = ? ORDER BY id ASC', [orderId]);

    return {
      ...order,
      items,
      events
    };
  }

  /**
   * Get tracking details for an order
   */
  getOrderTracking(orderId) {
    return deliveryService.getOrderTracking(orderId);
  }

  /**
   * Advance order stage (manual override for demo)
   */
  async advanceStage(orderId, stage = null) {
    return await deliveryService.advanceStage(orderId, stage);
  }
}

module.exports = new OrderService();
