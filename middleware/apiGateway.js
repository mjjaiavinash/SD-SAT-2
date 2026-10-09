/**
 * API Gateway Middleware Simulation
 * Simulates reverse proxy / API Gateway features:
 * - Request correlation ID tracking (X-Request-Id)
 * - Service routing inspection
 * - Latency measurement
 * - Gateway operational metrics for HLD demonstration
 */

const gatewayMetrics = {
  totalRequests: 0,
  routesDispatched: {},
  statusCodes: {}
};

function apiGateway(req, res, next) {
  const startTime = Date.now();
  const requestId = 'req_' + Math.random().toString(36).substring(2, 10);

  // Attach correlation ID
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-API-Gateway', 'Express-Gateway-Engine-v1.0');

  // Determine target logical service from route
  let targetService = 'Core Service';
  if (req.path.startsWith('/api/products')) targetService = 'Product Service';
  else if (req.path.startsWith('/api/cart')) targetService = 'Cart Service';
  else if (req.path.startsWith('/api/orders')) targetService = 'Order Service';
  else if (req.path.startsWith('/api/system')) targetService = 'System / Telemetry Service';

  res.setHeader('X-Target-Service', targetService);

  gatewayMetrics.totalRequests++;
  gatewayMetrics.routesDispatched[targetService] = (gatewayMetrics.routesDispatched[targetService] || 0) + 1;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const code = res.statusCode;
    gatewayMetrics.statusCodes[code] = (gatewayMetrics.statusCodes[code] || 0) + 1;
    console.log(`[API Gateway] ${req.method} ${req.originalUrl} -> ${targetService} [${code}] - ${duration}ms (ReqID: ${requestId})`);
  });

  next();
}

function getGatewayMetrics() {
  return gatewayMetrics;
}

module.exports = {
  apiGateway,
  getGatewayMetrics
};
