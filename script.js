let products = [];
let cart = loadCartFromStorage();
let activeCategory = 'All';
let searchTerm = '';

const productsGrid = document.getElementById('productsGrid');
const noProductsMsg = document.getElementById('noProductsMsg');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('searchInput');
const filterBar = document.getElementById('filterBar');
const cartCountEl = document.getElementById('cartCount');
const cartToggleBtn = document.getElementById('cartToggleBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartSidebar = document.getElementById('cartSidebar');
const overlay = document.getElementById('overlay');
const cartItemsEl = document.getElementById('cartItems');
const cartEmptyMsg = document.getElementById('cartEmptyMsg');
const cartTotalEl = document.getElementById('cartTotal');
const clearCartBtn = document.getElementById('clearCartBtn');
const toast = document.getElementById('toast');

async function fetchProducts() {
  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    products = await response.json();
  } catch (error) {
    console.error('Failed to load products:', error);
    productsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#6b7280;padding:40px 0;">
      Could not load products. Please run this page through a local server (e.g. Live Server).</p>`;
  } finally {
    loader.classList.add('hidden');
  }
}

function getFilteredProducts() {
  return products.filter((product) => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

function buildRatingStars(rating) {
  const fullStars = Math.round(rating);
  const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  return `${stars} <span>(${rating})</span>`;
}

function getProductControlsHTML(id) {
  const cartItem = cart.find((item) => item.id === id);
  if (cartItem) {
    return `
      <div class="qty-controls">
        <button class="qty-btn" data-action="decrease" data-id="${id}">−</button>
        <span class="qty-value">${cartItem.qty}</span>
        <button class="qty-btn" data-action="increase" data-id="${id}">+</button>
      </div>`;
  }
  return `<button class="add-to-cart-btn" data-id="${id}">Add to Cart</button>`;
}

function updateProductControls(id) {
  const container = productsGrid.querySelector(`.product-controls[data-id="${id}"]`);
  if (container) container.innerHTML = getProductControlsHTML(id);
}

function createProductCard(product, index) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.style.animationDelay = `${index * 0.05}s`;

  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  card.innerHTML = `
    <div class="product-img-wrap">
      <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" />
      ${discountPercent > 0 ? `<span class="discount-badge">${discountPercent}% OFF</span>` : ''}
      <span class="category-badge">${product.category}</span>
    </div>
    <div class="product-info">
      <p class="product-name">${product.name}</p>
      <div class="product-rating">${buildRatingStars(product.rating)}</div>
      <div class="product-price-row">
        <span class="product-price">₹${product.price}</span>
        <span class="product-original-price">₹${product.originalPrice}</span>
      </div>
      <div class="product-controls" data-id="${product.id}">${getProductControlsHTML(product.id)}</div>
    </div>
  `;

  return card;
}

function renderProducts() {
  const filtered = getFilteredProducts();
  productsGrid.innerHTML = '';

  if (filtered.length === 0) {
    noProductsMsg.classList.remove('hidden');
    return;
  }
  noProductsMsg.classList.add('hidden');

  filtered.forEach((product, index) => {
    productsGrid.appendChild(createProductCard(product, index));
  });
}

// ===== Cart logic =====
function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('shopnest_cart');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCartToStorage() {
  localStorage.setItem('shopnest_cart', JSON.stringify(cart));
}

function addToCart(id) {
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }
  saveCartToStorage();
  renderCart();
  updateProductControls(id);

  const product = products.find((p) => p.id === id);
  showToast(`${product ? product.name : 'Item'} added to cart`);
}

function increaseQty(id) {
  const item = cart.find((i) => i.id === id);
  if (item) item.qty += 1;
  saveCartToStorage();
  renderCart();
  updateProductControls(id);
}

function decreaseQty(id) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty -= 1;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== id);
  }
  saveCartToStorage();
  renderCart();
  updateProductControls(id);
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCartToStorage();
  renderCart();
  updateProductControls(id);
}

function clearCart() {
  const removedIds = cart.map((item) => item.id);
  cart = [];
  saveCartToStorage();
  renderCart();
  removedIds.forEach((id) => updateProductControls(id));
  showToast('Cart cleared');
}

function renderCart() {
  cartItemsEl.innerHTML = '';

  if (cart.length === 0) {
    cartEmptyMsg.classList.remove('hidden');
  } else {
    cartEmptyMsg.classList.add('hidden');

    cart.forEach((item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product) return;

      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <img src="${product.imageUrl}" alt="${product.name}" />
        <div class="cart-item-details">
          <p class="cart-item-name">${product.name}</p>
          <p class="cart-item-price">₹${product.price * item.qty}</p>
          <div class="qty-controls">
            <button class="qty-btn" data-action="decrease" data-id="${product.id}">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="increase" data-id="${product.id}">+</button>
          </div>
        </div>
        <button class="remove-btn" data-action="remove" data-id="${product.id}" aria-label="Remove item">🗑</button>
      `;
      cartItemsEl.appendChild(row);
    });
  }

  updateCartSummary();
}

function updateCartSummary() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);

  cartCountEl.textContent = totalItems;
  cartTotalEl.textContent = `₹${totalPrice}`;

  cartCountEl.classList.remove('bump');
  cartCountEl.getBoundingClientRect();
  cartCountEl.classList.add('bump');
}

function openCart() {
  cartSidebar.classList.add('open');
  overlay.classList.add('show');
}

function closeCart() {
  cartSidebar.classList.remove('open');
  overlay.classList.remove('show');
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderProducts();
});

filterBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;

  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  activeCategory = btn.dataset.category;
  renderProducts();
});

cartToggleBtn.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);
clearCartBtn.addEventListener('click', clearCart);

productsGrid.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.add-to-cart-btn');
  if (addBtn) {
    addToCart(Number(addBtn.dataset.id));
    return;
  }

  const qtyBtn = e.target.closest('.qty-btn[data-action]');
  if (!qtyBtn) return;
  const id = Number(qtyBtn.dataset.id);
  if (qtyBtn.dataset.action === 'increase') increaseQty(id);
  else if (qtyBtn.dataset.action === 'decrease') decreaseQty(id);
});

cartItemsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === 'increase') increaseQty(id);
  else if (action === 'decrease') decreaseQty(id);
  else if (action === 'remove') removeFromCart(id);
});

await fetchProducts();
renderProducts();
renderCart();
