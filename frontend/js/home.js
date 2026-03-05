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
  verifyPaintingCertificate,
} from "./api.js";

const state = {
  paintings: [],
  categories: [],
  selectedCategoryId: "all",
  currentUser: null,
  authToken: null,
  cartCount: 0,
  wishlist: new Set(),
  currentPainting: null,
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  // Main list + filters
  els.cartCount = document.getElementById("cart-count");
  els.paintingsContainer = document.getElementById("paintings-container");
  els.categoryFilters = document.getElementById("category-filters");
  els.message = document.getElementById("paintings-message");
  els.cardTemplate = document.getElementById("painting-card-template");

  // Painting Modal elements
  els.modal = document.getElementById("painting-modal");
  els.modalImage = document.getElementById("modal-main-image");
  els.modalTitle = document.getElementById("modal-title");
  els.modalArtist = document.getElementById("modal-artist");
  els.modalDesc = document.getElementById("modal-desc");
  els.modalPrice = document.getElementById("modal-price");
  els.modalWishlistBtn = document.getElementById("modal-wishlist-btn");
  els.modalClose = document.getElementById("modal-close");
  els.modalCertificate = document.getElementById("modal-certificate");

  // Verification Modal elements
  els.verifyModal = document.getElementById("verification-modal");
  els.verifyContent = document.getElementById("verification-content");
  els.verifyClose = document.getElementById("verify-modal-close");

  loadAuthFromStorage();
  initModalEvents();
  initVerificationModalEvents();
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
    const items = Array.isArray(cart.items) ? cart.items : [];
    state.cartCount = items.length;
  } catch (err) {
    if (err.status === 404) {
      state.cartCount = 0;
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
    const items = Array.isArray(wishlist.items) ? wishlist.items : [];
    state.wishlist = new Set(items.map((p) => p.id));
  } catch (err) {
    if (err.status === 404) {
      state.wishlist = new Set();
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
      () => `<div class="animate-pulse bg-gray-200 rounded-lg h-64"></div>`
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
  const base = "px-3 py-1 rounded-full border text-xs md:text-sm transition cursor-pointer";
  const active = "bg-indigo-600 text-white border-indigo-600";
  const inactive = "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";

  // "All" button
  const allBtn = document.createElement("button");
  allBtn.textContent = "All";
  allBtn.dataset.categoryId = "all";
  allBtn.className = base + " " + (state.selectedCategoryId === "all" ? active : inactive);
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
      base + " " + (String(state.selectedCategoryId) === String(cat.id) ? active : inactive);
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
    const certBadge = clone.querySelector(".cert-badge");
    const verifyBtn = clone.querySelector(".verify-btn");
    const certSection = clone.querySelector(".cert-section");

    const imageSrc = buildImageUrl(p.image_url);
    img.src = imageSrc;
    img.alt = p.title || "Painting";

    titleEl.textContent = p.title || "Untitled";

    const artistPart = p.artist_name ? p.artist_name : "";
    const catName = categoryMap.get(p.category_id) || "";
    const subtitle = [artistPart, catName].filter(Boolean).join(" • ");
    subEl.textContent = subtitle || "Original artwork";

    priceEl.textContent = `Ksh ${Number(p.price).toLocaleString()}`;

    // Certificate Badge - show if painting has IPFS CID
    if (certBadge && p.ipfs_cid) {
      certBadge.classList.remove("hidden");
    }

    // Verify Button - show if painting has certificate
    if (verifyBtn && p.ipfs_cid) {
      verifyBtn.classList.remove("hidden");
      verifyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        // Navigate to verify page
        window.location.href = `./verify.html?painting_id=${p.id}`;
      });
    }

    // Certificate section at bottom of card
    if (certSection && p.ipfs_cid) {
      certSection.classList.remove("hidden");
      certSection.innerHTML = `
        <div class="px-3 py-2 bg-green-50 border-t border-green-100">
          <a 
            href="./verify.html?painting_id=${p.id}" 
            class="flex items-center justify-between text-xs text-green-700 hover:text-green-800"
            onclick="event.stopPropagation()"
          >
            <span class="flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              Hakika ya Kienyeji
            </span>
            <span class="underline">Verify →</span>
          </a>
        </div>
      `;
    }

    // Card click = open modal (unless click on buttons/links)
    card.addEventListener("click", (e) => {
      if (
        e.target.closest(".wishlist-btn") ||
        e.target.closest(".add-cart-btn") ||
        e.target.closest(".verify-btn") ||
        e.target.closest("a")
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

    // Wishlist
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

  const qty = typeof qtyOverride === "number" && qtyOverride > 0 ? qtyOverride : 1;

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
      await removeWishlistItem(state.currentUser.id, painting.id, state.authToken);
      state.wishlist.delete(painting.id);
      updateWishlistButtonUI(btn, false);
    } else {
      await addWishlistItem(state.currentUser.id, painting.id, state.authToken);
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

/* ===== Painting Modal logic ===== */

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
    els.modalArtist.textContent = p.artist_name ? `By ${p.artist_name}` : "Original artwork";
  }
  if (els.modalDesc) {
    els.modalDesc.textContent = p.description || p.short_desc || "A beautiful original artwork.";
  }
  if (els.modalPrice) {
    els.modalPrice.textContent = `Ksh ${Number(p.price).toLocaleString()}`;
  }

  if (els.modalWishlistBtn) {
    const isWishlisted = state.wishlist?.has?.(p.id);
    updateWishlistButtonUI(els.modalWishlistBtn, !!isWishlisted);
  }

  // Render certificate info in modal
  renderModalCertificateInfo(p);

  // Reset quantity
  const qtyInput = document.getElementById("qty");
  if (qtyInput) qtyInput.value = 1;

  els.modal.classList.remove("hidden");
  els.modal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function renderModalCertificateInfo(painting) {
  if (!els.modalCertificate) return;

  if (painting.ipfs_cid) {
    // Has certificate - show verification link
    els.modalCertificate.innerHTML = `
      <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="flex-1">
            <h4 class="font-semibold text-green-800 text-sm">Hakika ya Kienyeji ✅</h4>
            <p class="text-xs text-green-700 mt-1">
              This artwork has a blockchain-verified certificate of authenticity.
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <a 
                href="./verify.html?painting_id=${painting.id}"
                class="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                View Certificate
              </a>
              <button 
                type="button"
                onclick="window.open('./verify.html?painting_id=${painting.id}', '_blank')"
                class="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-green-300 text-green-700 text-xs rounded-lg hover:bg-green-50 transition"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // No certificate
    els.modalCertificate.innerHTML = `
      <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div class="flex items-center gap-2 text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="text-xs">Certificate pending verification</span>
        </div>
      </div>
    `;
  }
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

  // Add to cart from modal
  const addToCartModal = document.getElementById("add-to-cart-modal");
  if (addToCartModal) {
    addToCartModal.addEventListener("click", () => {
      if (!state.currentPainting) return;
      const qtyInput = document.getElementById("qty");
      const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
      handleAddToCart(state.currentPainting, qty);
    });
  }

  // Buy now button
  const buyNowBtn = document.getElementById("buy-now");
  if (buyNowBtn) {
    buyNowBtn.addEventListener("click", async () => {
      if (!state.currentPainting) return;
      const qtyInput = document.getElementById("qty");
      const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
      await handleAddToCart(state.currentPainting, qty);
      window.location.href = "./cart.html";
    });
  }

  // Quantity controls
  const qtyDecr = document.getElementById("qty-decr");
  const qtyIncr = document.getElementById("qty-incr");
  const qtyInput = document.getElementById("qty");

  if (qtyDecr && qtyInput) {
    qtyDecr.addEventListener("click", () => {
      const current = parseInt(qtyInput.value, 10) || 1;
      qtyInput.value = Math.max(1, current - 1);
    });
  }

  if (qtyIncr && qtyInput) {
    qtyIncr.addEventListener("click", () => {
      const current = parseInt(qtyInput.value, 10) || 1;
      qtyInput.value = current + 1;
    });
  }

  // Escape key handler
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (els.verifyModal && !els.verifyModal.classList.contains("hidden")) {
        closeVerificationModal();
      } else if (els.modal && !els.modal.classList.contains("hidden")) {
        closePaintingModal();
      }
    }
  });
}

/* ===== Verification Modal (Quick Verify without leaving page) ===== */

function initVerificationModalEvents() {
  if (els.verifyClose) {
    els.verifyClose.addEventListener("click", closeVerificationModal);
  }

  if (els.verifyModal) {
    els.verifyModal.addEventListener("click", (e) => {
      if (e.target === els.verifyModal) {
        closeVerificationModal();
      }
    });
  }
}

async function openVerificationModal(paintingId) {
  if (!els.verifyModal || !els.verifyContent) return;

  // Show modal with loading state
  els.verifyModal.classList.remove("hidden");
  els.verifyModal.classList.add("flex");
  document.body.style.overflow = "hidden";

  els.verifyContent.innerHTML = `
    <div class="flex flex-col items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      <p class="mt-4 text-gray-600">Verifying certificate on IPFS...</p>
      <p class="text-xs text-gray-400 mt-2">Fetching from blockchain</p>
    </div>
  `;

  try {
    const result = await verifyPaintingCertificate(paintingId);
    renderVerificationResult(result, paintingId);
  } catch (err) {
    console.error("Verification failed:", err);
    renderVerificationError(
      err.data?.message || err.message || "Verification failed. Please try again."
    );
  }
}

function renderVerificationResult(result, paintingId) {
  if (!els.verifyContent) return;

  const isValid = result.valid;
  const cert = result.certificate || {};

  els.verifyContent.innerHTML = `
    <div class="space-y-6">
      <!-- Status Header -->
      <div class="text-center ${isValid ? "bg-green-50" : "bg-red-50"} p-6 rounded-xl">
        <div class="mx-auto w-16 h-16 ${isValid ? "bg-green-100" : "bg-red-100"} rounded-full flex items-center justify-center mb-4">
          ${isValid
            ? `<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>`
            : `<svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>`
          }
        </div>
        <h3 class="text-xl font-bold ${isValid ? "text-green-800" : "text-red-800"}">
          ${isValid ? "✅ Authentic & Verified" : "❌ Verification Failed"}
        </h3>
        <p class="text-sm ${isValid ? "text-green-600" : "text-red-600"} mt-2">
          ${result.message || (isValid ? "This artwork is authentic." : "Certificate validation failed.")}
        </p>
      </div>

      <!-- Certificate Summary -->
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="bg-gray-50 p-3 rounded-lg">
          <span class="text-gray-500 text-xs">Title</span>
          <p class="font-medium">${result.title || cert.title || "N/A"}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
          <span class="text-gray-500 text-xs">Artist</span>
          <p class="font-medium">${result.artist || cert.artist_name || "N/A"}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
          <span class="text-gray-500 text-xs">Materials</span>
          <p class="font-medium">${result.materials || cert.materials || "N/A"}</p>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
          <span class="text-gray-500 text-xs">Origin</span>
          <p class="font-medium">${result.location || cert.location || "Kenya"}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <a 
          href="./verify.html?painting_id=${paintingId}"
          class="flex-1 text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          View Full Certificate
        </a>
        <button 
          onclick="window.closeVerificationModal()"
          class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm"
        >
          Close
        </button>
      </div>
    </div>
  `;
}

function renderVerificationError(message) {
  if (!els.verifyContent) return;

  els.verifyContent.innerHTML = `
    <div class="text-center py-8">
      <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h3 class="text-xl font-bold text-red-800 mb-2">Verification Failed</h3>
      <p class="text-gray-600 mb-6">${message}</p>
      <button 
        onclick="window.closeVerificationModal()"
        class="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
      >
        Close
      </button>
    </div>
  `;
}

function closeVerificationModal() {
  if (!els.verifyModal) return;
  els.verifyModal.classList.add("hidden");
  els.verifyModal.classList.remove("flex");
  document.body.style.overflow = "";
}

/* ===== Helpers ===== */

function buildImageUrl(imageUrl) {
  if (!imageUrl) {
    return "https://via.placeholder.com/300x200?text=No+Image";
  }
  if (imageUrl.startsWith("http")) return imageUrl;
  return API_BASE_URL + imageUrl;
}

// Make functions available globally for onclick handlers
window.closeVerificationModal = closeVerificationModal;
window.openVerificationModal = openVerificationModal;

window.copyCID = function(cid) {
  navigator.clipboard.writeText(cid).then(() => {
    alert("✅ Certificate ID copied!");
  }).catch(err => {
    console.error("Failed to copy:", err);
  });
};