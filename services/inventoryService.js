const db = require('../database');

/**
 * Inventory Service
 * Manages stock levels, availability validation, and atomic stock deductions.
 */
class InventoryService {
  /**
   * Check stock availability for an array of items [{ productId, quantity }]
   */
  checkAvailability(items) {
    const insufficient = [];

    for (const item of items) {
      const product = db.get('SELECT id, name, stock FROM products WHERE id = ?', [item.productId]);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} does not exist`);
      }
      if (product.stock < item.quantity) {
        insufficient.push({
          productId: product.id,
          productName: product.name,
          requested: item.quantity,
          available: product.stock
        });
      }
    }

    return {
      available: insufficient.length === 0,
      insufficientItems: insufficient
    };
  }

  /**
   * Deduct stock for ordered items
   */
  reserveStock(items) {
    // Re-verify availability
    const check = this.checkAvailability(items);
    if (!check.available) {
      const details = check.insufficientItems
        .map(i => `${i.productName}: requested ${i.requested}, available ${i.available}`)
        .join('; ');
      throw new Error(`Insufficient inventory: ${details}`);
    }

    // Atomic deduction in SQLite
    for (const item of items) {
      db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
      console.log(`[Inventory Service] Reserved ${item.quantity} units for product ID: ${item.productId}`);
    }

    return true;
  }

  /**
   * Restock items (in case of order cancellation)
   */
  restock(items) {
    for (const item of items) {
      db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.productId]);
      console.log(`[Inventory Service] Restocked ${item.quantity} units for product ID: ${item.productId}`);
    }
    return true;
  }

  /**
   * Get single product stock
   */
  getStock(productId) {
    const product = db.get('SELECT stock FROM products WHERE id = ?', [productId]);
    return product ? product.stock : null;
  }
}

module.exports = new InventoryService();
