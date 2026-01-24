// js/home.js
import {
  API_BASE_URL,
  getAllPaintings,
  getAllCategories,
  getCart,
  addCartItem,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
} from "./api.js";

const state = {
  paintings: [],
  categories: [],
  selectedCategoryId: "all",
  currentUser: null,
  authToken: null,
  cartCount: 0,
  wishlist: new Set(), // painting IDs
  currentPainting: null, // for modal
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  // Main list + filters
  els.cartCount = document.getElementById("cart-count");
  els.paintingsContainer = document.getElementById("paintings-container");
  els.categoryFilters = document.getElementById("category-filters");
  els.cartCount = document.getElementById("cart-count");
  els.message = document.getElementById("paintings-message");
  els.cardTemplate = document.getElementById("painting-card-template");

  // Modal elements (ensure these exist in your HTML)
  els.modal = document.getElementById("painting-modal");
  els.modalImage = document.getElementById("modal-main-image");
  els.modalTitle = document.getElementById("modal-title");
  els.modalArtist = document.getElementById("modal-artist");
  els.modalDesc = document.getElementById("modal-desc");
  els.modalPrice = document.getElementById("modal-price");
  els.modalWishlistBtn = document.getElementById("modal-wishlist-btn");
  els.modalClose = document.getElementById("modal-close");

  loadAuthFromStorage();
  initModalEvents();
  initHome();
});


/* ===== Auth & initial sync ===== */


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

async function initHome() {
  showLoadingSkeletons();
  try {
    const [categories, paintings] = await Promise.all([
      getAllCategories(),
      getAllPaintings(),
    ]);

    state.categories = categories || [];
    state.paintings = paintings || [];

    await syncCartFromServer();
    await syncWishlistFromServer();

    renderCategoryFilters();
    renderPaintings(getFilteredPaintings());
    updateCartCountUI();
  } catch (err) {
    console.error(err);
    showMessage("Failed to load paintings. Please refresh.", true);
  }
}

/* ===== Cart sync ===== */

async function syncCartFromServer() {
  if (!state.currentUser || !state.authToken) {
    state.cartCount = 0;
    updateCartCountUI();
    return;
  }

  try {
    const cart = await getCart(state.currentUser.id, state.authToken);
    // Adjust if your CartService.get_cart returns slightly different structure
    const items = Array.isArray(cart.items) ? cart.items : [];
    state.cartCount = items.length;
  } catch (err) {
    if (err.status === 404) {
      state.cartCount = 0; // no cart yet
    } else {
      console.error("Error loading cart:", err);
    }
  }
  updateCartCountUI();
}

function updateCartCountUI() {
  if (els.cartCount) {
    els.cartCount.textContent = state.cartCount;
  }
}

/* ===== Wishlist sync ===== */

async function syncWishlistFromServer() {
  if (!state.currentUser || !state.authToken) {
    state.wishlist = new Set();
    return;
  }

  try {
    const wishlist = await getWishlist(state.currentUser.id, state.authToken);
    // Assuming WishlistService.get_wishlist returns { items: [paintingDicts...] }
    const items = Array.isArray(wishlist.items) ? wishlist.items : [];
    state.wishlist = new Set(items.map((p) => p.id));
  } catch (err) {
    if (err.status === 404) {
      state.wishlist = new Set(); // no wishlist yet
    } else {
      console.error("Error loading wishlist:", err);
    }
  }
}

/* ===== Rendering ===== */

function showLoadingSkeletons() {
  if (!els.paintingsContainer) return;
  els.message?.classList.add("hidden");
  els.paintingsContainer.innerHTML = Array.from({ length: 8 })
    .map(
      () =>
        `<div class="animate-pulse bg-gray-200 rounded-lg h-64"></div>`
    )
    .join("");
}

function showMessage(text, isError = false) {
  if (!els.message) return;
  els.message.textContent = text;
  els.message.classList.remove("hidden");
  els.message.classList.toggle("text-red-600", isError);
  els.message.classList.toggle("text-gray-500", !isError);
}

function renderCategoryFilters() {
  const container = els.categoryFilters;
  if (!container) return;

  container.innerHTML = "";
  const base =
    "px-3 py-1 rounded-full border text-xs md:text-sm transition cursor-pointer";
  const active = "bg-indigo-600 text-white border-indigo-600";
  const inactive = "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";

  // "All" button
  const allBtn = document.createElement("button");
  allBtn.textContent = "All";
  allBtn.dataset.categoryId = "all";
  allBtn.className =
    base +
    " " +
    (state.selectedCategoryId === "all" ? active : inactive);
  allBtn.addEventListener("click", () => {
    state.selectedCategoryId = "all";
    renderCategoryFilters();
    renderPaintings(getFilteredPaintings());
  });
  container.appendChild(allBtn);

  state.categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = cat.name || `Category #${cat.id}`;
    btn.dataset.categoryId = String(cat.id);
    btn.className =
      base +
      " " +
      (String(state.selectedCategoryId) === String(cat.id)
        ? active
        : inactive);
    btn.addEventListener("click", () => {
      state.selectedCategoryId = String(cat.id);
      renderCategoryFilters();
      renderPaintings(getFilteredPaintings());
    });
    container.appendChild(btn);
  });
}

function getFilteredPaintings() {
  if (state.selectedCategoryId === "all") {
    return state.paintings;
  }
  return state.paintings.filter(
    (p) => String(p.category_id) === String(state.selectedCategoryId)
  );
}

function renderPaintings(paintings) {
  const container = els.paintingsContainer;
  if (!container) return;

  container.innerHTML = "";
  if (!paintings || paintings.length === 0) {
    showMessage("No paintings found for this category yet.");
    return;
  } else {
    els.message?.classList.add("hidden");
  }

  const tpl = els.cardTemplate;
  if (!tpl) return;

  const categoryMap = new Map(
    (state.categories || []).map((c) => [c.id, c.name])
  );

  paintings.forEach((p) => {
    const clone = tpl.content.cloneNode(true);
    const card = clone.querySelector(".painting-card");
    const img = clone.querySelector(".painting-image");
    const titleEl = clone.querySelector(".painting-title");
    const subEl = clone.querySelector(".painting-sub");
    const priceEl = clone.querySelector(".painting-price");
    const addBtn = clone.querySelector(".add-cart-btn");
    const wishlistBtn = clone.querySelector(".wishlist-btn");

    const imageSrc = buildImageUrl(p.image_url);
    img.src = imageSrc;
    img.alt = p.title || "Painting";

    titleEl.textContent = p.title || "Untitled";

    const artistPart = p.artist_name ? p.artist_name : "";
    const catName = categoryMap.get(p.category_id) || "";
    const subtitle = [artistPart, catName].filter(Boolean).join(" • ");
    subEl.textContent = subtitle || "Original artwork";

    priceEl.textContent = `Ksh ${Number(p.price).toLocaleString()}`;

    // Card click = open modal (unless click on wishlist or add)
    card.addEventListener("click", (e) => {
      if (
        e.target.closest(".wishlist-btn") ||
        e.target.closest(".add-cart-btn")
      ) {
        return;
      }
      openPaintingModal(p);
    });

    // Add-to-cart
    if (addBtn) {
  addBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleAddToCart(p);
  });
}

    // Wishlist (card)
    if (wishlistBtn) {
      const isWishlisted = state.wishlist?.has?.(p.id);
      updateWishlistButtonUI(wishlistBtn, !!isWishlisted);

      wishlistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleToggleWishlist(p, wishlistBtn);
      });
    }

    container.appendChild(clone);
  });
}

/* ===== Cart handlers ===== */


async function handleAddToCart(painting, qtyOverride) {
  if (!state.currentUser || !state.authToken) {
    window.location.href = "./login.html";
    return;
  }

  const qty =
    typeof qtyOverride === "number" && qtyOverride > 0
      ? qtyOverride
      : 1;

  try {
    await addCartItem(state.currentUser.id, painting.id, qty, state.authToken);
    await syncCartFromServer();
    alert(`"${painting.title}" added to cart.`);
  } catch (err) {
    console.error(err);
    const msg =
      (err.data && (err.data.message || err.data.error)) ||
      err.message ||
      "Failed to add to cart.";
    alert(msg);
  }
}

/* ===== Wishlist handlers ===== */

async function handleToggleWishlist(painting, btn) {
  if (!state.currentUser || !state.authToken) {
    window.location.href = "./login.html";
    return;
  }

  const isOn = state.wishlist.has(painting.id);

  try {
    if (isOn) {
      await removeWishlistItem(
        state.currentUser.id,
        painting.id,
        state.authToken
      );
      state.wishlist.delete(painting.id);
      updateWishlistButtonUI(btn, false);
    } else {
      await addWishlistItem(
        state.currentUser.id,
        painting.id,
        state.authToken
      );
      state.wishlist.add(painting.id);
      updateWishlistButtonUI(btn, true);
    }
  } catch (err) {
    console.error(err);
    const msg =
      (err.data && (err.data.message || err.data.error)) ||
      err.message ||
      "Failed to update wishlist.";
    alert(msg);
  }
}

function updateWishlistButtonUI(btn, isOn) {
  if (!btn) return;
  if (isOn) {
    btn.textContent = "♥";
    btn.classList.remove("text-gray-400");
    btn.classList.add("text-red-500");
  } else {
    btn.textContent = "♡";
    btn.classList.remove("text-red-500");
    btn.classList.add("text-gray-400");
  }
}

/* ===== Modal logic ===== */

function openPaintingModal(p) {
  state.currentPainting = p;
  if (!els.modal) return;

  if (els.modalImage) {
    els.modalImage.src = buildImageUrl(p.image_url);
  }
  if (els.modalTitle) {
    els.modalTitle.textContent = p.title || "Untitled";
  }
  if (els.modalArtist) {
    els.modalArtist.textContent = p.artist_name
      ? `By ${p.artist_name}`
      : "Original artwork";
  }
  if (els.modalDesc) {
    els.modalDesc.textContent = p.description || p.short_desc || "";
  }
  if (els.modalPrice) {
    els.modalPrice.textContent = `Ksh ${Number(p.price).toLocaleString()}`;
  }

  if (els.modalWishlistBtn) {
    const isWishlisted = state.wishlist?.has?.(p.id);
    updateWishlistButtonUI(els.modalWishlistBtn, !!isWishlisted);
  }

  els.modal.classList.remove("hidden");
  els.modal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closePaintingModal() {
  if (!els.modal) return;
  els.modal.classList.add("hidden");
  els.modal.classList.remove("flex");
  document.body.style.overflow = "";
  state.currentPainting = null;
}

function initModalEvents() {
  if (els.modalClose) {
    els.modalClose.addEventListener("click", closePaintingModal);
  }

  if (els.modal) {
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) {
        closePaintingModal();
      }
    });
  }

  if (els.modalWishlistBtn) {
    els.modalWishlistBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!state.currentPainting) return;
      handleToggleWishlist(state.currentPainting, els.modalWishlistBtn);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.modal && !els.modal.classList.contains("hidden")) {
      closePaintingModal();
    }
  });
}

/* ===== Helpers ===== */

function buildImageUrl(imageUrl) {
  if (!imageUrl) {
    return "https://via.placeholder.com/300x200?text=No+Image";
  }
  if (imageUrl.startsWith("http")) return imageUrl;
  return API_BASE_URL + imageUrl;
}