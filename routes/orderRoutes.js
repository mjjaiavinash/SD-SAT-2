const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');

// POST /api/orders - Place an order
router.post('/', async (req, res, next) => {
  try {
    const { customer_name, customer_email, shipping_address, payment_method } = req.body;
    const order = await orderService.createOrder({
      customer_name,
      customer_email,
      shipping_address,
      payment_method
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully and asynchronous processing initiated',
      data: order
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders - Get all orders
router.get('/', (req, res, next) => {
  try {
    const orders = orderService.getAllOrders();
    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', (req, res, next) => {
  try {
    const order = orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: `Order #${req.params.id} not found`, statusCode: 404 }
      });
    }
    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id/tracking - Track an order
router.get('/:id/tracking', (req, res, next) => {
  try {
    const tracking = orderService.getOrderTracking(req.params.id);
    if (!tracking) {
      return res.status(404).json({
        success: false,
        error: { message: `Order #${req.params.id} not found for tracking`, statusCode: 404 }
      });
    }
    res.json({
      success: true,
      data: tracking
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/advance - Advance order stage (for viva practical live demonstration)
router.post('/:id/advance', async (req, res, next) => {
  try {
    const result = await orderService.advanceStage(req.params.id, req.body.stage);
    res.json({
      success: true,
      message: `Order status advanced to ${result.currentStatus || 'next stage'}`,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
