/**
 * SHOPSPHERE - CLIENT CONTROLLER & UI APPLICATION
 * Demonstrates LLD (CRUD, Input Validation, HTTP Status Codes)
 * and HLD (Gateway Routing, In-Memory Caching, Simulated Event Messaging).
 */

class ShopSphereApp {
  constructor() {
    this.state = {
      activeTab: 'store',
      products: [],
      cart: { items: [], itemCount: 0, subtotal: 0, tax: 0, shipping: 0, total: 0 },
      orders: [],
      selectedCategory: 'all',
      searchQuery: '',
      currentTrackingOrderId: null,
      selectedApiEndpointKey: 'GET_PRODUCTS'
    };

    this.searchDebounceTimer = null;
    this.telemetryInterval = null;

    // API Registry for interactive tester
    this.apiRegistry = {
      GET_PRODUCTS: {
        method: 'GET',
        url: '/api/products',
        desc: 'Fetches all products with in-memory caching and optional search/category filters.',
        hasParams: true,
        defaultParams: '?category=all',
        hasBody: false,
        defaultBody: ''
      },
      GET_PRODUCT_ID: {
        method: 'GET',
        url: '/api/products/:id',
        desc: 'Fetches a single product by numeric ID (cached for 120s).',
        hasParams: true,
        defaultParams: '1',
        hasBody: false,
        defaultBody: ''
      },
      POST_PRODUCT: {
        method: 'POST',
        url: '/api/products',
        desc: 'Creates a new product with input validation and evicts product caches.',
        hasParams: false,
        defaultParams: '',
        hasBody: true,
        defaultBody: JSON.stringify({
          name: "Sony Wireless Earbuds WF-1000XM5",
          category: "Electronics",
          price: 279.99,
          stock: 15,
          image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
          description: "High-resolution noise canceling earbuds with LDAC support."
        }, null, 2)
      },
      PUT_PRODUCT: {
        method: 'PUT',
        url: '/api/products/:id',
        desc: 'Updates an existing product in SQLite and evicts corresponding cache keys.',
        hasParams: true,
        defaultParams: '1',
        hasBody: true,
        defaultBody: JSON.stringify({
          price: 329.99,
          stock: 20
        }, null, 2)
      },
      DELETE_PRODUCT: {
        method: 'DELETE',
        url: '/api/products/:id',
        desc: 'Deletes product by ID from SQLite and flushes product caches.',
        hasParams: true,
        defaultParams: '1',
        hasBody: false,
        defaultBody: ''
      },
      GET_CART: {
        method: 'GET',
        url: '/api/cart',
        desc: 'Returns current shopping cart with line items, tax, and total price calculation.',
        hasParams: false,
        defaultParams: '',
        hasBody: false,
        defaultBody: ''
      },
      POST_CART_ITEM: {
        method: 'POST',
        url: '/api/cart/items',
        desc: 'Adds product to cart after verifying stock against Inventory Service.',
        hasParams: false,
        defaultParams: '',
        hasBody: true,
        defaultBody: JSON.stringify({
          productId: 1,
          quantity: 1
        }, null, 2)
      },
      POST_ORDER: {
        method: 'POST',
        url: '/api/orders',
        desc: 'Places order: validates cart, simulates payment, reserves stock, creates order & emits async event.',
        hasParams: false,
        defaultParams: '',
        hasBody: true,
        defaultBody: JSON.stringify({
          customer_name: "Alex Johnson",
          customer_email: "alex.johnson@example.com",
          shipping_address: "442 Silicon Valley Blvd, San Jose, CA 95134",
          payment_method: "Credit Card"
        }, null, 2)
      },
      GET_ORDERS: {
        method: 'GET',
        url: '/api/orders',
        desc: 'Retrieves all customer orders and their associated item details.',
        hasParams: false,
        defaultParams: '',
        hasBody: false,
        defaultBody: ''
      },
      GET_TRACKING: {
        method: 'GET',
        url: '/api/orders/:id/tracking',
        desc: 'Returns order delivery timeline stages: PLACED, CONFIRMED, SHIPPED, DELIVERED.',
        hasParams: true,
        defaultParams: 'ORD-XXXXXX',
        hasBody: false,
        defaultBody: ''
      },
      POST_ADVANCE_ORDER: {
        method: 'POST',
        url: '/api/orders/:id/advance',
        desc: 'Manually triggers order state machine transition to demonstrate asynchronous lifecycle during examination.',
        hasParams: true,
        defaultParams: 'ORD-XXXXXX',
        hasBody: true,
        defaultBody: JSON.stringify({
          stage: "SHIPPED"
        }, null, 2)
      },
      GET_STATS: {
        method: 'GET',
        url: '/api/system/stats',
        desc: 'System telemetry: Cache Hit/Miss stats, Queue length, and Gateway metrics.',
        hasParams: false,
        defaultParams: '',
        hasBody: false,
        defaultBody: ''
      }
    };
  }

  /**
   * Application bootstrap
   */
  async init() {
    console.log('[ShopSphere] Initializing application...');
    this.selectApiEndpoint('GET_PRODUCTS');
    
    // Initial data fetches
    await Promise.all([
      this.loadProducts(),
      this.loadCart(),
      this.loadOrders(),
      this.fetchSystemStats()
    ]);

    // Polling telemetry every 4 seconds to keep dashboard live
    this.telemetryInterval = setInterval(() => {
      this.fetchSystemStats();
      if (this.state.currentTrackingOrderId) {
        this.refreshActiveTracking();
      }
    }, 4000);
  }

  // =========================================================================
  // NAVIGATION
  // =========================================================================
  navigateTo(tabId) {
    this.state.activeTab = tabId;

    // Update active class on nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update active tab pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabId}`);
    });

    // Refresh context data based on tab
    if (tabId === 'store') this.loadProducts();
    else if (tabId === 'crud') this.renderCrudTable();
    else if (tabId === 'cart') this.loadCart();
    else if (tabId === 'orders') this.loadOrders();
    else if (tabId === 'architecture') this.fetchSystemStats();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // STOREFRONT (PRODUCTS & SEARCH)
  // =========================================================================
  async loadProducts() {
    try {
      let url = '/api/products';
      const params = new URLSearchParams();
      if (this.state.searchQuery) params.append('q', this.state.searchQuery);
      if (this.state.selectedCategory && this.state.selectedCategory !== 'all') {
        params.append('category', this.state.selectedCategory);
      }
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        this.state.products = json.data;
        this.renderProductsGrid(json.fromCache);
        this.renderCrudTable();
      } else {
        this.showToast(json.error?.message || 'Failed to fetch products', 'error');
      }
    } catch (err) {
      console.error('loadProducts error:', err);
      this.showToast('Network error loading products', 'error');
    }
  }

  renderProductsGrid(fromCache = false) {
    const grid = document.getElementById('products-grid-container');
    const emptyState = document.getElementById('store-empty-state');
    const cacheBanner = document.getElementById('store-cache-indicator');
    const cacheBadge = document.getElementById('store-cache-badge');
    const cacheText = document.getElementById('store-cache-text');

    // Display cache hit / miss indicator
    if (cacheBanner) {
      cacheBanner.style.display = 'flex';
      if (fromCache) {
        cacheBanner.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        cacheBanner.style.background = 'rgba(16, 185, 129, 0.1)';
        cacheBadge.className = 'badge badge-success';
        cacheBadge.innerHTML = '<i class="fa-solid fa-bolt"></i> CACHE HIT';
        cacheText.innerText = 'Served from In-Memory Cache layer (Zero disk I/O, ultra-low latency)';
      } else {
        cacheBanner.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        cacheBanner.style.background = 'rgba(245, 158, 11, 0.1)';
        cacheBadge.className = 'badge badge-shipped';
        cacheBadge.innerHTML = '<i class="fa-solid fa-database"></i> CACHE MISS / DB QUERY';
        cacheText.innerText = 'Fetched directly from SQLite database and cached for subsequent requests';
      }
    }

    if (!this.state.products || this.state.products.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    grid.innerHTML = this.state.products.map(p => {
      let stockClass = 'in-stock';
      let stockLabel = `${p.stock} in stock`;
      if (p.stock <= 0) {
        stockClass = 'out-of-stock';
        stockLabel = 'Out of Stock';
      } else if (p.stock <= 5) {
        stockClass = 'low-stock';
        stockLabel = `Only ${p.stock} left`;
      }

      return `
        <div class="product-card" id="product-card-${p.id}">
          <div class="card-image-wrap">
            <img 
              src="${this.escapeHtml(p.image_url)}" 
              alt="${this.escapeHtml(p.name)}" 
              class="product-img"
              loading="lazy"
              onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'"
            >
            <span class="category-tag">${this.escapeHtml(p.category)}</span>
            <span class="stock-tag ${stockClass}">${stockLabel}</span>
          </div>

          <div class="card-body">
            <h3 class="product-title" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</h3>
            <p class="product-desc">${this.escapeHtml(p.description || 'No description available.')}</p>

            <div class="card-bottom-row">
              <span class="price-tag">$${Number(p.price).toFixed(2)}</span>
              <div class="card-actions-group">
                <button 
                  class="btn btn-secondary btn-icon" 
                  title="Edit Product" 
                  onclick="app.openProductModal(${p.id})"
                >
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button 
                  class="btn btn-primary btn-sm" 
                  ${p.stock <= 0 ? 'disabled' : ''} 
                  onclick="app.addToCart(${p.id}, 1)"
                >
                  <i class="fa-solid fa-cart-plus"></i> Add
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  handleSearch(val) {
    this.state.searchQuery = val.trim();
    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) clearBtn.style.display = this.state.searchQuery ? 'block' : 'none';

    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.loadProducts();
    }, 300);
  }

  clearSearch() {
    this.state.searchQuery = '';
    const input = document.getElementById('store-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) clearBtn.style.display = 'none';
    this.filterCategory('all');
  }

  filterCategory(cat) {
    this.state.selectedCategory = cat;
    document.querySelectorAll('#category-filter-chips .chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.category === cat);
    });
    this.loadProducts();
  }

  // =========================================================================
  // ROUND 2: PRODUCT CRUD OPERATIONS
  // =========================================================================
  renderCrudTable() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    if (!this.state.products || this.state.products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center p-4">No products in catalog.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.products.map(p => `
      <tr id="crud-row-${p.id}">
        <td><strong>#${p.id}</strong></td>
        <td>
          <img src="${this.escapeHtml(p.image_url)}" class="table-thumb" alt="${this.escapeHtml(p.name)}" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'">
        </td>
        <td>
          <div style="font-weight:600; color:white;">${this.escapeHtml(p.name)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${this.escapeHtml((p.description || '').slice(0, 50))}...</div>
        </td>
        <td><span class="badge" style="background:#1e293b; color:#94a3b8;">${this.escapeHtml(p.category)}</span></td>
        <td><strong class="font-mono">$${Number(p.price).toFixed(2)}</strong></td>
        <td>
          ${p.stock > 0 
            ? `<span class="badge badge-success">${p.stock} units</span>` 
            : `<span class="badge badge-shipped" style="color:#f87171; background:rgba(239,68,68,0.15)">Out of stock</span>`}
        </td>
        <td style="font-size:0.75rem; color:var(--text-dim); font-family:var(--font-mono);">
          ${new Date(p.created_at).toLocaleDateString()}
        </td>
        <td class="text-right">
          <div style="display:flex; justify-content:flex-end; gap:0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="app.openProductModal(${p.id})">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="app.deleteProduct(${p.id}, '${this.escapeJs(p.name)}')">
              <i class="fa-solid fa-trash-can"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openProductModal(productId = null) {
    const backdrop = document.getElementById('product-modal-backdrop');
    const titleEl = document.getElementById('product-modal-title');
    const formId = document.getElementById('product-form-id');
    const nameInput = document.getElementById('prod-name');
    const categoryInput = document.getElementById('prod-category');
    const priceInput = document.getElementById('prod-price');
    const stockInput = document.getElementById('prod-stock');
    const imageInput = document.getElementById('prod-image');
    const descInput = document.getElementById('prod-description');

    if (productId) {
      const product = this.state.products.find(p => p.id === productId);
      if (!product) return;
      titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Product #${product.id}`;
      formId.value = product.id;
      nameInput.value = product.name;
      categoryInput.value = product.category;
      priceInput.value = product.price;
      stockInput.value = product.stock;
      imageInput.value = product.image_url || '';
      descInput.value = product.description || '';
    } else {
      titleEl.innerHTML = `<i class="fa-solid fa-box-open"></i> Add New Product`;
      formId.value = '';
      nameInput.value = '';
      categoryInput.value = 'Electronics';
      priceInput.value = '';
      stockInput.value = '10';
      imageInput.value = '';
      descInput.value = '';
    }

    backdrop.style.display = 'flex';
  }

  closeProductModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('product-modal-backdrop').style.display = 'none';
  }

  async handleSaveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-form-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const category = document.getElementById('prod-category').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value, 10);
    const image_url = document.getElementById('prod-image').value.trim();
    const description = document.getElementById('prod-description').value.trim();

    // Validation
    if (!name) return this.showToast('Product name is required', 'error');
    if (isNaN(price) || price <= 0) return this.showToast('Price must be greater than 0', 'error');
    if (isNaN(stock) || stock < 0) return this.showToast('Stock must be at least 0', 'error');

    const payload = { name, category, price, stock, image_url, description };

    try {
      let res;
      if (id) {
        // PUT /api/products/:id
        res = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // POST /api/products
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const json = await res.json();
      if (json.success) {
        this.showToast(id ? 'Product updated successfully' : 'Product created successfully', 'success');
        this.closeProductModal();
        await this.loadProducts();
        this.fetchSystemStats();
      } else {
        this.showToast(json.error?.message || 'Failed to save product', 'error');
      }
    } catch (err) {
      console.error('handleSaveProduct error:', err);
      this.showToast('Network error while saving product', 'error');
    }
  }

  async deleteProduct(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}" (ID #${id})?\nThis will remove the product and invalidate cached entries.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        this.showToast(`Product #${id} deleted successfully`, 'success');
        await this.loadProducts();
        await this.loadCart();
        this.fetchSystemStats();
      } else {
        this.showToast(json.error?.message || 'Failed to delete product', 'error');
      }
    } catch (err) {
      console.error('deleteProduct error:', err);
      this.showToast('Network error while deleting product', 'error');
    }
  }

  // =========================================================================
  // SHOPPING CART OPERATIONS
  // =========================================================================
  async loadCart() {
    try {
      const res = await fetch('/api/cart');
      const json = await res.json();
      if (json.success) {
        this.state.cart = json.data;
        this.renderCartUI();
      }
    } catch (err) {
      console.error('loadCart error:', err);
    }
  }

  async addToCart(productId, quantity = 1) {
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });
      const json = await res.json();
      if (json.success) {
        this.state.cart = json.data;
        this.renderCartUI();
        this.showToast('Added to cart!', 'success');
      } else {
        this.showToast(json.error?.message || 'Could not add to cart', 'error');
      }
    } catch (err) {
      console.error('addToCart error:', err);
      this.showToast('Network error adding to cart', 'error');
    }
  }

  async updateCartItemQty(productId, newQty) {
    try {
      const res = await fetch(`/api/cart/items/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
      });
      const json = await res.json();
      if (json.success) {
        this.state.cart = json.data;
        this.renderCartUI();
      } else {
        this.showToast(json.error?.message || 'Failed to update quantity', 'error');
      }
    } catch (err) {
      console.error('updateCartItemQty error:', err);
    }
  }

  async removeCartItem(productId) {
    try {
      const res = await fetch(`/api/cart/items/${productId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        this.state.cart = json.data;
        this.renderCartUI();
        this.showToast('Item removed from cart', 'info');
      }
    } catch (err) {
      console.error('removeCartItem error:', err);
    }
  }

  async clearCart() {
    if (this.state.cart.itemCount === 0) return;
    if (!confirm('Clear all items from your cart?')) return;
    try {
      const res = await fetch('/api/cart', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        this.state.cart = json.data;
        this.renderCartUI();
        this.showToast('Cart cleared', 'info');
      }
    } catch (err) {
      console.error('clearCart error:', err);
    }
  }

  renderCartUI() {
    const { items, itemCount, subtotal, tax, shipping, total } = this.state.cart;

    // Header badge
    const badge = document.getElementById('header-cart-badge');
    const headerTotal = document.getElementById('header-cart-total');
    if (badge) badge.innerText = itemCount;
    if (headerTotal) headerTotal.innerText = `$${total.toFixed(2)}`;

    // Cart tab elements
    const listContainer = document.getElementById('cart-items-list-container');
    const emptyState = document.getElementById('cart-empty-state');
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const shippingEl = document.getElementById('cart-shipping');
    const totalEl = document.getElementById('cart-total');
    const submitBtn = document.getElementById('btn-submit-order');

    if (subtotalEl) subtotalEl.innerText = `$${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.innerText = `$${tax.toFixed(2)}`;
    if (shippingEl) shippingEl.innerText = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;

    if (!items || items.length === 0) {
      if (listContainer) listContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;

    if (listContainer) {
      listContainer.innerHTML = items.map(item => `
        <div class="cart-item-row" id="cart-item-${item.productId}">
          <div class="cart-item-info">
            <img src="${this.escapeHtml(item.imageUrl)}" class="cart-item-img" alt="${this.escapeHtml(item.productName)}" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'">
            <div>
              <div class="cart-item-title">${this.escapeHtml(item.productName)}</div>
              <div class="cart-item-meta">$${Number(item.price).toFixed(2)} each • Stock: ${item.availableStock}</div>
            </div>
          </div>

          <div class="qty-control-box">
            <button class="qty-btn" onclick="app.updateCartItemQty(${item.productId}, ${item.quantity - 1})">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span class="qty-number">${item.quantity}</span>
            <button class="qty-btn" ${item.quantity >= item.availableStock ? 'disabled' : ''} onclick="app.updateCartItemQty(${item.productId}, ${item.quantity + 1})">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>

          <div class="cart-line-total">$${Number(item.lineTotal).toFixed(2)}</div>

          <button class="btn btn-outline-danger btn-icon btn-sm" title="Remove" onclick="app.removeCartItem(${item.productId})">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `).join('');
    }
  }

  // =========================================================================
  // CHECKOUT & ORDERS (ROUND 3 HLD ORCHESTRATION)
  // =========================================================================
  async handleCheckout(e) {
    e.preventDefault();
    if (this.state.cart.itemCount === 0) {
      return this.showToast('Your cart is empty!', 'error');
    }

    const customer_name = document.getElementById('checkout-name').value.trim();
    const customer_email = document.getElementById('checkout-email').value.trim();
    const shipping_address = document.getElementById('checkout-address').value.trim();
    const payment_method = document.getElementById('checkout-payment').value;

    const btn = document.getElementById('btn-submit-order');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name, customer_email, shipping_address, payment_method })
      });

      const json = await res.json();
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock"></i> <span>Place Order & Trigger Async Events</span>';

      if (json.success) {
        this.showToast(`Order #${json.data.id} placed successfully!`, 'success');
        await this.loadCart();
        await this.loadProducts();
        await this.loadOrders();
        this.fetchSystemStats();

        // Switch to Orders tab and open tracking viewer
        this.navigateTo('orders');
        this.viewOrderTracking(json.data.id);
      } else {
        this.showToast(json.error?.message || 'Order failed', 'error');
      }
    } catch (err) {
      console.error('handleCheckout error:', err);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock"></i> <span>Place Order & Trigger Async Events</span>';
      this.showToast('Network error processing checkout', 'error');
    }
  }

  async loadOrders() {
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.success) {
        this.state.orders = json.data;
        this.renderOrdersTable();
      }
    } catch (err) {
      console.error('loadOrders error:', err);
    }
  }

  renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    const emptyState = document.getElementById('orders-empty-state');
    if (!tbody) return;

    if (!this.state.orders || this.state.orders.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = this.state.orders.map(o => {
      let badgeClass = 'badge-placed';
      if (o.status === 'CONFIRMED') badgeClass = 'badge-confirmed';
      if (o.status === 'SHIPPED') badgeClass = 'badge-shipped';
      if (o.status === 'DELIVERED') badgeClass = 'badge-delivered';

      const itemsSummary = (o.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ');

      return `
        <tr id="order-row-${o.id}">
          <td><strong class="font-mono text-info">${o.id}</strong></td>
          <td>
            <div style="font-weight:600; color:white;">${this.escapeHtml(o.customer_name)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${this.escapeHtml(o.customer_email)}</div>
          </td>
          <td>
            <span style="font-size:0.8rem; color:#cbd5e1;" title="${this.escapeHtml(itemsSummary)}">
              ${this.escapeHtml(itemsSummary.length > 35 ? itemsSummary.slice(0, 35) + '...' : itemsSummary)}
            </span>
          </td>
          <td><strong class="font-mono">$${Number(o.total_amount).toFixed(2)}</strong></td>
          <td><span style="font-size:0.8rem; color:var(--text-muted);">${this.escapeHtml(o.payment_method)}</span></td>
          <td><span class="badge ${badgeClass}"><i class="fa-solid fa-circle-dot"></i> ${o.status}</span></td>
          <td style="font-size:0.75rem; color:var(--text-dim); font-family:var(--font-mono);">
            ${new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </td>
          <td class="text-right">
            <div style="display:flex; justify-content:flex-end; gap:0.4rem;">
              <button class="btn btn-primary btn-sm" onclick="app.viewOrderTracking('${o.id}')">
                <i class="fa-solid fa-route"></i> Track
              </button>
              ${o.status !== 'DELIVERED' ? `
                <button class="btn btn-secondary btn-sm" title="Advance Stage (Demo)" onclick="app.advanceSpecificOrder('${o.id}')">
                  <i class="fa-solid fa-forward-step"></i> Advance
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // ORDER TRACKING & STAGES (ROUND 3 HLD)
  // =========================================================================
  async viewOrderTracking(orderId) {
    this.state.currentTrackingOrderId = orderId;
    const container = document.getElementById('tracking-viewer-container');
    if (container) container.style.display = 'block';

    await this.refreshActiveTracking();
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  closeTrackingViewer() {
    this.state.currentTrackingOrderId = null;
    const container = document.getElementById('tracking-viewer-container');
    if (container) container.style.display = 'none';
  }

  async refreshActiveTracking() {
    if (!this.state.currentTrackingOrderId) return;
    try {
      const res = await fetch(`/api/orders/${this.state.currentTrackingOrderId}/tracking`);
      const json = await res.json();
      if (json.success) {
        this.renderTrackingData(json.data);
      }
    } catch (err) {
      console.error('refreshActiveTracking error:', err);
    }
  }

  renderTrackingData(data) {
    const orderIdEl = document.getElementById('tracking-order-id');
    const titleEl = document.getElementById('tracking-status-title');
    const metaEl = document.getElementById('tracking-customer-meta');
    const advanceBtn = document.getElementById('btn-advance-stage');

    if (orderIdEl) orderIdEl.innerText = data.orderId;
    if (titleEl) titleEl.innerText = `Current Status: ${data.status}`;
    if (metaEl) metaEl.innerText = `Customer: ${data.customerName} | Tracking Code: ${data.trackingCode} | Carrier: ${data.carrier}`;

    if (advanceBtn) {
      if (data.status === 'DELIVERED') {
        advanceBtn.disabled = true;
        advanceBtn.innerText = 'Delivered (Final Stage)';
      } else {
        advanceBtn.disabled = false;
        advanceBtn.innerHTML = '<i class="fa-solid fa-forward-step"></i> <span>Advance Status (Viva Demo)</span>';
      }
    }

    // Update 4-stage stepper
    const stages = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
    const currentIndex = stages.indexOf(data.status);

    stages.forEach((st, idx) => {
      const stepEl = document.getElementById(`step-${st}`);
      const timeEl = document.getElementById(`time-${st}`);
      const stepInfo = data.timeline.find(t => t.stage === st);

      if (stepEl) {
        stepEl.classList.remove('completed', 'current');
        if (idx < currentIndex) {
          stepEl.classList.add('completed');
        } else if (idx === currentIndex) {
          stepEl.classList.add('current');
        }
      }

      if (timeEl && stepInfo && stepInfo.timestamp) {
        timeEl.innerText = new Date(stepInfo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } else if (timeEl) {
        timeEl.innerText = idx <= currentIndex ? 'Completed' : 'Pending';
      }
    });

    // Update lines between steps
    const line1 = document.getElementById('line-1');
    const line2 = document.getElementById('line-2');
    const line3 = document.getElementById('line-3');
    if (line1) line1.classList.toggle('completed', currentIndex >= 1);
    if (line2) line2.classList.toggle('completed', currentIndex >= 2);
    if (line3) line3.classList.toggle('completed', currentIndex >= 3);

    // Timeline event logs
    const eventsList = document.getElementById('tracking-events-list');
    if (eventsList && data.rawEvents) {
      eventsList.innerHTML = data.rawEvents.map(evt => `
        <div class="timeline-node">
          <div class="timeline-node-time">${new Date(evt.timestamp).toLocaleTimeString()} - ${new Date(evt.timestamp).toLocaleDateString()}</div>
          <div class="timeline-node-title">${this.escapeHtml(evt.stage)}</div>
          <div class="timeline-node-desc">${this.escapeHtml(evt.description)}</div>
        </div>
      `).join('');
    }
  }

  async advanceCurrentOrderStage() {
    if (!this.state.currentTrackingOrderId) return;
    await this.advanceSpecificOrder(this.state.currentTrackingOrderId);
  }

  async advanceSpecificOrder(orderId) {
    try {
      const res = await fetch(`/api/orders/${orderId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (json.success) {
        this.showToast(`Order #${orderId} moved to ${json.data.currentStatus}!`, 'success');
        await this.loadOrders();
        await this.refreshActiveTracking();
        this.fetchSystemStats();
      } else {
        this.showToast(json.error?.message || 'Could not advance order stage', 'info');
      }
    } catch (err) {
      console.error('advanceSpecificOrder error:', err);
    }
  }

  // =========================================================================
  // SYSTEM TELEMETRY & CACHE CONTROLS
  // =========================================================================
  async fetchSystemStats() {
    try {
      const res = await fetch('/api/system/stats');
      const json = await res.json();
      if (json.success) {
        const { overview, cache, eventQueue, recentNotifications } = json.data;

        // Top banner stats
        const statProd = document.getElementById('stat-products');
        const statOrd = document.getElementById('stat-orders');
        const statRev = document.getElementById('stat-revenue');
        const statCache = document.getElementById('stat-cache-ratio');

        if (statProd) statProd.innerText = overview.productsCount;
        if (statOrd) statOrd.innerText = overview.ordersCount;
        if (statRev) statRev.innerText = `$${overview.revenue.toFixed(2)}`;
        if (statCache) statCache.innerText = cache.hitRatio;

        // Architecture tab monitors
        const telHits = document.getElementById('tel-cache-hits');
        const telMisses = document.getElementById('tel-cache-misses');
        const telKeys = document.getElementById('tel-cache-keys');
        const telRatio = document.getElementById('tel-cache-ratio');

        if (telHits) telHits.innerText = cache.hits;
        if (telMisses) telMisses.innerText = cache.misses;
        if (telKeys) telKeys.innerText = cache.keysCount;
        if (telRatio) telRatio.innerText = cache.hitRatio;

        // Queue telemetry
        const telProcessed = document.getElementById('tel-queue-processed');
        const telPending = document.getElementById('tel-queue-pending');
        const telEventsList = document.getElementById('tel-recent-events');

        if (telProcessed) telProcessed.innerText = eventQueue.processedEventsCount;
        if (telPending) telPending.innerText = eventQueue.pendingJobsCount;

        if (telEventsList && eventQueue.recentEvents) {
          telEventsList.innerHTML = eventQueue.recentEvents.slice(0, 5).map(e => `
            <div class="queue-event-chip">
              <strong style="color:#f472b6;">[${this.escapeHtml(e.topic)}]</strong> ${e.id}
              <div style="font-size:0.7rem; color:var(--text-dim);">${new Date(e.timestamp).toLocaleTimeString()}</div>
            </div>
          `).join('');
        }

        // Notification stream
        const notifStream = document.getElementById('tel-notifications-stream');
        if (notifStream && recentNotifications) {
          notifStream.innerHTML = recentNotifications.slice(0, 5).map(n => `
            <div class="notif-chip">
              <span class="badge ${n.channel === 'EMAIL' ? 'badge-placed' : 'badge-shipped'}">${n.channel}</span>
              <strong>${this.escapeHtml(n.subject)}</strong>
              <div style="color:var(--text-muted); font-size:0.75rem;">${this.escapeHtml(n.body)}</div>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('fetchSystemStats error:', err);
    }
  }

  async flushCache() {
    try {
      const res = await fetch('/api/system/cache/flush', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        this.showToast('In-memory cache flushed!', 'info');
        this.fetchSystemStats();
      }
    } catch (err) {
      console.error('flushCache error:', err);
    }
  }

  async resetDemoData() {
    if (!confirm('Reset SQLite database to original sample seed products and clear all demo orders?')) {
      return;
    }
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        this.showToast('Database reset to fresh initial state', 'success');
        this.closeTrackingViewer();
        await Promise.all([
          this.loadProducts(),
          this.loadCart(),
          this.loadOrders(),
          this.fetchSystemStats()
        ]);
        this.navigateTo('store');
      }
    } catch (err) {
      console.error('resetDemoData error:', err);
    }
  }

  // =========================================================================
  // INTERACTIVE API DOCUMENTATION & PLAYGROUND
  // =========================================================================
  selectApiEndpoint(key) {
    this.state.selectedApiEndpointKey = key;
    const config = this.apiRegistry[key];
    if (!config) return;

    // Highlight active in list
    document.querySelectorAll('.api-item').forEach(item => {
      const text = item.innerText;
      const match = text.includes(config.url.replace('/:id', ''));
      item.classList.toggle('active', match);
    });

    // Populate console UI
    const badge = document.getElementById('tester-method-badge');
    const urlDisplay = document.getElementById('tester-url-display');
    const descEl = document.getElementById('tester-description');
    const payloadSec = document.getElementById('tester-payload-section');
    const bodyTextarea = document.getElementById('tester-request-body');
    const paramsInput = document.getElementById('tester-url-params');
    const curlEl = document.getElementById('tester-curl-command');

    if (badge) {
      badge.className = `http-badge ${config.method.toLowerCase()}`;
      badge.innerText = config.method;
    }
    if (urlDisplay) urlDisplay.innerText = config.url;
    if (descEl) descEl.innerText = config.desc;

    if (payloadSec) payloadSec.style.display = config.hasBody ? 'block' : 'none';
    if (bodyTextarea) bodyTextarea.value = config.defaultBody;
    if (paramsInput) paramsInput.value = config.defaultParams;

    // Update curl preview
    let sampleCurl = `curl -X ${config.method} http://localhost:3000${config.url.replace('/:id', '/' + (config.defaultParams || '1'))}`;
    if (config.hasBody) {
      sampleCurl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${config.defaultBody.replace(/\n/g, '')}'`;
    }
    if (curlEl) curlEl.innerText = sampleCurl;
  }

  async executeSelectedApi() {
    const config = this.apiRegistry[this.state.selectedApiEndpointKey];
    if (!config) return;

    const paramsVal = document.getElementById('tester-url-params').value.trim();
    const bodyVal = document.getElementById('tester-request-body').value.trim();
    const statusEl = document.getElementById('tester-response-status');
    const timeEl = document.getElementById('tester-response-time');
    const sourceEl = document.getElementById('tester-response-source');
    const outputEl = document.getElementById('tester-response-json');

    // Build URL
    let targetUrl = config.url;
    if (targetUrl.includes('/:id')) {
      targetUrl = targetUrl.replace('/:id', `/${paramsVal || '1'}`);
    } else if (paramsVal && paramsVal.startsWith('?')) {
      targetUrl += paramsVal;
    }

    const options = {
      method: config.method,
      headers: {}
    };

    if (config.hasBody && bodyVal) {
      options.headers['Content-Type'] = 'application/json';
      try {
        JSON.parse(bodyVal); // Validate JSON
        options.body = bodyVal;
      } catch (e) {
        return this.showToast('Invalid JSON syntax in Request Body editor', 'error');
      }
    }

    statusEl.innerText = 'Status: Sending...';
    outputEl.innerText = '// Sending request to API Gateway...';
    const startTime = performance.now();

    try {
      const res = await fetch(targetUrl, options);
      const duration = Math.round(performance.now() - startTime);
      const json = await res.json();

      statusEl.innerText = `Status: ${res.status} ${res.statusText}`;
      statusEl.style.color = res.ok ? 'var(--success)' : 'var(--danger)';
      timeEl.innerText = `Time: ${duration} ms`;

      const fromCache = json.fromCache ? 'Served by In-Memory Cache' : 'Served by SQLite Database';
      sourceEl.innerText = `Source: ${fromCache}`;

      outputEl.innerText = JSON.stringify(json, null, 2);

      // Refresh app states if data modified
      if (['POST', 'PUT', 'DELETE'].includes(config.method)) {
        this.loadProducts();
        this.loadCart();
        this.loadOrders();
        this.fetchSystemStats();
      }
    } catch (err) {
      statusEl.innerText = 'Status: Network Error';
      statusEl.style.color = 'var(--danger)';
      outputEl.innerText = `Error: ${err.message}`;
    }
  }

  // =========================================================================
  // TOAST NOTIFICATIONS & UTILITIES
  // =========================================================================
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideToast 0.3s ease-out reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
}

// Global singleton instance
const app = new ShopSphereApp();
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
