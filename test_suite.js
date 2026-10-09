async function runTestSuite() {
  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  console.log('====================================================');
  console.log('RUNNING SYSTEM DESIGN END-TO-END TEST SUITE');
  console.log('====================================================\n');

  // Test 1: GET /api/products
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    const json = await res.json();
    assert(res.status === 200 && json.success === true && json.data.length > 0, `GET /api/products returned ${json.data?.length} products`);
  } catch (e) {
    assert(false, `GET /api/products error: ${e.message}`);
  }

  // Test 2: Search products GET /api/products?q=Sony
  try {
    const res = await fetch(`${BASE_URL}/api/products?q=Sony`);
    const json = await res.json();
    assert(res.status === 200 && json.data.length > 0, `Search GET /api/products?q=Sony found ${json.data?.length} products`);
  } catch (e) {
    assert(false, `Search GET /api/products error: ${e.message}`);
  }

  // Test 3: GET /api/products/:id
  try {
    const res = await fetch(`${BASE_URL}/api/products/1`);
    const json = await res.json();
    assert(res.status === 200 && json.data?.id === 1, `GET /api/products/1 returned product: "${json.data?.name}"`);
  } catch (e) {
    assert(false, `GET /api/products/1 error: ${e.message}`);
  }

  // Test 4: POST /api/products (Create)
  let createdProductId = null;
  try {
    const payload = {
      name: "Logitech Brio 4K Webcam",
      category: "Electronics",
      price: 199.99,
      stock: 15,
      description: "Ultra 4K HD video calling with HDR and rightlight 3.",
      image_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3"
    };
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    createdProductId = json.data?.id;
    assert(res.status === 201 && json.success === true && createdProductId, `POST /api/products created product #${createdProductId}`);
  } catch (e) {
    assert(false, `POST /api/products error: ${e.message}`);
  }

  // Test 5: PUT /api/products/:id (Update)
  try {
    const res = await fetch(`${BASE_URL}/api/products/${createdProductId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 179.99, stock: 20 })
    });
    const json = await res.json();
    assert(res.status === 200 && json.data?.price === 179.99, `PUT /api/products/${createdProductId} updated price to $179.99`);
  } catch (e) {
    assert(false, `PUT /api/products/:id error: ${e.message}`);
  }

  // Test 6: DELETE /api/products/:id (Delete)
  try {
    const res = await fetch(`${BASE_URL}/api/products/${createdProductId}`, { method: 'DELETE' });
    const json = await res.json();
    assert(res.status === 200 && json.success === true, `DELETE /api/products/${createdProductId} deleted product successfully`);
  } catch (e) {
    assert(false, `DELETE /api/products/:id error: ${e.message}`);
  }

  // Test 7: POST /api/cart/items (Add to Cart)
  try {
    const res = await fetch(`${BASE_URL}/api/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 1, quantity: 2 })
    });
    const json = await res.json();
    assert(res.status === 201 && json.data?.itemCount >= 2, `POST /api/cart/items added 2 units of product #1 to cart`);
  } catch (e) {
    assert(false, `POST /api/cart/items error: ${e.message}`);
  }

  // Test 8: GET /api/cart (View Cart)
  try {
    const res = await fetch(`${BASE_URL}/api/cart`);
    const json = await res.json();
    assert(res.status === 200 && json.data?.total > 0, `GET /api/cart total calculated: $${json.data?.total}`);
  } catch (e) {
    assert(false, `GET /api/cart error: ${e.message}`);
  }

  // Test 9: POST /api/orders (Place Order)
  let placedOrderId = null;
  try {
    const orderPayload = {
      customer_name: "Jane Doe",
      customer_email: "jane.doe@university.edu",
      shipping_address: "100 Campus Drive, College Station, TX 77840",
      payment_method: "Credit Card"
    };
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const json = await res.json();
    placedOrderId = json.data?.id;
    assert(res.status === 201 && json.success === true && placedOrderId, `POST /api/orders placed order #${placedOrderId} for $${json.data?.total_amount}`);
  } catch (e) {
    assert(false, `POST /api/orders error: ${e.message}`);
  }

  // Test 10: GET /api/orders (List Orders)
  try {
    const res = await fetch(`${BASE_URL}/api/orders`);
    const json = await res.json();
    assert(res.status === 200 && json.data?.length > 0, `GET /api/orders returned ${json.data?.length} orders`);
  } catch (e) {
    assert(false, `GET /api/orders error: ${e.message}`);
  }

  // Test 11: GET /api/orders/:id/tracking (Track Order)
  try {
    const res = await fetch(`${BASE_URL}/api/orders/${placedOrderId}/tracking`);
    const json = await res.json();
    assert(res.status === 200 && json.data?.orderId === placedOrderId && json.data?.status === 'PLACED', `GET /api/orders/${placedOrderId}/tracking status: ${json.data?.status}`);
  } catch (e) {
    assert(false, `GET /api/orders/:id/tracking error: ${e.message}`);
  }

  // Test 12: POST /api/orders/:id/advance (Advance State)
  try {
    const res = await fetch(`${BASE_URL}/api/orders/${placedOrderId}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'CONFIRMED' })
    });
    const json = await res.json();
    assert(res.status === 200 && json.data?.currentStatus === 'CONFIRMED', `POST /api/orders/${placedOrderId}/advance moved stage to: ${json.data?.currentStatus}`);
  } catch (e) {
    assert(false, `POST /api/orders/:id/advance error: ${e.message}`);
  }

  // Test 13: GET /api/system/stats (Telemetry)
  try {
    const res = await fetch(`${BASE_URL}/api/system/stats`);
    const json = await res.json();
    assert(res.status === 200 && json.data?.overview?.ordersCount > 0, `GET /api/system/stats returned cache hits: ${json.data?.cache?.hits}, ratio: ${json.data?.cache?.hitRatio}`);
  } catch (e) {
    assert(false, `GET /api/system/stats error: ${e.message}`);
  }

  // Test 14: Error Handling - 404 for nonexistent product
  try {
    const res = await fetch(`${BASE_URL}/api/products/99999`);
    const json = await res.json();
    assert(res.status === 404 && json.success === false, `Error handling test: GET /api/products/99999 returned 404 Not Found`);
  } catch (e) {
    assert(false, `Error handling test error: ${e.message}`);
  }

  // Test 15: Error Handling - 400 for invalid product creation
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: "" }) // Invalid payload
    });
    const json = await res.json();
    assert(res.status === 400 && json.success === false, `Validation test: POST /api/products with empty name returned 400 Bad Request`);
  } catch (e) {
    assert(false, `Validation test error: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runTestSuite().catch(console.error);
