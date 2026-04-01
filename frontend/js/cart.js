// js/cart.js
import {
  API_BASE_URL,
  getAllPaintings,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "./api.js";

/* ========== State ========== */
const state = {
  currentUser: null,
  authToken: null,
  cart: null,
  items: [],
  paintingMap: new Map(),
  pendingConfirm: null,
};

const els = {};

/* ========== Init ========== */
document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  loadAuthFromStorage();
  
  if (!guardAuth()) return;
  
  initEventListeners();
  loadCartAndPaintings();
});

function cacheElements() {
  // Header
  els.cartCount = document.getElementById("cart-count");
  
  // Cart content
  els.cartMessage = document.getElementById("cart-message");
  els.cartItemsContainer = document.getElementById("cart-items-container");
  els.cartItemTemplate = document.getElementById("cart-item-template");
  els.cartLoading = document.getElementById("cart-loading");
  els.emptyCart = document.getElementById("empty-cart");
  
  // Summary (only subtotal and total now)
  els.summarySubtotal = document.getElementById("summary-subtotal");
  els.summaryTotal = document.getElementById("summary-total");
  
  // Actions
  els.checkoutBtn = document.getElementById("checkout-btn");
  els.clearCartBtn = document.getElementById("clear-cart-btn");
  
  // Toast
  els.toastContainer = document.getElementById("toast-container");
  
  // Confirm Modal
  els.confirmModal = document.getElementById("confirm-modal");
  els.confirmTitle = document.getElementById("confirm-title");
  els.confirmMessage = document.getElementById("confirm-message");
  els.confirmCancel = document.getElementById("confirm-cancel");
  els.confirmAction = document.getElementById("confirm-action");
}

function initEventListeners() {
  // Clear cart
  els.clearCartBtn?.addEventListener("click", handleClearCart);
  
  // Checkout
  els.checkoutBtn?.addEventListener("click", handleCheckout);
  
  // Confirm modal
  els.confirmCancel?.addEventListener("click", closeConfirmModal);
  els.confirmAction?.addEventListener("click", executeConfirmAction);
  els.confirmModal?.addEventListener("click", (e) => {
    if (e.target === els.confirmModal) closeConfirmModal();
  });
  
  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeConfirmModal();
  });
}

/* ========== Auth ========== */
function loadAuthFromStorage() {
  try {
    const rawUser = localStorage.getItem("auth_user");
    const token = localStorage.getItem("auth_token");
    if (rawUser && token) {
      state.currentUser = JSON.parse(rawUser);
      state.authToken = token;
    }
  } catch {
    state.currentUser = null;
    state.authToken = null;
  }
}

function guardAuth() {
  if (!state.currentUser || !state.authToken) {
    window.location.href = "./login.html";
    return false;
  }
  return true;
}

/* ========== Load Cart ========== */
async function loadCartAndPaintings() {
  showLoading(true);
  
  try {
    const [cart, paintings] = await Promise.all([
      getCart(state.currentUser.id, state.authToken),
      getAllPaintings(),
    ]);

    state.cart = cart;
    
    // Build painting map
    const paintingList = Array.isArray(paintings) ? paintings : [];
    state.paintingMap = new Map(paintingList.map((p) => [p.id, p]));

    const rawItems = Array.isArray(cart.items) ? cart.items : [];
    state.items = rawItems.map((it) => normalizeCartItem(it, state.paintingMap));

    renderCart();
    
  } catch (err) {
    if (err.status === 404) {
      state.cart = null;
      state.items = [];
      renderCart();
    } else {
      console.error(err);
      showMessage("Failed to load cart. Please refresh the page.", "error");
    }
  } finally {
    showLoading(false);
  }
}

function normalizeCartItem(it, paintingMap) {
  const painting = paintingMap.get(it.painting_id) || {};

  return {
    id: it.id,
    paintingId: it.painting_id,
    title: painting.title || `Painting #${it.painting_id}`,
    artist: painting.artist_name || "Unknown Artist",
    price: Number(painting.price || 0),
    quantity: Number(it.quantity || 1),
    imageUrl: painting.image_url || null,
    hasCertificate: !!painting.ipfs_cid,
  };
}

/* ========== Rendering ========== */
function showLoading(show) {
  if (els.cartLoading) {
    els.cartLoading.classList.toggle("hidden", !show);
  }
}

function renderCart() {
  const container = els.cartItemsContainer;
  if (!container) return;

  container.innerHTML = "";

  // Empty state
  if (!state.items.length) {
    els.emptyCart?.classList.remove("hidden");
    els.cartItemsContainer?.classList.add("hidden");
    updateSummary();
    updateCartCountUI(0);
    return;
  }

  els.emptyCart?.classList.add("hidden");
  els.cartItemsContainer?.classList.remove("hidden");

  // Render items
  state.items.forEach((item, index) => {
    const clone = els.cartItemTemplate.content.cloneNode(true);
    const card = clone.querySelector(".cart-item");
    
    // Image
    const img = card.querySelector(".cart-item-image");
    img.src = buildImageUrl(item.imageUrl);
    img.alt = item.title;
    
    // Certificate badge
    const certBadge = card.querySelector(".cart-item-cert-badge");
    if (item.hasCertificate && certBadge) {
      certBadge.classList.remove("hidden");
    }
    
    // Text content
    card.querySelector(".cart-item-title").textContent = item.title;
    card.querySelector(".cart-item-artist").textContent = `By ${item.artist}`;
    card.querySelector(".cart-item-price").textContent = formatPrice(item.price);
    card.querySelector(".cart-item-subtotal").textContent = formatPrice(item.price * item.quantity);
    
    // Quantity
    const qtyInput = card.querySelector(".qty-input");
    qtyInput.value = item.quantity;
    
    // Event listeners
    card.querySelector(".qty-incr").addEventListener("click", () => {
      updateItemQuantity(item, item.quantity + 1);
    });
    
    card.querySelector(".qty-decr").addEventListener("click", () => {
      if (item.quantity > 1) {
        updateItemQuantity(item, item.quantity - 1);
      }
    });
    
    qtyInput.addEventListener("change", () => {
      let newQty = parseInt(qtyInput.value || "1", 10);
      if (isNaN(newQty) || newQty < 1) newQty = 1;
      updateItemQuantity(item, newQty);
    });
    
    // Remove buttons (desktop and mobile)
    card.querySelectorAll(".remove-item").forEach(btn => {
      btn.addEventListener("click", () => confirmRemoveItem(item));
    });
    
    // Staggered animation
    card.style.animationDelay = `${index * 100}ms`;
    
    container.appendChild(clone);
  });

  updateSummary();
  updateCartCountUI(state.items.length);
}

/* ========== Summary (Simple - No Shipping/Tax) ========== */
function updateSummary() {
  // Just calculate the total of all paintings
  const total = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (els.summarySubtotal) {
    els.summarySubtotal.textContent = formatPrice(total);
  }
  
  if (els.summaryTotal) {
    els.summaryTotal.textContent = formatPrice(total);
  }
  
  // Disable checkout if empty
  if (els.checkoutBtn) {
    if (state.items.length === 0) {
      els.checkoutBtn.classList.add("opacity-50", "pointer-events-none");
    } else {
      els.checkoutBtn.classList.remove("opacity-50", "pointer-events-none");
    }
  }
}

function updateCartCountUI(count) {
  if (els.cartCount) {
    els.cartCount.textContent = count;
  }
}

function showMessage(text, type = "info") {
  if (!els.cartMessage) return;
  
  const bgColor = {
    error: "bg-red-50 border-red-200 text-red-700",
    success: "bg-green-50 border-green-200 text-green-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  }[type] || "bg-gallery-100 border-gallery-200 text-gallery-700";
  
  const icon = {
    error: `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    success: `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    info: `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  }[type];

  els.cartMessage.innerHTML = `
    <div class="${bgColor} border rounded-xl p-4 flex items-center gap-3 animate-fade-in">
      ${icon}
      <p class="text-sm font-medium">${text}</p>
    </div>
  `;
  els.cartMessage.classList.remove("hidden");
}

/* ========== Item Actions ========== */
async function updateItemQuantity(item, newQty) {
  const previousQty = item.quantity;
  item.quantity = newQty;
  renderCart(); // Optimistic update
  
  try {
    await updateCartItem(item.id, newQty, state.authToken);
    showToast("Quantity updated", "success");
  } catch (err) {
    console.error(err);
    item.quantity = previousQty;
    renderCart();
    showToast("Failed to update quantity", "error");
  }
}

function confirmRemoveItem(item) {
  state.pendingConfirm = { type: "remove", item };
  
  if (els.confirmTitle) {
    els.confirmTitle.textContent = "Remove Item?";
  }
  if (els.confirmMessage) {
    els.confirmMessage.textContent = `Are you sure you want to remove "${item.title}" from your cart?`;
  }
  if (els.confirmAction) {
    els.confirmAction.textContent = "Remove";
    els.confirmAction.className = "flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition";
  }
  
  openConfirmModal();
}

async function deleteItem(item) {
  try {
    await removeCartItem(item.id, state.authToken);
    state.items = state.items.filter((it) => it.id !== item.id);
    renderCart();
    showToast(`"${item.title}" removed from cart`, "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to remove item", "error");
  }
}

/* ========== Cart Actions ========== */
function handleClearCart() {
  if (!state.items.length) return;
  
  state.pendingConfirm = { type: "clear" };
  
  if (els.confirmTitle) {
    els.confirmTitle.textContent = "Clear Cart?";
  }
  if (els.confirmMessage) {
    els.confirmMessage.textContent = `Are you sure you want to remove all ${state.items.length} items from your cart? This cannot be undone.`;
  }
  if (els.confirmAction) {
    els.confirmAction.textContent = "Clear All";
    els.confirmAction.className = "flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition";
  }
  
  openConfirmModal();
}

async function executeClearCart() {
  try {
    await clearCart(state.currentUser.id, state.authToken);
    state.items = [];
    renderCart();
    showToast("Cart cleared", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to clear cart", "error");
  }
}

function handleCheckout(e) {
  e.preventDefault();
  
  if (!state.items.length) {
    showToast("Your cart is empty", "info");
    return;
  }
  
  if (!state.currentUser || !state.authToken) {
    window.location.href = "./login.html";
    return;
  }
  
  window.location.href = "./checkout.html";
}

/* ========== Confirm Modal ========== */
function openConfirmModal() {
  els.confirmModal?.classList.remove("hidden");
  els.confirmModal?.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeConfirmModal() {
  els.confirmModal?.classList.add("hidden");
  els.confirmModal?.classList.remove("flex");
  document.body.style.overflow = "";
  state.pendingConfirm = null;
}

function executeConfirmAction() {
  if (!state.pendingConfirm) return;
  
  const { type, item } = state.pendingConfirm;
  
  closeConfirmModal();
  
  if (type === "remove" && item) {
    deleteItem(item);
  } else if (type === "clear") {
    executeClearCart();
  }
}

/* ========== Toast Notifications ========== */
function showToast(message, type = "info") {
  if (!els.toastContainer) return;

  const toast = document.createElement("div");
  const bgColor = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-gallery-900",
  }[type] || "bg-gallery-900";

  const icon = {
    success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
    info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  }[type];

  toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up max-w-sm`;
  toast.innerHTML = `
    ${icon}
    <span class="text-sm font-medium">${message}</span>
  `;

  els.toastContainer.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ========== Helpers ========== */
function buildImageUrl(imageUrl) {
  if (!imageUrl) {
    return "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&h=300&fit=crop";
  }
  if (imageUrl.startsWith("http")) return imageUrl;
  return API_BASE_URL + imageUrl;
}

function formatPrice(price) {
  return `Ksh ${Number(price || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}