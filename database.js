const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'ecommerce.db');

let db = null;
let SQL = null;

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

/**
 * Persist in-memory SQLite database to physical disk file
 */
function persist() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('[Database] Failed to persist SQLite data to disk:', err);
  }
}

/**
 * Initialize SQLite database with tables and sample seed data
 */
async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log(`[Database] SQLite loaded from existing disk file: ${DB_PATH}`);
    } catch (e) {
      console.warn(`[Database] Error reading existing file, initializing fresh database:`, e.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log(`[Database] Created fresh SQLite database`);
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_id TEXT,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLACED',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER UNIQUE NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);

  // Check if products exist, seed if empty
  const countRes = db.exec("SELECT COUNT(*) as count FROM products");
  const count = countRes[0]?.values[0][0] || 0;

  if (count === 0) {
    console.log('[Database] Seeding sample products into SQLite...');
    const seedProducts = [
      {
        name: 'Sony WH-1000XM5 Noise Canceling Headphones',
        description: 'Industry-leading noise cancellation with 30-hour battery life and ultra-crisp Hi-Res audio.',
        price: 349.99,
        category: 'Electronics',
        stock: 25,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Apple MacBook Air 15" M3 Chip',
        description: 'Blazing-fast M3 silicon with 18 hours battery life, 15.3-inch Liquid Retina display, and 16GB unified memory.',
        price: 1299.00,
        category: 'Electronics',
        stock: 12,
        image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Logitech MX Master 3S Wireless Mouse',
        description: 'Quiet clicks, 8K DPI track-on-glass sensor, and ergonomic electromagnetic scroll wheel.',
        price: 99.99,
        category: 'Electronics',
        stock: 40,
        image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Keychron K2 Pro Mechanical Keyboard',
        description: 'Wireless Bluetooth RGB mechanical keyboard with hot-swappable tactile Gateron Brown switches.',
        price: 119.50,
        category: 'Electronics',
        stock: 18,
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Minimalist Leather Everyday Backpack',
        description: 'Water-resistant top-grain leather with dedicated 16-inch padded laptop sleeve and hidden passport pocket.',
        price: 145.00,
        category: 'Fashion',
        stock: 30,
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Classic Vintage Denim Jacket',
        description: 'Timeless heavy cotton denim jacket with antique brass buttons and comfortable regular fit.',
        price: 89.90,
        category: 'Fashion',
        stock: 22,
        image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Ceramic Pour-Over Coffee Brewer Set',
        description: 'Artisan ceramic dripper with 600ml heat-resistant borosilicate glass server and bamboo base.',
        price: 48.00,
        category: 'Home & Kitchen',
        stock: 35,
        image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Breville Barista Touch Espresso Machine',
        description: 'Automated touchscreen coffee machine with integrated burr grinder and thermo-jet heating system.',
        price: 799.95,
        category: 'Home & Kitchen',
        stock: 8,
        image_url: 'https://images.unsplash.com/photo-1517668808822-9ebb02ae2a0e?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Designing Data-Intensive Applications',
        description: 'The definitive handbook by Martin Kleppmann on distributed systems, data storage, and architecture principles.',
        price: 42.50,
        category: 'Books',
        stock: 50,
        image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'System Design Interview (Vol 1 & 2)',
        description: 'Alex Xu’s renowned guide for mastering system design concepts, microservices, and large-scale architectures.',
        price: 55.00,
        category: 'Books',
        stock: 45,
        image_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Adjustable Quick-Select Dumbbell (24kg)',
        description: 'Space-saving selector dumbbell with rapid weight dial from 2.5kg to 24kg for home gym workouts.',
        price: 199.00,
        category: 'Fitness',
        stock: 14,
        image_url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Eco-Friendly Non-Slip Yoga Mat',
        description: 'Natural tree rubber with alignment marks, high cushioning 6mm thickness, and carrying strap.',
        price: 36.00,
        category: 'Fitness',
        stock: 28,
        image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&auto=format&fit=crop&q=80'
      }
    ];

    const now = new Date().toISOString();
    for (const p of seedProducts) {
      db.run(
        `INSERT INTO products (name, description, price, category, stock, image_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p.name, p.description, p.price, p.category, p.stock, p.image_url, now]
      );
    }
  }

  persist();
  return db;
}

/**
 * Execute query and return array of objects
 */
function query(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Execute query and return single row or null
 */
function get(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute DML statement (INSERT, UPDATE, DELETE) and persist
 */
function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  
  // Get last insert rowid and changes BEFORE persist export
  let lastId = 0;
  try {
    const lastIdRes = db.exec("SELECT last_insert_rowid() as id");
    if (lastIdRes && lastIdRes.length > 0 && lastIdRes[0].values && lastIdRes[0].values.length > 0) {
      lastId = lastIdRes[0].values[0][0];
    }
  } catch (e) {
    console.error('[Database] Error fetching last_insert_rowid:', e.message);
  }

  const changes = typeof db.getRowsModified === 'function' ? db.getRowsModified() : 1;

  persist();

  return { lastInsertRowid: lastId, changes };
}

/**
 * Execute multiple raw statements
 */
function exec(sql) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql);
  persist();
}

/**
 * Reset demo database with initial seeds
 */
function resetDatabase() {
  if (!db) throw new Error('Database not initialized');
  db.run(`
    DROP TABLE IF EXISTS cart_items;
    DROP TABLE IF EXISTS order_events;
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS products;
  `);
  persist();
  db = null;
  return initDatabase();
}

module.exports = {
  initDatabase,
  query,
  get,
  run,
  exec,
  persist,
  resetDatabase,
  getDbInstance: () => db
};
