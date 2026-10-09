const express = require('express');
const router = express.Router();
const db = require('../database');
const cacheService = require('../services/cacheService');
const eventQueue = require('../services/eventQueue');
const notificationService = require('../services/notificationService');
const { getGatewayMetrics } = require('../middleware/apiGateway');

// GET /api/system/stats - Aggregated metrics for Dashboard and HLD Architecture monitor
router.get('/stats', (req, res, next) => {
  try {
    const productsCount = db.get('SELECT COUNT(*) as count FROM products')?.count || 0;
    const ordersCount = db.get('SELECT COUNT(*) as count FROM orders')?.count || 0;
    const revenueRow = db.get('SELECT SUM(total_amount) as total FROM orders');
    const revenue = Math.round((revenueRow?.total || 0) * 100) / 100;

    const cacheStats = cacheService.getStats();
    const queueStatus = eventQueue.getStatus();
    const gatewayMetrics = getGatewayMetrics();
    const notifications = notificationService.getRecentNotifications();

    res.json({
      success: true,
      data: {
        overview: {
          productsCount,
          ordersCount,
          revenue,
          activeServicesCount: 7
        },
        cache: cacheStats,
        eventQueue: queueStatus,
        apiGateway: gatewayMetrics,
        recentNotifications: notifications
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/system/cache/flush - Invalidate entire cache
router.post('/cache/flush', (req, res) => {
  cacheService.flush();
  res.json({
    success: true,
    message: 'In-memory cache successfully flushed',
    stats: cacheService.getStats()
  });
});

// POST /api/system/reset - Reset demo database to default seed state
router.post('/reset', async (req, res, next) => {
  try {
    cacheService.flush();
    await db.resetDatabase();
    res.json({
      success: true,
      message: 'Database reset to default seed products and clean state'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
