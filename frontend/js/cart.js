// js/cart.js
import {
  API_BASE_URL,
  getAllPaintings,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "./api.js";

const state = {
  currentUser: null,
  authToken: null,
  cart: null,
  items: [],          // normalized items
  paintingMap: new Map(), // painting_id -> painting
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  // Grab elements
  els.cartCount = document.getElementById("cart-count");
  els.cartMessage = document.getElementById("cart-message");
  els.cartItemsContainer = document.getElementById("cart-items-container");
  els.cartItemTemplate = document.getElementById("cart-item-template");

  els.summarySubtotal = document.getElementById("summary-subtotal");
  els.summaryShipping = document.getElementById("summary-shipping");
  els.summaryTotal = document.getElementById("summary-total");

  els.checkoutBtn = document.getElementById("checkout-btn");
  els.clearCartBtn = document.getElementById("clear-cart-btn");

  loadAuthFromStorage();
  guardAuth();
  bindSummaryEvents();
  loadCartAndPaintings();
});

/* ===== Auth guard ===== */

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
  }
}

/* ===== Load cart + paintings ===== */

async function loadCartAndPaintings() {
  showMessage("", false, true); // hide

  try {
    const [cart, paintings] = await Promise.all([
      getCart(state.currentUser.id, state.authToken),
      getAllPaintings(),
    ]);

    state.cart = cart;

    // Build painting map: id -> painting
    const paintingList = Array.isArray(paintings) ? paintings : [];
    state.paintingMap = new Map(
      paintingList.map((p) => [p.id, p])
    );

    const rawItems = Array.isArray(cart.items) ? cart.items : [];

    state.items = rawItems.map((it) =>
      normalizeCartItem(it, state.paintingMap)
    );

    renderCart();
  } catch (err) {
    if (err.status === 404) {
      // no cart yet → empty
      state.cart = null;
      state.items = [];
      renderCart();
    } else {
      console.error(err);
      showMessage("Failed to load cart. Please refresh.", true);
    }
  }
}

/**
 * Normalize cart item according to your current API:
 * item = { id, cart_id, painting_id, quantity }
 * We use paintingMap to fetch the painting details.
 */
function normalizeCartItem(it, paintingMap) {
  const painting = paintingMap.get(it.painting_id) || {};

  return {
    id: it.id, // cart item id, needed for update/delete
    paintingId: it.painting_id,
    title: painting.title || `Painting #${it.painting_id}`,
    price: Number(painting.price || 0),
    quantity: Number(it.quantity || 1),
    imageUrl: painting.image_url || null,
  };
}

/* ===== Rendering ===== */

function renderCart() {
  const container = els.cartItemsContainer;
  if (!container) return;

  container.innerHTML = "";

  if (!state.items.length) {
    showMessage("Your cart is empty.");
    updateSummary();
    updateCartCountUI(0);
    return;
  }

  els.cartMessage.classList.add("hidden");

  state.items.forEach((item) => {
    const clone = els.cartItemTemplate.content.cloneNode(true);
    const row = clone.querySelector("div");

    const img = row.querySelector(".cart-item-image");
    const titleEl = row.querySelector(".cart-item-title");
    const priceEl = row.querySelector(".cart-item-price");
    const subtotalEl = row.querySelector(".cart-item-subtotal");

    const qtyInput = row.querySelector(".qty-input");
    const qtyIncr = row.querySelector(".qty-incr");
    const qtyDecr = row.querySelector(".qty-decr");
    const removeBtn = row.querySelector(".remove-item");

    img.src = buildImageUrl(item.imageUrl);
    img.alt = item.title;

    titleEl.textContent = item.title;
    priceEl.textContent = `Ksh ${item.price.toLocaleString()}`;
    subtotalEl.textContent = `Subtotal: Ksh ${(item.price * item.quantity).toLocaleString()}`;

    qtyInput.value = item.quantity;

    qtyIncr.addEventListener("click", () => {
      const newQty = item.quantity + 1;
      updateItemQuantity(item, newQty);
    });

    qtyDecr.addEventListener("click", () => {
      const newQty = item.quantity - 1;
      if (newQty < 1) return;
      updateItemQuantity(item, newQty);
    });

    qtyInput.addEventListener("change", () => {
      let newQty = parseInt(qtyInput.value || "1", 10);
      if (isNaN(newQty) || newQty < 1) newQty = 1;
      updateItemQuantity(item, newQty);
    });

    removeBtn.addEventListener("click", () => {
      const ok = window.confirm(`Remove "${item.title}" from cart?`);
      if (!ok) return;
      deleteItem(item);
    });

    container.appendChild(clone);
  });

  updateSummary();
  updateCartCountUI(state.items.length);
}

function showMessage(text, isError = false, hide = false) {
  if (!els.cartMessage) return;
  if (hide) {
    els.cartMessage.classList.add("hidden");
    els.cartMessage.textContent = "";
    return;
  }
  els.cartMessage.textContent = text;
  els.cartMessage.classList.remove("hidden");
  els.cartMessage.classList.toggle("text-red-600", isError);
  els.cartMessage.classList.toggle("text-gray-500", !isError);
}

function updateSummary() {
  const subtotal = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const shipping = 0; // adjust later
  const total = subtotal + shipping;

  if (els.summarySubtotal) {
    els.summarySubtotal.textContent = `Ksh ${subtotal.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (els.summaryShipping) {
    els.summaryShipping.textContent = `Ksh ${shipping.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (els.summaryTotal) {
    els.summaryTotal.textContent = `Ksh ${total.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

function updateCartCountUI(count) {
  if (els.cartCount) {
    els.cartCount.textContent = count;
  }
}

/* ===== Item actions ===== */

async function updateItemQuantity(item, newQty) {
  try {
    await updateCartItem(item.id, newQty, state.authToken);
    item.quantity = newQty;
    renderCart();
  } catch (err) {
    console.error(err);
    const msg =
      (err.data && (err.data.message || err.data.error)) ||
      err.message ||
      "Failed to update quantity.";
    alert(msg);
  }
}

async function deleteItem(item) {
  try {
    await removeCartItem(item.id, state.authToken);
    state.items = state.items.filter((it) => it.id !== item.id);
    renderCart();
  } catch (err) {
    console.error(err);
    const msg =
      (err.data && (err.data.message || err.data.error)) ||
      err.message ||
      "Failed to remove item.";
    alert(msg);
  }
}

/* ===== Summary actions (clear + checkout) ===== */

/* ===== Summary actions (clear + checkout) ===== */

function bindSummaryEvents() {
  if (els.clearCartBtn) {
    els.clearCartBtn.addEventListener("click", async () => {
      if (!state.items.length) return;
      const ok = window.confirm("Clear all items from your cart?");
      if (!ok) return;

      try {
        await clearCart(state.currentUser.id, state.authToken);
        state.items = [];
        renderCart();
      } catch (err) {
        console.error(err);
        const msg =
          (err.data && (err.data.message || err.data.error)) ||
          err.message ||
          "Failed to clear cart.";
        alert(msg);
      }
    });
  }

  if (els.checkoutBtn) {
    els.checkoutBtn.addEventListener("click", (e) => {
      // Because it's an <a>, prevent default navigation so we control it
      e.preventDefault();

      if (!state.items.length) {
        alert("Your cart is empty.");
        return;
      }

      // Ensure user is logged in
      const rawUser = localStorage.getItem("auth_user");
      const token = localStorage.getItem("auth_token");
      if (!rawUser || !token) {
        window.location.href = "./login.html";
        return;
      }

      // Go to checkout page
      window.location.href = "./checkout.html";
    });
  }
}

/* ===== Helpers ===== */

function buildImageUrl(imageUrl) {
  if (!imageUrl) {
    return "https://via.placeholder.com/150x150?text=No+Image";
  }
  if (imageUrl.startsWith("http")) return imageUrl;
  return API_BASE_URL + imageUrl;
}