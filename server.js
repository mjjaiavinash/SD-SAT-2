const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./database');
const { apiGateway } = require('./middleware/apiGateway');
const errorHandler = require('./middleware/errorHandler');

const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and body parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Simulated API Gateway Middleware
app.use(apiGateway);

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount Logical Service API Routes (Routed through API Gateway)
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/system', systemRoutes);

// Fallback for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `API Route ${req.method} ${req.originalUrl} not found on API Gateway`,
      statusCode: 404
    }
  });
});

// Single Page Application route fallback to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Error Handler
app.use(errorHandler);

// Initialize SQLite Database and Start Server
async function startServer() {
  try {
    await db.initDatabase();
    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🛍️  Online Shopping Platform running at:`);
      console.log(`👉  http://localhost:${PORT}`);
      console.log('====================================================');
      console.log(`Logical Services Initialized:`);
      console.log(`  1. Product Service (SQLite + In-Memory Cache)`);
      console.log(`  2. Cart Service (Live Inventory Validation)`);
      console.log(`  3. Order Service (ACID Transaction Simulator)`);
      console.log(`  4. Payment Service (Simulated Gateway)`);
      console.log(`  5. Inventory Service (Stock Management)`);
      console.log(`  6. Delivery & Tracking Service (Async State Machine)`);
      console.log(`  7. Notification Service (Simulated Event Subscriber)`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

// Persist SQLite data on exit
process.on('SIGINT', () => {
  db.persist();
  console.log('\n[Database] Persisted SQLite state before exiting.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.persist();
  console.log('\n[Database] Persisted SQLite state before exiting.');
  process.exit(0);
});

startServer();
