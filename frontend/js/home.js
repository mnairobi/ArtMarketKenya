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
  getPaintingReviews,
  createReview,
  updateReview,
  deleteReview,
} from "./api.js";

/* ========== State ========== */
const state = {
  paintings: [],
  categories: [],
  selectedCategoryId: "all",
  currentUser: null,
  authToken: null,
  cartCount: 0,
  wishlist: new Set(),
  currentPainting: null,
  currentReviews: [],
  selectedRating: 0,
  editingReviewId: null,
  viewMode: "grid", // "grid" or "masonry"
  sortBy: "newest",
};

const els = {};

/* ========== Init ========== */
document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  loadAuthFromStorage();
  initEventListeners();
  initHome();
});

function cacheElements() {
  // Cart & Wishlist counts
  els.cartCount = document.getElementById("cart-count");
  els.wishlistCount = document.getElementById("wishlist-count");
  
  // Gallery
  els.paintingsContainer = document.getElementById("paintings-container");
  els.categoryFilters = document.getElementById("category-filters");
  els.message = document.getElementById("paintings-message");
  els.cardTemplate = document.getElementById("painting-card-template");
  els.loadMoreContainer = document.getElementById("load-more-container");
  
  // Painting Modal
  els.modal = document.getElementById("painting-modal");
  els.modalImage = document.getElementById("modal-main-image");
  els.modalTitle = document.getElementById("modal-title");
  els.modalArtist = document.getElementById("modal-artist");
  els.modalDesc = document.getElementById("modal-desc");
  els.modalPrice = document.getElementById("modal-price");
  els.modalCategory = document.getElementById("modal-category");
  els.modalCertBadge = document.getElementById("modal-cert-badge");
  els.modalDimensions = document.getElementById("modal-dimensions");
  els.modalMedium = document.getElementById("modal-medium");
  els.modalYear = document.getElementById("modal-year");
  els.modalStyle = document.getElementById("modal-style");
  els.modalWishlistBtn = document.getElementById("modal-wishlist-btn");
  els.modalClose = document.getElementById("modal-close");
  els.modalCertificate = document.getElementById("modal-certificate");
  
  // Reviews
  els.modalReviews = document.getElementById("modal-reviews");
  els.reviewsSummary = document.getElementById("reviews-summary");
  els.reviewsList = document.getElementById("reviews-list");
  els.reviewsCount = document.getElementById("reviews-count");
  els.reviewFormContainer = document.getElementById("review-form-container");
  els.reviewLoginPrompt = document.getElementById("review-login-prompt");
  els.reviewForm = document.getElementById("review-form");
  els.starRating = document.getElementById("star-rating");
  els.reviewRating = document.getElementById("review-rating");
  els.reviewComment = document.getElementById("review-comment");
  els.submitReview = document.getElementById("submit-review");
  
  // Verification Modal
  els.verifyModal = document.getElementById("verification-modal");
  els.verifyContent = document.getElementById("verification-content");
  els.verifyClose = document.getElementById("verify-modal-close");
  
  // Search
  els.searchOverlay = document.getElementById("search-overlay");
  els.searchInput = document.getElementById("search-input");
  els.searchToggle = document.getElementById("search-toggle");
  els.searchClose = document.getElementById("search-close");
  
  // Mobile menu
  els.mobileMenu = document.getElementById("mobile-menu");
  els.mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  
  // User dropdown
  els.userDropdown = document.getElementById("user-dropdown");
  els.userMenuToggle = document.getElementById("user-menu-toggle");
  
  // View & Sort
  els.viewGrid = document.getElementById("view-grid");
  els.viewMasonry = document.getElementById("view-masonry");
  els.sortSelect = document.getElementById("sort-select");
  
  // Toast
  els.toastContainer = document.getElementById("toast-container");
}

function initEventListeners() {
  // Modal events
  initModalEvents();
  initVerificationModalEvents();
  initReviewEvents();
  
  // Search
  els.searchToggle?.addEventListener("click", openSearch);
  els.searchClose?.addEventListener("click", closeSearch);
  els.searchOverlay?.addEventListener("click", (e) => {
    if (e.target === els.searchOverlay) closeSearch();
  });
  
  // Mobile menu
  els.mobileMenuToggle?.addEventListener("click", toggleMobileMenu);
  
  // User dropdown
  els.userMenuToggle?.addEventListener("click", toggleUserDropdown);
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#user-menu-container")) {
      els.userDropdown?.classList.add("hidden");
    }
  });
  
  // View toggles
  els.viewGrid?.addEventListener("click", () => setViewMode("grid"));
  els.viewMasonry?.addEventListener("click", () => setViewMode("masonry"));
  
  // Sort
  els.sortSelect?.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderPaintings(getSortedPaintings(getFilteredPaintings()));
  });
  
  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSearch();
      closeVerificationModal();
      closePaintingModal();
      els.userDropdown?.classList.add("hidden");
      els.mobileMenu?.classList.add("hidden");
    }
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

/* ========== Init Home ========== */
async function initHome() {
  showLoadingSkeletons();
  
  try {
    const [categories, paintings] = await Promise.all([
      getAllCategories(),
      getAllPaintings(),
    ]);

    state.categories = categories || [];
    state.paintings = paintings || [];

    // DEBUG: Log the first painting to see its structure
    console.log("First painting data:", paintings[0]);
    console.log("Available fields:", Object.keys(paintings[0] || {}));

    await Promise.all([
      syncCartFromServer(),
      syncWishlistFromServer(),
    ]);

    renderCategoryFilters();
    renderPaintings(getSortedPaintings(getFilteredPaintings()));
    updateCartCountUI();
    updateWishlistCountUI();
    
  } catch (err) {
    console.error(err);
    showMessage("Failed to load paintings. Please refresh the page.", true);
  }
}

/* ========== Cart Sync ========== */
async function syncCartFromServer() {
  if (!state.currentUser || !state.authToken) {
    state.cartCount = 0;
    return;
  }

  try {
    const cart = await getCart(state.currentUser.id, state.authToken);
    const items = Array.isArray(cart.items) ? cart.items : [];
    state.cartCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  } catch (err) {
    if (err.status === 404) {
      state.cartCount = 0;
    } else {
      console.error("Error loading cart:", err);
    }
  }
}

function updateCartCountUI() {
  if (els.cartCount) {
    els.cartCount.textContent = state.cartCount;
    els.cartCount.classList.toggle("hidden", state.cartCount === 0);
  }
}

/* ========== Wishlist Sync ========== */
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

function updateWishlistCountUI() {
  if (els.wishlistCount) {
    const count = state.wishlist.size;
    els.wishlistCount.textContent = count;
    els.wishlistCount.classList.toggle("hidden", count === 0);
  }
}

/* ========== Rendering ========== */
function showLoadingSkeletons() {
  if (!els.paintingsContainer) return;
  els.message?.classList.add("hidden");
  
  const skeletonCount = 8;
  els.paintingsContainer.innerHTML = Array.from({ length: skeletonCount })
    .map(() => `
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div class="aspect-[4/5] skeleton"></div>
        <div class="p-4 space-y-3">
          <div class="h-4 skeleton rounded w-3/4"></div>
          <div class="h-3 skeleton rounded w-1/2"></div>
          <div class="flex justify-between items-center pt-2">
            <div class="h-5 skeleton rounded w-1/3"></div>
            <div class="h-8 skeleton rounded w-16"></div>
          </div>
        </div>
      </div>
    `)
    .join("");
}

function showMessage(text, isError = false) {
  if (!els.message) return;
  
  const messageContent = els.message.querySelector("p.text-lg");
  if (messageContent) {
    messageContent.textContent = text;
  }
  
  els.message.classList.remove("hidden");
  els.message.classList.toggle("text-red-600", isError);
}

function renderCategoryFilters() {
  const container = els.categoryFilters;
  if (!container) return;

  container.innerHTML = "";

  const createButton = (id, name, isActive) => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.dataset.categoryId = id;
    btn.className = `px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
      isActive
        ? "bg-gallery-900 text-white shadow-lg"
        : "bg-white text-gallery-600 border border-gallery-200 hover:border-gallery-400 hover:text-gallery-900"
    }`;
    btn.addEventListener("click", () => {
      state.selectedCategoryId = id;
      renderCategoryFilters();
      renderPaintings(getSortedPaintings(getFilteredPaintings()));
    });
    return btn;
  };

  // "All" button
  container.appendChild(createButton("all", "All Artworks", state.selectedCategoryId === "all"));

  // Category buttons
  state.categories.forEach((cat) => {
    const isActive = String(state.selectedCategoryId) === String(cat.id);
    container.appendChild(createButton(String(cat.id), cat.name || `Category ${cat.id}`, isActive));
  });
}

function getFilteredPaintings() {
  if (state.selectedCategoryId === "all") {
    return [...state.paintings];
  }
  return state.paintings.filter(
    (p) => String(p.category_id) === String(state.selectedCategoryId)
  );
}

function getSortedPaintings(paintings) {
  const sorted = [...paintings];
  
  switch (state.sortBy) {
    case "price-low":
      sorted.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case "price-high":
      sorted.sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case "popular":
      sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case "newest":
    default:
      sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      break;
  }
  
  return sorted;
}

function renderPaintings(paintings) {
  const container = els.paintingsContainer;
  if (!container) return;

  container.innerHTML = "";

  if (!paintings || paintings.length === 0) {
    showMessage("No artworks found in this category.");
    els.loadMoreContainer?.classList.add("hidden");
    return;
  }

  els.message?.classList.add("hidden");

  // Set grid/masonry classes
  if (state.viewMode === "masonry") {
    container.className = "masonry-grid";
  } else {
    container.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";
  }

  const tpl = els.cardTemplate;
  if (!tpl) return;

  const categoryMap = new Map(state.categories.map((c) => [c.id, c.name]));

  paintings.forEach((p, index) => {
    const clone = tpl.content.cloneNode(true);
    const card = clone.querySelector(".painting-card");
    const img = clone.querySelector(".painting-image");
    const titleEl = clone.querySelector(".painting-title");
    const artistEl = clone.querySelector(".painting-artist");
    const priceEl = clone.querySelector(".painting-price");
    const addBtn = clone.querySelector(".add-cart-btn");
    const wishlistBtn = clone.querySelector(".wishlist-btn");
    const quickViewBtn = clone.querySelector(".quick-view-btn");
    const certBadge = clone.querySelector(".cert-badge");
    const newBadge = clone.querySelector(".new-badge");
    const verifyBtn = clone.querySelector(".verify-btn");

    // Add masonry class if needed
    if (state.viewMode === "masonry") {
      card.classList.add("masonry-item");
    }

    // Image
    const imageSrc = buildImageUrl(p.image_url);
    img.src = imageSrc;
    img.alt = p.title || "Artwork";
    img.addEventListener("load", () => img.classList.add("loaded"));

    // Title & Artist
    titleEl.textContent = p.title || "Untitled";

    // Price
    priceEl.textContent = formatPrice(p.price);

    // Certificate badge
    if (p.ipfs_cid && certBadge) {
      certBadge.classList.remove("hidden");
    }

    // New badge (show for items created in last 7 days)
    const isNew = p.created_at && isWithinDays(p.created_at, 7);
    if (isNew && newBadge) {
      newBadge.classList.remove("hidden");
    }

    // Verify button
    if (p.ipfs_cid && verifyBtn) {
      verifyBtn.classList.remove("hidden");
      verifyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = `./verify.html?painting_id=${p.id}`;
      });
    }

    // Wishlist state
    const isWishlisted = state.wishlist.has(p.id);
    updateWishlistButtonUI(wishlistBtn, isWishlisted);

    // Event listeners
    card.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      openPaintingModal(p);
    });

    quickViewBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      openPaintingModal(p);
    });

    addBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleAddToCart(p);
    });

    wishlistBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleToggleWishlist(p, wishlistBtn);
    });

    // Staggered animation
    card.style.animationDelay = `${index * 50}ms`;
    card.classList.add("animate-fade-in");

    container.appendChild(clone);
  });

  // Show load more if there are many paintings
  if (paintings.length >= 12) {
    els.loadMoreContainer?.classList.remove("hidden");
  } else {
    els.loadMoreContainer?.classList.add("hidden");
  }
}

/* ========== View Mode ========== */
function setViewMode(mode) {
  state.viewMode = mode;
  
  // Update button states
  if (mode === "grid") {
    els.viewGrid?.classList.add("bg-gallery-900", "text-white");
    els.viewGrid?.classList.remove("hover:bg-gallery-100");
    els.viewMasonry?.classList.remove("bg-gallery-900", "text-white");
    els.viewMasonry?.classList.add("hover:bg-gallery-100");
  } else {
    els.viewMasonry?.classList.add("bg-gallery-900", "text-white");
    els.viewMasonry?.classList.remove("hover:bg-gallery-100");
    els.viewGrid?.classList.remove("bg-gallery-900", "text-white");
    els.viewGrid?.classList.add("hover:bg-gallery-100");
  }
  
  renderPaintings(getSortedPaintings(getFilteredPaintings()));
}

/* ========== Cart Handlers ========== */
async function handleAddToCart(painting, qtyOverride = 1) {
  if (!state.currentUser || !state.authToken) {
    showToast("Please sign in to add items to cart", "info");
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1500);
    return;
  }

  try {
    await addCartItem(state.currentUser.id, painting.id, qtyOverride, state.authToken);
    state.cartCount += qtyOverride;
    updateCartCountUI();
    showToast(`"${painting.title}" added to cart`, "success");
  } catch (err) {
    console.error(err);
    const msg = err.data?.message || err.data?.error || err.message || "Failed to add to cart";
    showToast(msg, "error");
  }
}

/* ========== Wishlist Handlers ========== */
async function handleToggleWishlist(painting, btn) {
  if (!state.currentUser || !state.authToken) {
    showToast("Please sign in to save artworks", "info");
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1500);
    return;
  }

  const isOn = state.wishlist.has(painting.id);

  // Optimistic update
  if (isOn) {
    state.wishlist.delete(painting.id);
  } else {
    state.wishlist.add(painting.id);
  }
  updateWishlistButtonUI(btn, !isOn);
  updateWishlistCountUI();

  try {
    if (isOn) {
      await removeWishlistItem(state.currentUser.id, painting.id, state.authToken);
      showToast("Removed from saved artworks", "success");
    } else {
      await addWishlistItem(state.currentUser.id, painting.id, state.authToken);
      showToast("Added to saved artworks", "success");
    }
  } catch (err) {
    // Revert on error
    if (isOn) {
      state.wishlist.add(painting.id);
    } else {
      state.wishlist.delete(painting.id);
    }
    updateWishlistButtonUI(btn, isOn);
    updateWishlistCountUI();
    
    const msg = err.data?.message || err.message || "Failed to update wishlist";
    showToast(msg, "error");
  }
}

function updateWishlistButtonUI(btn, isOn) {
  if (!btn) return;
  
  const emptyIcon = btn.querySelector(".wishlist-icon-empty");
  const filledIcon = btn.querySelector(".wishlist-icon-filled");
  
  if (isOn) {
    btn.classList.remove("text-gallery-400");
    btn.classList.add("text-red-500");
    emptyIcon?.classList.add("hidden");
    filledIcon?.classList.remove("hidden");
  } else {
    btn.classList.add("text-gallery-400");
    btn.classList.remove("text-red-500");
    emptyIcon?.classList.remove("hidden");
    filledIcon?.classList.add("hidden");
  }
}

/* ========== Painting Modal ========== */
async function openPaintingModal(p) {
  state.currentPainting = p;
  if (!els.modal) return;

  const categoryMap = new Map(state.categories.map((c) => [c.id, c.name]));

  // Populate modal
  if (els.modalImage) {
    els.modalImage.src = buildImageUrl(p.image_url);
    els.modalImage.alt = p.title || "Artwork";
  }
  
  if (els.modalTitle) els.modalTitle.textContent = p.title || "Untitled";
  
  if (els.modalDesc) els.modalDesc.textContent = p.description || "A beautiful original artwork by a talented artist.";
  if (els.modalPrice) els.modalPrice.textContent = formatPrice(p.price);
  if (els.modalCategory) els.modalCategory.textContent = categoryMap.get(p.category_id) || "Artwork";
  
  // Details
  if (els.modalDimensions) els.modalDimensions.textContent = p.dimensions || "—";
  if (els.modalMedium) els.modalMedium.textContent = p.medium || p.materials || "—";
  if (els.modalYear) els.modalYear.textContent = p.year || new Date(p.created_at).getFullYear() || "—";
  if (els.modalStyle) els.modalStyle.textContent = p.style || categoryMap.get(p.category_id) || "—";

  // Certificate badge
  if (els.modalCertBadge) {
    els.modalCertBadge.classList.toggle("hidden", !p.ipfs_cid);
  }

  // Certificate section
  renderModalCertificateInfo(p);

  // Wishlist state
  if (els.modalWishlistBtn) {
    const isWishlisted = state.wishlist.has(p.id);
    if (isWishlisted) {
      els.modalWishlistBtn.classList.add("text-red-500", "border-red-200");
      els.modalWishlistBtn.classList.remove("text-gallery-400");
    } else {
      els.modalWishlistBtn.classList.remove("text-red-500", "border-red-200");
      els.modalWishlistBtn.classList.add("text-gallery-400");
    }
  }

  // Reset quantity
  const qtyInput = document.getElementById("qty");
  if (qtyInput) qtyInput.value = 1;

  // Show/hide review form based on login status
  updateReviewFormVisibility();
  
  // Reset review form
  resetReviewForm();

  // Load reviews for this painting
  await loadPaintingReviews(p.id);

  // Show modal
  els.modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function renderModalCertificateInfo(painting) {
  if (!els.modalCertificate) return;

  if (painting.ipfs_cid) {
    els.modalCertificate.innerHTML = `
      <div class="bg-green-50 border border-green-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="flex-1">
            <h4 class="font-semibold text-green-800 text-sm">Hakika ya Kienyeji ✅</h4>
            <p class="text-xs text-green-700 mt-1 mb-3">Blockchain-verified certificate of authenticity</p>
            <a 
              href="./verify.html?painting_id=${painting.id}"
              class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              View Certificate
            </a>
          </div>
        </div>
      </div>
    `;
  } else {
    els.modalCertificate.innerHTML = `
      <div class="bg-gallery-50 border border-gallery-200 rounded-xl p-4">
        <div class="flex items-center gap-2 text-gallery-500">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-sm">Certificate pending verification</span>
        </div>
      </div>
    `;
  }
}

function closePaintingModal() {
  if (!els.modal) return;
  els.modal.classList.add("hidden");
  document.body.style.overflow = "";
  state.currentPainting = null;
  state.currentReviews = [];
  state.editingReviewId = null;
  resetReviewForm();
}

function initModalEvents() {
  els.modalClose?.addEventListener("click", closePaintingModal);

  els.modal?.addEventListener("click", (e) => {
    if (e.target === els.modal) closePaintingModal();
  });

  els.modalWishlistBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!state.currentPainting) return;
    handleToggleWishlist(state.currentPainting, els.modalWishlistBtn);
  });

  // Add to cart from modal
  document.getElementById("add-to-cart-modal")?.addEventListener("click", () => {
    if (!state.currentPainting) return;
    const qtyInput = document.getElementById("qty");
    const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
    handleAddToCart(state.currentPainting, qty);
  });

  // Buy now
  document.getElementById("buy-now")?.addEventListener("click", async () => {
    if (!state.currentPainting) return;
    const qtyInput = document.getElementById("qty");
    const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
    await handleAddToCart(state.currentPainting, qty);
    window.location.href = "./cart.html";
  });

  // Quantity controls
  const qtyDecr = document.getElementById("qty-decr");
  const qtyIncr = document.getElementById("qty-incr");
  const qtyInput = document.getElementById("qty");

  qtyDecr?.addEventListener("click", () => {
    const current = parseInt(qtyInput.value, 10) || 1;
    qtyInput.value = Math.max(1, current - 1);
  });

  qtyIncr?.addEventListener("click", () => {
    const current = parseInt(qtyInput.value, 10) || 1;
    qtyInput.value = current + 1;
  });
}

/* ========== Reviews ========== */
function initReviewEvents() {
  // Star rating click handlers
  const starBtns = document.querySelectorAll(".star-btn");
  starBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const rating = parseInt(btn.dataset.rating, 10);
      setStarRating(rating);
    });
    
    // Hover effects
    btn.addEventListener("mouseenter", () => {
      const rating = parseInt(btn.dataset.rating, 10);
      highlightStars(rating);
    });
  });
  
  // Reset stars on mouse leave
  els.starRating?.addEventListener("mouseleave", () => {
    highlightStars(state.selectedRating);
  });
  
  // Submit review
  els.submitReview?.addEventListener("click", handleSubmitReview);
}

function setStarRating(rating) {
  state.selectedRating = rating;
  if (els.reviewRating) {
    els.reviewRating.value = rating;
  }
  highlightStars(rating);
}

function highlightStars(rating) {
  const starBtns = document.querySelectorAll(".star-btn");
  starBtns.forEach((btn) => {
    const btnRating = parseInt(btn.dataset.rating, 10);
    if (btnRating <= rating) {
      btn.classList.remove("text-gallery-300");
      btn.classList.add("text-yellow-400");
    } else {
      btn.classList.add("text-gallery-300");
      btn.classList.remove("text-yellow-400");
    }
  });
}

function updateReviewFormVisibility() {
  if (!els.reviewLoginPrompt || !els.reviewForm) return;
  
  if (state.currentUser && state.authToken) {
    els.reviewLoginPrompt.classList.add("hidden");
    els.reviewForm.classList.remove("hidden");
  } else {
    els.reviewLoginPrompt.classList.remove("hidden");
    els.reviewForm.classList.add("hidden");
  }
}

function resetReviewForm() {
  state.selectedRating = 0;
  state.editingReviewId = null;
  
  if (els.reviewRating) els.reviewRating.value = "0";
  if (els.reviewComment) els.reviewComment.value = "";
  if (els.submitReview) {
    els.submitReview.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </svg>
      Submit Review
    `;
  }
  
  highlightStars(0);
}

async function loadPaintingReviews(paintingId) {
  try {
    const reviews = await getPaintingReviews(paintingId);
    state.currentReviews = reviews || [];
    renderReviewsSummary();
    renderReviewsList();
  } catch (err) {
    console.error("Failed to load reviews:", err);
    state.currentReviews = [];
    renderReviewsSummary();
    renderReviewsList();
  }
}

function renderReviewsSummary() {
  if (!els.reviewsSummary || !els.reviewsCount) return;
  
  const reviews = state.currentReviews;
  const count = reviews.length;
  
  els.reviewsCount.textContent = `${count} review${count !== 1 ? 's' : ''}`;
  
  if (count === 0) {
    els.reviewsSummary.innerHTML = `
      <div class="flex items-center gap-2 text-gallery-400">
        <div class="flex gap-0.5">
          ${renderStarsHTML(0)}
        </div>
        <span class="text-sm">No reviews yet</span>
      </div>
    `;
    return;
  }
  
  const avgRating = calculateAverageRating(reviews);
  
  els.reviewsSummary.innerHTML = `
    <div class="flex items-center gap-4">
      <div class="text-center">
        <div class="text-3xl font-bold text-gallery-900">${avgRating}</div>
        <div class="flex justify-center mt-1">
          ${renderStarsHTML(parseFloat(avgRating))}
        </div>
      </div>
      <div class="flex-1 space-y-1">
        ${renderRatingBarsHTML(reviews)}
      </div>
    </div>
  `;
}

function renderReviewsList() {
  if (!els.reviewsList) return;
  
  const reviews = state.currentReviews;
  
  if (reviews.length === 0) {
    els.reviewsList.innerHTML = `
      <div class="text-center py-6 text-gallery-500">
        <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <p class="text-sm">Be the first to review this artwork!</p>
      </div>
    `;
    return;
  }
  
  els.reviewsList.innerHTML = reviews.map((review) => renderReviewCardHTML(review)).join("");
  
  // Add event listeners for edit/delete buttons
  reviews.forEach((review) => {
    const editBtn = document.getElementById(`edit-review-${review.id}`);
    const deleteBtn = document.getElementById(`delete-review-${review.id}`);
    
    editBtn?.addEventListener("click", () => handleEditReview(review));
    deleteBtn?.addEventListener("click", () => handleDeleteReview(review.id));
  });
}

function renderStarsHTML(rating, size = "w-4 h-4") {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let html = "";
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    html += `<svg class="${size} text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>`;
  }
  
  // Half star
  if (hasHalfStar) {
    html += `
      <svg class="${size} text-yellow-400" viewBox="0 0 20 20">
        <defs>
          <linearGradient id="half-star-${Math.random()}">
            <stop offset="50%" stop-color="currentColor"/>
            <stop offset="50%" stop-color="#d1d5db"/>
          </linearGradient>
        </defs>
        <path fill="url(#half-star-${Math.random()})" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
      </svg>
    `;
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    html += `<svg class="${size} text-gallery-300 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>`;
  }
  
  return `<div class="flex gap-0.5">${html}</div>`;
}

function renderRatingBarsHTML(reviews) {
  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((r) => r.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });
  
  return distribution.map(({ rating, count, percentage }) => `
    <div class="flex items-center gap-2 text-xs">
      <span class="w-3 text-gallery-600">${rating}</span>
      <svg class="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
      <div class="flex-1 bg-gallery-200 rounded-full h-1.5">
        <div class="bg-yellow-400 h-1.5 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
      </div>
      <span class="w-6 text-right text-gallery-500">${count}</span>
    </div>
  `).join("");
}

function renderReviewCardHTML(review) {
  const isCurrentUser = state.currentUser && review.user_id === state.currentUser.id;
  const timeAgo = getTimeAgo(new Date(review.created_at || Date.now()));
  const initial = review.username ? review.username[0].toUpperCase() : "U";
  
  return `
    <div class="border border-gallery-200 rounded-lg p-3 hover:border-gallery-300 transition">
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-gallery-600 flex items-center justify-center text-white text-sm font-medium">
            ${initial}
          </div>
          <div>
            <div class="text-sm font-medium text-gallery-900">${escapeHtml(review.username || "Anonymous")}</div>
            <div class="flex items-center gap-2">
              ${renderStarsHTML(review.rating, "w-3 h-3")}
              <span class="text-xs text-gallery-400">${timeAgo}</span>
            </div>
          </div>
        </div>
        ${isCurrentUser ? `
          <div class="flex gap-1">
            <button id="edit-review-${review.id}" class="p-1 text-gallery-400 hover:text-gallery-600 transition" title="Edit">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button id="delete-review-${review.id}" class="p-1 text-red-400 hover:text-red-600 transition" title="Delete">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        ` : ""}
      </div>
      <p class="text-sm text-gallery-600 leading-relaxed">${escapeHtml(review.comment)}</p>
    </div>
  `;
}

function calculateAverageRating(reviews) {
  if (!reviews || reviews.length === 0) return "0.0";
  const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
  return (sum / reviews.length).toFixed(1);
}

async function handleSubmitReview() {
  if (!state.currentUser || !state.authToken) {
    showToast("Please sign in to leave a review", "info");
    return;
  }
  
  if (!state.currentPainting) return;
  
  const rating = state.selectedRating;
  const comment = els.reviewComment?.value?.trim() || "";
  
  if (rating < 1 || rating > 5) {
    showToast("Please select a rating (1-5 stars)", "error");
    return;
  }
  
  if (!comment || comment.length < 10) {
    showToast("Please write a review (at least 10 characters)", "error");
    return;
  }
  
  // Disable button while submitting
  if (els.submitReview) {
    els.submitReview.disabled = true;
    els.submitReview.innerHTML = `
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Submitting...
    `;
  }
  
  try {
    if (state.editingReviewId) {
      // Update existing review
      await updateReview(state.editingReviewId, { rating, comment }, state.authToken);
      showToast("Review updated successfully!", "success");
    } else {
      // Create new review
      const reviewData = {
        user_id: state.currentUser.id,
        painting_id: state.currentPainting.id,
        rating,
        comment,
      };
      await createReview(reviewData, state.authToken);
      showToast("Review submitted successfully!", "success");
    }
    
    // Reset form and reload reviews
    resetReviewForm();
    await loadPaintingReviews(state.currentPainting.id);
    
  } catch (err) {
    console.error(err);
    const msg = err.data?.message || "Failed to submit review";
    showToast(msg, "error");
  } finally {
    if (els.submitReview) {
      els.submitReview.disabled = false;
      els.submitReview.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
        Submit Review
      `;
    }
  }
}

function handleEditReview(review) {
  state.editingReviewId = review.id;
  state.selectedRating = review.rating;
  
  if (els.reviewRating) els.reviewRating.value = review.rating;
  if (els.reviewComment) els.reviewComment.value = review.comment;
  
  highlightStars(review.rating);
  
  if (els.submitReview) {
    els.submitReview.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
      </svg>
      Update Review
    `;
  }
  
  // Scroll to form
  els.reviewFormContainer?.scrollIntoView({ behavior: "smooth", block: "center" });
  els.reviewComment?.focus();
  
  showToast("Editing your review", "info");
}

async function handleDeleteReview(reviewId) {
  if (!confirm("Are you sure you want to delete this review?")) return;
  
  try {
    await deleteReview(reviewId, state.authToken);
    showToast("Review deleted successfully", "success");
    
    // Reload reviews
    if (state.currentPainting) {
      await loadPaintingReviews(state.currentPainting.id);
    }
  } catch (err) {
    console.error(err);
    const msg = err.data?.message || "Failed to delete review";
    showToast(msg, "error");
  }
}

/* ========== Verification Modal ========== */
function initVerificationModalEvents() {
  els.verifyClose?.addEventListener("click", closeVerificationModal);

  els.verifyModal?.addEventListener("click", (e) => {
    if (e.target === els.verifyModal) closeVerificationModal();
  });
}

function closeVerificationModal() {
  if (!els.verifyModal) return;
  els.verifyModal.classList.add("hidden");
  document.body.style.overflow = "";
}

/* ========== Search ========== */
function openSearch() {
  els.searchOverlay?.classList.remove("hidden");
  els.searchOverlay?.classList.add("flex");
  els.searchInput?.focus();
  document.body.style.overflow = "hidden";
}

function closeSearch() {
  els.searchOverlay?.classList.add("hidden");
  els.searchOverlay?.classList.remove("flex");
  document.body.style.overflow = "";
}

/* ========== Mobile Menu ========== */
function toggleMobileMenu() {
  els.mobileMenu?.classList.toggle("hidden");
}

/* ========== User Dropdown ========== */
function toggleUserDropdown() {
  els.userDropdown?.classList.toggle("hidden");
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

  toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up max-w-xs`;
  toast.innerHTML = `
    ${icon}
    <span class="text-sm font-medium">${message}</span>
  `;

  els.toastContainer.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ========== Helpers ========== */
function buildImageUrl(imageUrl) {
  if (!imageUrl) return "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=500&fit=crop";
  if (imageUrl.startsWith("http")) return imageUrl;
  return API_BASE_URL + imageUrl;
}

function formatPrice(price) {
  return `Ksh ${Number(price || 0).toLocaleString()}`;
}

function isWithinDays(dateStr, days) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  return diff < days * 24 * 60 * 60 * 1000;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval !== 1 ? "s" : ""} ago`;
    }
  }
  
  return "just now";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Global functions for onclick handlers
window.closeVerificationModal = closeVerificationModal;
window.closePaintingModal = closePaintingModal;

window.copyCID = function (cid) {
  navigator.clipboard
    .writeText(cid)
    .then(() => {
      showToast("Certificate ID copied!", "success");
    })
    .catch(() => {
      showToast("Failed to copy", "error");
    });
};