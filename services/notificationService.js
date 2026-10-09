const eventQueue = require('./eventQueue');

/**
 * Notification Service
 * Listens to asynchronous message queue events and simulates dispatching
 * customer email, SMS, and in-app alerts.
 */
class NotificationService {
  constructor() {
    this.notifications = [];
    this._setupListeners();
  }

  _setupListeners() {
    eventQueue.on('order.created', (event) => {
      const order = event.payload;
      this.sendEmail(
        order.customer_email,
        `Order Confirmed: #${order.id}`,
        `Hello ${order.customer_name}, your order #${order.id} has been placed for $${order.total_amount}.`
      );
      this.sendSMS(
        order.customer_name,
        `ShopSphere: Order #${order.id} placed! Tracking is now active.`
      );
    });

    eventQueue.on('order.status_updated', (event) => {
      const { orderId, stage, customerEmail, customerName } = event.payload;
      this.sendEmail(
        customerEmail || 'customer@example.com',
        `Order #${orderId} Status Update: ${stage}`,
        `Hello ${customerName || 'Customer'}, your order #${orderId} is now ${stage}.`
      );
    });
  }

  sendEmail(to, subject, body) {
    const record = {
      id: 'NOTIF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      channel: 'EMAIL',
      recipient: to,
      subject,
      body,
      timestamp: new Date().toISOString()
    };
    this.notifications.unshift(record);
    if (this.notifications.length > 50) this.notifications.pop();
    console.log(`[Notification Service - EMAIL] To: ${to} | Subject: ${subject}`);
    return record;
  }

  sendSMS(recipient, message) {
    const record = {
      id: 'NOTIF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      channel: 'SMS',
      recipient,
      subject: 'SMS Alert',
      body: message,
      timestamp: new Date().toISOString()
    };
    this.notifications.unshift(record);
    if (this.notifications.length > 50) this.notifications.pop();
    console.log(`[Notification Service - SMS] To: ${recipient} | Msg: ${message}`);
    return record;
  }

  getRecentNotifications() {
    return this.notifications.slice(0, 20);
  }
}

module.exports = new NotificationService();
