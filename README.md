# 🛍️ ShopSphere – Online Shopping Platform
### Low-Level Design (LLD) & High-Level Design (HLD) Practical Examination Project

ShopSphere is a beginner-friendly, fully functional **Online Shopping Platform** developed for college **Low-Level Design (LLD)** and **High-Level Design (HLD)** practical and viva examinations.

It features a responsive frontend, a modular Node.js/Express backend, persistent SQLite data storage, an API Gateway layer, in-memory caching with hit/miss telemetry, and an asynchronous event queue simulating event-driven order processing.

---

## 📌 Project Overview & Architecture

### High-Level Design (HLD) Architecture Flow

```text
       [ Customer Client ] (Browser: HTML5 / CSS3 / Vanilla JS)
               │
               ▼
     [ Load Balancer (Conceptual) ] (e.g., NGINX / AWS ALB simulation)
               │
               ▼
     [ API Gateway ] (Express.js Routing, Request-ID, Rate-Limits, Logging)
               │
   ┌───────────┼───────────────────────┬──────────────────────┐
   ▼           ▼                       ▼                      ▼
[ Product ] [ Cart Service ]   [ Order Service ]      [ Payment Service ]
[ Service ] (Inventory Check)   (Orchestrator)         (Simulated Gateway)
   │                                   │                      │
   │                                   ▼                      │
   │                              [ Inventory Service ] ◄─────┘
   │                              (Atomic Stock Update)
   │                                   │
   │                                   ▼
   │                        [ Async Event Queue Broker ] (Kafka/RabbitMQ Sim)
   │                                   │
   │                        ┌──────────┴──────────┐
   │                        ▼                     ▼
   │                 [ Delivery & Tracking ] [ Notification Service ]
   │                 (State Machine)         (Simulated Email/SMS)
   ▼                        │
[ In-Memory Cache ]         ▼
(TTL / Hit-Miss Stats)  [ SQLite Database ] (data/ecommerce.db - Persistent)
```

> **College Examination Note**: In this project, all services run inside one Node.js process for simplicity and reliability during local examination demos, but each service is implemented as an independent, decoupled module with dedicated responsibilities.

---

## 📂 Project Structure

```text
online-shopping/
├── server.js                      # Main application entry point & API Gateway server
├── package.json                   # Project dependencies and npm start scripts
├── database.js                    # SQLite database engine (sql.js WASM) with auto-seeding
├── test_suite.js                  # Automated 15-test end-to-end verification script
├── data/
│   └── ecommerce.db               # Persistent SQLite database file on disk
├── middleware/
│   ├── apiGateway.js              # API Gateway simulation, request ID, route telemetry
│   └── errorHandler.js            # Centralized error handler returning HTTP status codes
├── services/
│   ├── productService.js          # Product CRUD, category filtering & cache invalidation
│   ├── cartService.js             # Cart management, stock validation & price calculations
│   ├── orderService.js            # Checkout orchestration & transactional integrity
│   ├── paymentService.js          # Simulated Payment Gateway (Sandbox transaction IDs)
│   ├── inventoryService.js        # Stock availability checks & atomic stock reservation
│   ├── deliveryService.js         # Order stages (PLACED -> CONFIRMED -> SHIPPED -> DELIVERED)
│   ├── notificationService.js     # Simulated Email/SMS notifications subscriber
│   ├── cacheService.js            # In-Memory Cache with TTL and Hit/Miss metrics
│   └── eventQueue.js              # Asynchronous Pub/Sub Event Broker & Job Scheduler
├── routes/
│   ├── productRoutes.js           # REST endpoints for /api/products
│   ├── cartRoutes.js              # REST endpoints for /api/cart
│   ├── orderRoutes.js             # REST endpoints for /api/orders
│   └── systemRoutes.js            # System telemetry, metrics, cache flush & reset
└── public/
    ├── index.html                 # Single Page Application structure & SVG Architecture
    ├── style.css                  # Modern dark sleek design system with responsive layout
    └── app.js                     # Client-side controller, UI state, and API playground
```

---

## 🚀 Installation & Execution

### 1. Prerequisites
- **Node.js** (v18, v20, v22, or higher)
- **npm** (bundled with Node.js)
- Modern web browser (Chrome, Edge, Firefox, or Safari)

### 2. How to Install Dependencies
Open your terminal or command prompt inside the project folder:
```bash
npm install
```

### 3. How to Start the Application
Run the application using:
```bash
npm start
```
*Alternatively, you can run:*
```bash
node server.js
```

### 4. Local URL
Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Running Automated Tests

A complete automated test suite is included to verify all REST endpoints, status codes, and service integrations:
```bash
node test_suite.js
```
Expected output:
```text
====================================================
🧪 RUNNING SYSTEM DESIGN END-TO-END TEST SUITE
====================================================
  ✅ PASS: GET /api/products returned 12 products
  ✅ PASS: Search GET /api/products?q=Sony found 1 products
  ✅ PASS: GET /api/products/1 returned product: "Sony WH-1000XM5 Noise Canceling Headphones"
  ✅ PASS: POST /api/products created product #13
  ✅ PASS: PUT /api/products/13 updated price to $179.99
  ✅ PASS: DELETE /api/products/13 deleted product successfully
  ✅ PASS: POST /api/cart/items added 2 units of product #1 to cart
  ✅ PASS: GET /api/cart total calculated: $755.98
  ✅ PASS: POST /api/orders placed order #ORD-XXXXXX for $755.98
  ✅ PASS: GET /api/orders returned orders list
  ✅ PASS: GET /api/orders/ORD-XXXXXX/tracking status: PLACED
  ✅ PASS: POST /api/orders/ORD-XXXXXX/advance moved stage to: CONFIRMED
  ✅ PASS: GET /api/system/stats returned cache metrics
  ✅ PASS: Error handling test: GET /api/products/99999 returned 404 Not Found
  ✅ PASS: Validation test: POST /api/products with empty name returned 400 Bad Request
====================================================
🏁 TEST SUITE SUMMARY: 15 PASSED, 0 FAILED
====================================================
```

---

## 📡 REST API Documentation & Postman Testing

All endpoints route through the Express API Gateway and return standardized JSON responses.

### 1. Product Service Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Retrieve all products (supports `?q=` search & `?category=`) | `200 OK` |
| `GET` | `/api/products/:id` | Retrieve single product by ID (cached) | `200 OK` / `404 Not Found` |
| `POST` | `/api/products` | Create a new product (invalidates cache) | `201 Created` / `400 Bad Request` |
| `PUT` | `/api/products/:id` | Update product details | `200 OK` / `400 Bad Request` / `404 Not Found` |
| `DELETE`| `/api/products/:id` | Delete product from catalog | `200 OK` / `404 Not Found` |

#### Example: Create Product (`POST /api/products`)
```json
{
  "name": "Sony Wireless Earbuds WF-1000XM5",
  "category": "Electronics",
  "price": 279.99,
  "stock": 15,
  "description": "High-resolution noise canceling earbuds with LDAC support.",
  "image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80"
}
```

---

### 2. Cart Service Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | View shopping cart with subtotal, tax, and shipping calculations | `200 OK` |
| `POST` | `/api/cart/items` | Add item to cart with stock validation | `201 Created` / `400 Bad Request` |
| `PUT` | `/api/cart/items/:id` | Update item quantity in cart | `200 OK` / `400 Bad Request` |
| `DELETE`| `/api/cart/items/:id` | Remove item from cart | `200 OK` |
| `DELETE`| `/api/cart` | Clear entire cart | `200 OK` |

#### Example: Add Item to Cart (`POST /api/cart/items`)
```json
{
  "productId": 1,
  "quantity": 2
}
```

---

### 3. Order & Delivery Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Place an order from cart (reserves inventory, simulates payment, dispatches async event) | `201 Created` / `400 Bad Request` |
| `GET` | `/api/orders` | Retrieve list of all orders | `200 OK` |
| `GET` | `/api/orders/:id` | Retrieve order details by ID | `200 OK` / `404 Not Found` |
| `GET` | `/api/orders/:id/tracking` | Track order delivery timeline and stages | `200 OK` / `404 Not Found` |
| `POST` | `/api/orders/:id/advance` | Advance order to next status (`CONFIRMED`, `SHIPPED`, `DELIVERED`) | `200 OK` / `404 Not Found` |

#### Example: Place Order (`POST /api/orders`)
```json
{
  "customer_name": "Alex Johnson",
  "customer_email": "alex.johnson@example.com",
  "shipping_address": "442 Silicon Valley Blvd, San Jose, CA 95134",
  "payment_method": "Credit Card"
}
```

---

### 4. System & Telemetry Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/system/stats` | Telemetry: Total products, orders, revenue, cache hit ratio, queue jobs | `200 OK` |
| `POST` | `/api/system/cache/flush` | Flush in-memory cache | `200 OK` |
| `POST` | `/api/system/reset` | Reset database to initial seed catalog | `200 OK` |

---

## 🎓 How the Project Covers LLD & HLD (Examination Guide)

### Round 2: Low-Level Design (LLD)
1. **CRUD Data Access**: Implemented in [productService.js](file:///c:/Users/HS/Downloads/System%20Design%20Application/services/productService.js) using SQLite SQL queries with parameterized statements preventing SQL injection.
2. **Input Validation**: Strict type checking and value verification (e.g., price > 0, stock >= 0, valid email format) returning explicit `400 Bad Request` responses before touching the database.
3. **HTTP Status Codes**:
   - `200 OK`: Successful reads, updates, and deletes.
   - `201 Created`: Successful product creation, cart addition, and order placement.
   - `400 Bad Request`: Validation failure or insufficient stock.
   - `404 Not Found`: Resource does not exist.
   - `500 Internal Server Error`: Uncaught exceptions caught by centralized [errorHandler.js](file:///c:/Users/HS/Downloads/System%20Design%20Application/middleware/errorHandler.js).
4. **Data Consistency**: Atomic stock deductions in SQLite upon checkout to prevent overselling.
5. **Accurate Computations**: Cart line totals, 8% sales tax calculation, and free shipping threshold ($100+).

### Round 3: High-Level Design (HLD)
1. **Load Balancer (Conceptual)**: Represented as the single entry point balancing traffic in cloud topologies (e.g. Nginx/AWS ALB).
2. **API Gateway Pattern**: Implemented in [apiGateway.js](file:///c:/Users/HS/Downloads/System%20Design%20Application/middleware/apiGateway.js), assigning a correlation ID (`X-Request-Id`), routing incoming requests to corresponding logical modules, and tracking latency and route metrics.
3. **Microservices Separation of Concerns**:
   - **Product Service**: Manages catalog and search.
   - **Cart Service**: Maintains user cart state and validates live inventory.
   - **Order Service**: Coordinates the ACID transaction workflow.
   - **Payment Service**: Decoupled payment simulator generating transaction tokens.
   - **Inventory Service**: Encapsulates stock levels, reservations, and restocking.
   - **Delivery & Tracking Service**: State machine managing order lifecycle stages.
   - **Notification Service**: Asynchronous subscriber emitting simulated customer alerts.
4. **In-Memory Caching (Cache-Aside Pattern)**:
   - Implemented in [cacheService.js](file:///c:/Users/HS/Downloads/System%20Design%20Application/services/cacheService.js) with Time-To-Live (TTL).
   - Serves reads directly from RAM (`CACHE HIT`) with zero database disk I/O.
   - Invalidates cached entries (`CACHE INVALIDATE`) on product creation, update, or deletion.
5. **Asynchronous Messaging & Event-Driven Architecture**:
   - Implemented in [eventQueue.js](file:///c:/Users/HS/Downloads/System%20Design%20Application/services/eventQueue.js) simulating message brokers like Kafka or RabbitMQ.
   - When an order is placed, `order.created` is published asynchronously, decoupling order creation from delivery tracking and customer email notifications.
6. **Order Progression Lifecycle**:
   - **`PLACED`**: Order confirmed and payment authorized.
   - **`CONFIRMED`**: Inventory picked and packaged at fulfillment warehouse.
   - **`SHIPPED`**: Dispatched with carrier (SwiftLogistics) and tracking ID assigned.
   - **`DELIVERED`**: Signed and received by the customer.

---

## 🖥️ Live Demonstration Steps (For Practical Exam)

1. **Storefront & Search**:
   - Open `http://localhost:3000`.
   - Type `MacBook` into the search bar to demonstrate instant, debounced product search.
   - Filter by categories (`Electronics`, `Fashion`, `Books`) to show categorized catalog querying.
   - Observe the **Cache Indicator Banner**: 1st request shows `CACHE MISS / DB QUERY`; refreshing immediately shows `CACHE HIT`!
2. **Product CRUD**:
   - Click **Product CRUD** tab in the navigation.
   - Click **Add New Product**, fill the form, and save to show SQLite insertion.
   - Click **Edit** to modify price or stock.
   - Click **Delete** to show deletion and corresponding cache invalidation.
3. **Cart & Checkout**:
   - Add products to your cart.
   - Switch to **Cart** tab; increment/decrement quantity. Note that you cannot exceed current stock.
   - Fill in checkout details and click **Place Order**.
4. **Order Tracking & State Machine**:
   - Upon placing the order, you will be transitioned to the **Orders & Tracking** tab.
   - The visual 4-stage stepper will highlight `PLACED`.
   - Click the **Advance Status (Viva Demo)** button to immediately advance the stage to `CONFIRMED`, `SHIPPED`, and `DELIVERED`, and review the chronological audit trail.
5. **Architecture & Telemetry Monitor**:
   - Switch to the **Architecture (HLD)** tab.
   - Walk the examiner through the interactive SVG system design diagram.
   - Review live metrics: Cache Hits, Cache Misses, Hit Ratio, Processed Queue Events, and Simulated Email/SMS notifications.
6. **Interactive API Documentation**:
   - Switch to the **API Docs & Testing** tab.
   - Click any endpoint (e.g. `GET /api/products`, `POST /api/orders`) and click **Send Request** to demonstrate live JSON responses, HTTP status codes, and latency in milliseconds.

---

## 🔒 License & Academic Integrity
Created for educational purposes and college system design practical examinations. Free to use, modify, and present.
