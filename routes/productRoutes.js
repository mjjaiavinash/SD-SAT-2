const express = require('express');
const router = express.Router();
const productService = require('../services/productService');

// GET /api/products - Get all products with search & category filter
router.get('/', (req, res, next) => {
  try {
    const { q, category } = req.query;
    const result = productService.getAllProducts({ search: q, category });
    res.json({
      success: true,
      fromCache: result.fromCache,
      count: result.data.length,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/categories - Distinct categories
router.get('/categories', (req, res, next) => {
  try {
    const categories = productService.getCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', (req, res, next) => {
  try {
    const result = productService.getProductById(req.params.id);
    if (!result.data) {
      return res.status(404).json({
        success: false,
        error: { message: `Product #${req.params.id} not found`, statusCode: 404 }
      });
    }
    res.json({
      success: true,
      fromCache: result.fromCache,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/products - Create a new product
router.post('/', (req, res, next) => {
  try {
    const created = productService.createProduct(req.body);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: created
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', (req, res, next) => {
  try {
    const updated = productService.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { message: `Product #${req.params.id} not found`, statusCode: 404 }
      });
    }
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', (req, res, next) => {
  try {
    const deleted = productService.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: `Product #${req.params.id} not found`, statusCode: 404 }
      });
    }
    res.json({
      success: true,
      message: `Product #${req.params.id} deleted successfully`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
