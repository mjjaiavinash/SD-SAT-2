const express = require('express');
const router = express.Router();
const cartService = require('../services/cartService');

// GET /api/cart - View cart
router.get('/', (req, res, next) => {
  try {
    const cart = cartService.getCart();
    res.json({
      success: true,
      data: cart
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cart/items - Add item to cart
router.post('/items', (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: { message: 'productId is required in request body', statusCode: 400 }
      });
    }
    const cart = cartService.addItem(productId, quantity);
    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cart/items/:id - Update item quantity in cart
router.put('/items/:id', (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'quantity is required in request body', statusCode: 400 }
      });
    }
    const cart = cartService.updateItem(req.params.id, quantity);
    res.json({
      success: true,
      message: 'Cart item updated',
      data: cart
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/items/:id - Remove single item from cart
router.delete('/items/:id', (req, res, next) => {
  try {
    const cart = cartService.removeItem(req.params.id);
    res.json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart - Clear cart
router.delete('/', (req, res, next) => {
  try {
    const cart = cartService.clearCart();
    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
