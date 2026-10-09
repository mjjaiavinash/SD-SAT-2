const db = require('../database');
const eventQueue = require('./eventQueue');

const STAGES = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

const STAGE_DETAILS = {
  PLACED: {
    title: 'Order Placed',
    description: 'Order details verified, payment authorized, and invoice generated.',
    etaHours: 72
  },
  CONFIRMED: {
    title: 'Order Confirmed & Packed',
    description: 'Inventory picked and packaged at central fulfillment fulfillment center.',
    etaHours: 48
  },
  SHIPPED: {
    title: 'Dispatched / In Transit',
    description: 'Package handed over to carrier (SwiftLogistics Express, Tracking #TRK-',
    etaHours: 24
  },
  DELIVERED: {
    title: 'Delivered',
    description: 'Package successfully delivered and signed for at destination address.',
    etaHours: 0
  }
};

/**
 * Delivery and Tracking Service
 * Manages order lifecycle stages and asynchronous status progression.
 */
class DeliveryService {
  constructor() {
    this._setupListeners();
  }

  _setupListeners() {
    // When a new order is created, schedule simulated background progression
    eventQueue.on('order.created', (event) => {
      const order = event.payload;
      this._scheduleAutoProgression(order.id);
    });
  }

  /**
   * Schedule automatic stage advancement to demonstrate asynchronous event processing
   */
  _scheduleAutoProgression(orderId) {
    // Schedule CONFIRMED in 15 seconds
    eventQueue.scheduleJob(`Advance order ${orderId} to CONFIRMED`, 15000, async () => {
      await this.advanceStage(orderId, 'CONFIRMED', 'Automated Warehouse System verified inventory and packed items.');
    });

    // Schedule SHIPPED in 35 seconds
    eventQueue.scheduleJob(`Advance order ${orderId} to SHIPPED`, 35000, async () => {
      await this.advanceStage(orderId, 'SHIPPED', 'Dispatched with SwiftLogistics Express (Tracking: TRK-' + Math.floor(100000 + Math.random() * 900000) + ').');
    });

    // Schedule DELIVERED in 60 seconds
    eventQueue.scheduleJob(`Advance order ${orderId} to DELIVERED`, 60000, async () => {
      await this.advanceStage(orderId, 'DELIVERED', 'Delivered at customer address. Signed by recipient.');
    });
  }

  /**
   * Advance order to specific stage or next sequential stage
   */
  async advanceStage(orderId, targetStage = null, customDescription = null) {
    const order = db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      throw new Error(`Order #${orderId} not found`);
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return { success: false, message: `Order #${orderId} is already in final state: ${order.status}` };
    }

    let nextStage = targetStage;
    if (!nextStage) {
      const currentIndex = STAGES.indexOf(order.status);
      if (currentIndex >= 0 && currentIndex < STAGES.length - 1) {
        nextStage = STAGES[currentIndex + 1];
      } else {
        return { success: false, message: `Order #${orderId} is already at final stage.` };
      }
    }

    const now = new Date().toISOString();
    const stageInfo = STAGE_DETAILS[nextStage] || { description: `Order status moved to ${nextStage}` };
    const desc = customDescription || stageInfo.description;

    // Update SQLite order status
    db.run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [nextStage, now, orderId]);

    // Add event log in SQLite
    db.run(
      'INSERT INTO order_events (order_id, stage, description, timestamp) VALUES (?, ?, ?, ?)',
      [orderId, nextStage, desc, now]
    );

    console.log(`[Delivery Service] Order #${orderId} moved to stage: ${nextStage}`);

    // Publish event to queue
    eventQueue.publish('order.status_updated', {
      orderId,
      stage: nextStage,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      timestamp: now
    });

    return {
      success: true,
      orderId,
      previousStatus: order.status,
      currentStatus: nextStage,
      updatedAt: now
    };
  }

  /**
   * Get detailed tracking information for an order
   */
  getOrderTracking(orderId) {
    const order = db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return null;
    }

    const events = db.query(
      'SELECT * FROM order_events WHERE order_id = ? ORDER BY id ASC',
      [orderId]
    );

    const currentIndex = STAGES.indexOf(order.status);
    const progressPercent = currentIndex >= 0 ? Math.round(((currentIndex + 1) / STAGES.length) * 100) : 0;

    const timeline = STAGES.map((st, index) => {
      const matchedEvent = events.find(e => e.stage === st);
      const isCompleted = currentIndex >= index;
      const isCurrent = order.status === st;

      return {
        stage: st,
        title: STAGE_DETAILS[st]?.title || st,
        completed: isCompleted,
        current: isCurrent,
        timestamp: matchedEvent ? matchedEvent.timestamp : null,
        description: matchedEvent ? matchedEvent.description : STAGE_DETAILS[st]?.description || ''
      };
    });

    return {
      orderId: order.id,
      status: order.status,
      progressPercent,
      customerName: order.customer_name,
      shippingAddress: order.shipping_address,
      carrier: 'SwiftLogistics Express',
      trackingCode: 'TRK-' + order.id.replace('ORD-', '') + '-EXP',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      timeline,
      rawEvents: events
    };
  }
}

module.exports = new DeliveryService();
