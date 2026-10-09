const db = require('../database');
const cacheService = require('./cacheService');

/**
 * Product Service
 * Handles Product CRUD operations with caching layer and validation.
 */
class ProductService {
  /**
   * Get all products with optional search and category filters
   * Cached to demonstrate High-Level Design caching pattern.
   */
  getAllProducts({ search = '', category = '' } = {}) {
    const cacheKey = `products:list:${search.toLowerCase().trim()}:${category.toLowerCase().trim()}`;
    const cached = cacheService.get(cacheKey);

    if (cached) {
      return { data: cached, fromCache: true };
    }

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      sql += ' AND category = ?';
      params.push(category.trim());
    }

    sql += ' ORDER BY id DESC';

    const products = db.query(sql, params);

    // Cache results for 60 seconds
    cacheService.set(cacheKey, products, 60);

    return { data: products, fromCache: false };
  }

  /**
   * Get product by ID with caching
   */
  getProductById(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid product ID');
    }

    const cacheKey = `products:id:${numericId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return { data: cached, fromCache: true };
    }

    const product = db.get('SELECT * FROM products WHERE id = ?', [numericId]);
    if (!product) {
      return { data: null, fromCache: false };
    }

    cacheService.set(cacheKey, product, 120);
    return { data: product, fromCache: false };
  }

  /**
   * Create a new product
   * Validates inputs and invalidates product caches.
   */
  createProduct(data) {
    const { name, description = '', price, category, stock = 0, image_url = '' } = data;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Product name is required');
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      throw new Error('Product price must be a positive number');
    }
    if (!category || typeof category !== 'string' || category.trim() === '') {
      throw new Error('Product category is required');
    }
    const numStock = parseInt(stock, 10);
    if (isNaN(numStock) || numStock < 0) {
      throw new Error('Stock must be a non-negative integer');
    }

    const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
    const finalImage = (image_url && image_url.trim()) ? image_url.trim() : defaultImg;
    const now = new Date().toISOString();

    const result = db.run(
      `INSERT INTO products (name, description, price, category, stock, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description.trim(), numPrice, category.trim(), numStock, finalImage, now]
    );

    // Cache invalidation: Evict all product list caches
    cacheService.delByPrefix('products:');

    const created = db.get('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
    return created;
  }

  /**
   * Update existing product
   * Validates inputs, updates SQLite, and invalidates caches.
   */
  updateProduct(id, data) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid product ID');
    }

    const existing = db.get('SELECT * FROM products WHERE id = ?', [numericId]);
    if (!existing) {
      return null;
    }

    const name = data.name !== undefined ? String(data.name).trim() : existing.name;
    if (!name) throw new Error('Product name cannot be empty');

    let price = existing.price;
    if (data.price !== undefined) {
      const numPrice = parseFloat(data.price);
      if (isNaN(numPrice) || numPrice <= 0) throw new Error('Price must be greater than zero');
      price = numPrice;
    }

    const category = data.category !== undefined ? String(data.category).trim() : existing.category;
    if (!category) throw new Error('Product category cannot be empty');

    let stock = existing.stock;
    if (data.stock !== undefined) {
      const numStock = parseInt(data.stock, 10);
      if (isNaN(numStock) || numStock < 0) throw new Error('Stock must be a non-negative integer');
      stock = numStock;
    }

    const description = data.description !== undefined ? String(data.description).trim() : existing.description;
    const image_url = data.image_url !== undefined ? String(data.image_url).trim() : existing.image_url;

    db.run(
      `UPDATE products 
       SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ?
       WHERE id = ?`,
      [name, description, price, category, stock, image_url, numericId]
    );

    // Invalidate caches
    cacheService.del(`products:id:${numericId}`);
    cacheService.delByPrefix('products:list:');

    const updated = db.get('SELECT * FROM products WHERE id = ?', [numericId]);
    return updated;
  }

  /**
   * Delete product
   */
  deleteProduct(id) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid product ID');
    }

    const existing = db.get('SELECT * FROM products WHERE id = ?', [numericId]);
    if (!existing) {
      return false;
    }

    db.run('DELETE FROM products WHERE id = ?', [numericId]);
    // Also remove any cart reference
    db.run('DELETE FROM cart_items WHERE product_id = ?', [numericId]);

    // Invalidate caches
    cacheService.del(`products:id:${numericId}`);
    cacheService.delByPrefix('products:list:');

    return true;
  }

  /**
   * Get distinct categories
   */
  getCategories() {
    const rows = db.query('SELECT DISTINCT category FROM products ORDER BY category ASC');
    return rows.map(r => r.category);
  }
}

module.exports = new ProductService();
