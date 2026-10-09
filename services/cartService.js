const db = require('../database');
const inventoryService = require('./inventoryService');

/**
 * Cart Service
 * Manages shopping cart items, performs stock validation, and computes totals.
 */
class CartService {
  /**
   * Get full cart details with product metadata and cost calculations
   */
  getCart() {
    const rawItems = db.query(`
      SELECT 
        c.id as cart_item_id,
        c.product_id,
        c.quantity,
        c.created_at,
        p.name as product_name,
        p.price,
        p.stock,
        p.category,
        p.image_url
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      ORDER BY c.id ASC
    `);

    let subtotal = 0;
    const items = rawItems.map(item => {
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      const isAvailable = item.stock >= item.quantity;

      return {
        cartItemId: item.cart_item_id,
        productId: item.product_id,
        productName: item.product_name,
        price: item.price,
        quantity: item.quantity,
        availableStock: item.stock,
        isAvailable,
        lineTotal: Math.round(lineTotal * 100) / 100,
        imageUrl: item.image_url,
        category: item.category
      };
    });

    const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% sales tax
    const shipping = subtotal > 100 || subtotal === 0 ? 0 : 9.99; // Free shipping over $100
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;

    return {
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: Math.round(subtotal * 100) / 100,
      tax,
      shipping,
      total,
      currency: 'USD'
    };
  }

  /**
   * Add item to cart with quantity
   */
  addItem(productId, quantity = 1) {
    const numProductId = parseInt(productId, 10);
    const numQty = parseInt(quantity, 10);

    if (isNaN(numProductId) || numProductId <= 0) {
      throw new Error('Valid product ID is required');
    }
    if (isNaN(numQty) || numQty <= 0) {
      throw new Error('Quantity must be at least 1');
    }

    // Check product existence
    const product = db.get('SELECT id, name, stock FROM products WHERE id = ?', [numProductId]);
    if (!product) {
      throw new Error(`Product with ID ${numProductId} does not exist`);
    }

    // Check existing item in cart
    const existing = db.get('SELECT id, quantity FROM cart_items WHERE product_id = ?', [numProductId]);
    const currentCartQty = existing ? existing.quantity : 0;
    const requestedTotalQty = currentCartQty + numQty;

    // Verify stock
    if (requestedTotalQty > product.stock) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, already in cart: ${currentCartQty}, requested additional: ${numQty}`
      );
    }

    const now = new Date().toISOString();
    if (existing) {
      db.run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [numQty, existing.id]);
    } else {
      db.run('INSERT INTO cart_items (product_id, quantity, created_at) VALUES (?, ?, ?)', [numProductId, numQty, now]);
    }

    return this.getCart();
  }

  /**
   * Update item quantity directly
   */
  updateItem(productId, quantity) {
    const numProductId = parseInt(productId, 10);
    const numQty = parseInt(quantity, 10);

    if (isNaN(numProductId) || numProductId <= 0) {
      throw new Error('Valid product ID is required');
    }

    if (numQty <= 0) {
      return this.removeItem(numProductId);
    }

    const product = db.get('SELECT id, name, stock FROM products WHERE id = ?', [numProductId]);
    if (!product) {
      throw new Error(`Product #${numProductId} not found`);
    }

    if (numQty > product.stock) {
      throw new Error(`Only ${product.stock} units available in inventory for "${product.name}"`);
    }

    const existing = db.get('SELECT id FROM cart_items WHERE product_id = ?', [numProductId]);
    if (existing) {
      db.run('UPDATE cart_items SET quantity = ? WHERE id = ?', [numQty, existing.id]);
    } else {
      const now = new Date().toISOString();
      db.run('INSERT INTO cart_items (product_id, quantity, created_at) VALUES (?, ?, ?)', [numProductId, numQty, now]);
    }

    return this.getCart();
  }

  /**
   * Remove item from cart
   */
  removeItem(productId) {
    const numProductId = parseInt(productId, 10);
    db.run('DELETE FROM cart_items WHERE product_id = ?', [numProductId]);
    return this.getCart();
  }

  /**
   * Clear all items from cart
   */
  clearCart() {
    db.run('DELETE FROM cart_items');
    return this.getCart();
  }
}

module.exports = new CartService();
