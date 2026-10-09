/**
 * Payment Service (Simulated)
 * Simulates third-party payment gateway integration (Stripe / Razorpay / PayPal).
 * Does NOT process real payments.
 */
class PaymentService {
  /**
   * Process simulated payment
   * @param {Object} paymentInfo { amount, method, customerName }
   */
  async processPayment({ amount, method, customerName }) {
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount. Amount must be greater than zero.');
    }

    const validMethods = ['Credit Card', 'Debit Card', 'UPI', 'PayPal', 'Cash on Delivery'];
    const chosenMethod = validMethods.includes(method) ? method : 'Credit Card';

    console.log(`[Payment Gateway SIMULATION] Initiating payment of $${Number(amount).toFixed(2)} via ${chosenMethod} for ${customerName}`);

    // Generate unique simulated transaction ID
    const transactionId = 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

    // Simulate 99% success rate
    const isSuccess = true;

    if (!isSuccess) {
      throw new Error('Payment gateway declined the transaction. Please try another method.');
    }

    return {
      success: true,
      transactionId,
      amount: Number(amount).toFixed(2),
      method: chosenMethod,
      gateway: 'Simulated Gateway (Sandbox)',
      status: 'CAPTURED',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new PaymentService();
