// js/artist-dashboard.js
import {
  API_BASE_URL,
  getArtists,
  getAllPaintings,
  getAllCategories,
  createArtistProfile,
  updateArtistProfile,
  createPainting,
  updatePainting,
  deletePainting,
  getArtistBalance,
  getArtistPayouts,
} from "./api.js";

/* ========== STATE ========== */
let currentUser = null;
let currentArtistProfile = null;
let categories = [];
let editingPainting = null;
let artistSalesData = null;

const els = {};

/* ========== INITIALIZATION ========== */
document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  initAuthGuard();
  bindEvents();
  loadDashboardData();
});

function cacheElements() {
  els.msg = document.getElementById("dashboard-message");
  els.usernameLabel = document.getElementById("artist-username");
  els.roleLabel = document.getElementById("artist-role-label");
  els.artistName = document.getElementById("artist-name");
  els.artistBioText = document.getElementById("artist-bio-text");
  els.artistImage = document.getElementById("artist-profile-image");
  els.avatarButton = document.getElementById("artist-avatar-button");
  
  els.profileFormWrap = document.getElementById("artist-profile-form-wrap");
  els.profileForm = document.getElementById("artist-profile-form");
  els.bioInput = document.getElementById("artist-bio");
  els.socialInput = document.getElementById("artist-social-links");
  els.pictureInput = document.getElementById("artist-picture");
  els.profileToggleBtn = document.getElementById("edit-profile-btn");
  
  els.paintingsList = document.getElementById("artist-paintings-list");
  els.paintingsMsg = document.getElementById("artist-paintings-message");
  els.newPaintingToggle = document.getElementById("toggle-new-painting-form");
  els.newPaintingWrap = document.getElementById("new-painting-form-wrap");
  els.newPaintingForm = document.getElementById("new-painting-form");
  els.npCategorySelect = document.getElementById("np-category");
  
  els.logoutBtn = document.getElementById("logout-btn");
  
  // Stats
  els.statTotalPaintings = document.getElementById("stat-total-paintings");
  els.statTotalSales = document.getElementById("stat-total-sales");
  els.statTotalEarnings = document.getElementById("stat-total-earnings");
  els.statCertified = document.getElementById("stat-certified");
}

/* ========== AUTH GUARD ========== */
function initAuthGuard() {
  try {
    const rawUser = localStorage.getItem("auth_user");
    if (!rawUser) {
      window.location.href = "./login.html";
      return;
    }
    currentUser = JSON.parse(rawUser);
  } catch (e) {
    console.error("Failed to parse auth_user", e);
    window.location.href = "./login.html";
    return;
  }

  if (!currentUser || currentUser.role !== "artist") {
    window.location.href = "./index.html";
    return;
  }

  if (els.usernameLabel) {
    els.usernameLabel.textContent = currentUser.username || currentUser.email || "Artist";
  }
  if (els.artistName) {
    els.artistName.textContent = currentUser.username || "Artist";
  }
}

/* ========== EVENT BINDINGS ========== */
function bindEvents() {
  els.logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    window.location.href = "./login.html";
  });

  els.avatarButton?.addEventListener("click", toggleProfileForm);
  els.profileToggleBtn?.addEventListener("click", toggleProfileForm);
  els.profileForm?.addEventListener("submit", onProfileSubmit);

  els.newPaintingToggle?.addEventListener("click", () => {
    if (editingPainting) {
      resetEditState();
      els.newPaintingWrap?.classList.add("hidden");
      return;
    }
    const hidden = els.newPaintingWrap?.classList.contains("hidden");
    els.newPaintingWrap?.classList.toggle("hidden", !hidden);
    if (hidden) {
      els.newPaintingWrap?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  els.newPaintingForm?.addEventListener("submit", onNewPaintingSubmit);
}

function toggleProfileForm() {
  const isHidden = els.profileFormWrap?.classList.contains("hidden");
  if (isHidden) {
    els.profileFormWrap?.classList.remove("hidden");
    els.profileFormWrap?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    els.profileFormWrap?.classList.add("hidden");
  }
}

/* ========== DATA LOADING ========== */
async function loadDashboardData() {
  clearMessage();
  setMessage("Loading your artist studio...", false);

  try {
    await Promise.all([
      loadCategories(),
      loadArtistProfile(),
      loadArtistPaintings(),
      loadArtistEarnings(),
      loadSalesAnalytics(),
    ]);
    clearMessage();
  } catch (err) {
    console.error(err);
    setMessage("Failed to load dashboard data. Please refresh.", true);
  }
}

async function loadCategories() {
  const data = await getAllCategories();
  categories = Array.isArray(data) ? data : [];

  if (els.npCategorySelect) {
    els.npCategorySelect.innerHTML = '<option value="">Select category (optional)</option>';
    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name || `Category #${cat.id}`;
      els.npCategorySelect.appendChild(opt);
    });
  }
}

// async function loadArtistProfile() {
//   const data = await getArtists();
//   const artists = data?.artists || [];
//   currentArtistProfile = artists.find((a) => String(a.user_id) === String(currentUser.id)) || null;

//   if (!currentArtistProfile) {
//     if (els.artistBioText) {
//       els.artistBioText.textContent = "Click your profile picture to set up your artist profile";
//     }
//     if (els.bioInput) els.bioInput.value = "";
//     if (els.socialInput) els.socialInput.value = "";
//     if (els.artistImage) {
//       els.artistImage.src = "https://via.placeholder.com/150?text=Artist";
//     }
//     return;
//   }
async function loadArtistProfile() {
  try {
    const data = await getArtists();
    
    // API returns array directly, not { artists: [...] }
    const artists = Array.isArray(data) ? data : (data?.artists || []);
    
    currentArtistProfile = artists.find(
      (a) => String(a.user_id) === String(currentUser.id)
    ) || null;

    if (!currentArtistProfile) {
      // No profile yet - show placeholder
      if (els.artistBioText) {
        els.artistBioText.textContent = "Click your profile picture to set up your artist profile";
      }
      if (els.bioInput) els.bioInput.value = "";
      if (els.socialInput) els.socialInput.value = "";
      if (els.artistImage) {
        els.artistImage.src = "https://via.placeholder.com/150/6B7280/FFFFFF?text=Artist";
      }
      return;
    }

    // Profile exists - populate fields
    if (els.artistBioText) {
      els.artistBioText.textContent = currentArtistProfile.bio || "No bio yet";
    }
    if (els.bioInput) {
      els.bioInput.value = currentArtistProfile.bio || "";
    }
    if (els.socialInput) {
      // Handle social_links as JSON or string
      const socialLinks = currentArtistProfile.social_links;
      if (typeof socialLinks === 'object') {
        els.socialInput.value = JSON.stringify(socialLinks);
      } else {
        els.socialInput.value = socialLinks || "";
      }
    }
    if (els.artistImage) {
      // Use profile picture or placeholder
      els.artistImage.src = currentArtistProfile.profile_picture && 
                            currentArtistProfile.profile_picture.startsWith('http')
        ? currentArtistProfile.profile_picture
        : "https://via.placeholder.com/150/6B7280/FFFFFF?text=Artist";
    }
    
    console.log("✅ Artist profile loaded:", currentArtistProfile);
    
  } catch (err) {
    console.error("Error loading artist profile:", err);
    if (els.artistImage) {
      els.artistImage.src = "https://via.placeholder.com/150/EF4444/FFFFFF?text=Error";
    }
  }
}

  if (els.artistBioText) {
    els.artistBioText.textContent = currentArtistProfile.bio || "No bio yet";
  }
  if (els.bioInput) {
    els.bioInput.value = currentArtistProfile.bio || "";
  }
  if (els.socialInput) {
    els.socialInput.value = currentArtistProfile.social_links || "";
  }
  if (els.artistImage) {
    const imgUrl = buildImageUrl(currentArtistProfile.profile_picture);
    els.artistImage.src = imgUrl;
  }


async function loadArtistPaintings() {
  if (!els.paintingsList || !els.paintingsMsg) return;

  els.paintingsList.innerHTML = "";
  els.paintingsMsg.classList.add("hidden");

  const all = await getAllPaintings();
  const paintings = Array.isArray(all) ? all : [];

  let myPaintings = [];
  if (currentArtistProfile) {
    myPaintings = paintings.filter((p) => String(p.artist_id) === String(currentArtistProfile.id));
  }

  // Update stats
  updateStats(myPaintings);

  if (!myPaintings.length) {
    els.paintingsMsg.textContent = "You haven't added any artworks yet. Click 'Add Artwork' to get started.";
    els.paintingsMsg.classList.remove("hidden");
    return;
  }

  myPaintings.forEach((p, index) => {
    const card = document.createElement("div");
    card.className = "bg-white border border-gallery-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group animate-fade-in";
    card.style.animationDelay = `${index * 50}ms`;

    const imgUrl = buildImageUrl(p.image_url);

    const formattedPrice = new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(p.price);

    const salesStatus = getSalesStatusForPainting(p.id);

    let certificateHtml = "";
    if (p.ipfs_cid) {
      certificateHtml = `
        <div class="p-4 bg-green-50 border-t border-green-100">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="text-xs font-semibold text-green-800">Hakika ya Kienyeji ✅</span>
          </div>
          <div class="space-y-1">
            <a href="${p.qr_code_url}" target="_blank" class="text-xs text-blue-600 hover:underline block">
              📱 View QR Code
            </a>
            <button type="button" onclick="window.copyCID?.('${p.ipfs_cid}')" 
              class="text-xs text-gallery-600 hover:text-gallery-900 transition">
              📋 Copy Certificate ID
            </button>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="relative aspect-square bg-gallery-100 overflow-hidden">
        <img src="${imgUrl}" alt="${p.title || "Painting"}"
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ${p.ipfs_cid ? `
          <div class="absolute top-2 left-2">
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full shadow">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              Certified
            </span>
          </div>
        ` : ''}
      </div>
      
      <div class="p-4 space-y-2">
        <h4 class="font-semibold text-gallery-900 truncate">${p.title || "Untitled"}</h4>
        <p class="text-accent font-display text-lg">${formattedPrice}</p>
        <p class="text-xs text-gallery-500">ID: ${p.id}</p>
        ${salesStatus && salesStatus.sold ? `
          <div class="pt-2 border-t border-gallery-100">
            <div class="flex items-center justify-between text-xs">
              <span class="text-green-600 font-medium">✓ Sold ${salesStatus.count}x</span>
              <span class="text-green-600">KSH ${salesStatus.revenue.toLocaleString()}</span>
            </div>
          </div>
        ` : `
          <p class="text-xs text-gallery-400 pt-2 border-t border-gallery-100">Not sold yet</p>
        `}
      </div>
      
      ${certificateHtml}
      
      <div class="px-4 pb-4 flex gap-2">
        <button type="button" data-action="edit"
          class="flex-1 px-3 py-2 border border-gallery-200 text-gallery-700 text-sm rounded-lg hover:bg-gallery-50 transition">
          Edit
        </button>
        <button type="button" data-action="delete"
          class="flex-1 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition">
          Delete
        </button>
      </div>
    `;

    card.querySelector('[data-action="edit"]')?.addEventListener("click", () => startEditPainting(p));
    card.querySelector('[data-action="delete"]')?.addEventListener("click", () => onDeletePainting(p));

    els.paintingsList.appendChild(card);
  });
}

function updateStats(paintings) {
  const totalPaintings = paintings.length;
  const certified = paintings.filter(p => p.ipfs_cid).length;
  
  if (els.statTotalPaintings) els.statTotalPaintings.textContent = totalPaintings;
  if (els.statCertified) els.statCertified.textContent = certified;
  
  if (artistSalesData) {
    if (els.statTotalSales) els.statTotalSales.textContent = artistSalesData.totalSales || 0;
    if (els.statTotalEarnings) {
      const earnings = (artistSalesData.totalRevenue * 0.8) || 0;
      els.statTotalEarnings.textContent = `KSH ${earnings.toLocaleString()}`;
    }
  }
}

/* ========== EARNINGS ========== */
async function loadArtistEarnings() {
  if (!currentArtistProfile) return;
  
  const artistId = currentArtistProfile.id;
  const token = localStorage.getItem("auth_token");
  
  try {
    const balance = await getArtistBalance(artistId, token);
    let payouts = [];
    try {
      payouts = await getArtistPayouts(artistId, token);
    } catch (error) {
      console.log("No payouts found yet");
    }
    
    renderEarnings(balance, payouts);
  } catch (error) {
    console.error("Failed to load earnings:", error);
    const container = document.getElementById("earnings-content");
    if (container) {
      container.innerHTML = `
        <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p class="text-sm text-yellow-800">Unable to load earnings data. Please try again later.</p>
        </div>
      `;
    }
  }
}

function renderEarnings(balance, payouts) {
  const container = document.getElementById("earnings-content");
  if (!container) return;
  
  const recentPayouts = Array.isArray(payouts) ? payouts.slice(0, 5) : [];
  
  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
        <p class="text-xs text-gallery-600 mb-2">Pending Balance</p>
        <p class="text-2xl font-display font-bold text-yellow-700">
          KSH ${(balance.pending_balance || 0).toLocaleString()}
        </p>
        <p class="text-xs text-gallery-500 mt-1">Awaiting payout</p>
      </div>
      
      <div class="bg-green-50 border border-green-200 rounded-xl p-5">
        <p class="text-xs text-gallery-600 mb-2">Total Earned</p>
        <p class="text-2xl font-display font-bold text-green-700">
          KSH ${(balance.total_earned || 0).toLocaleString()}
        </p>
        <p class="text-xs text-gallery-500 mt-1">All time</p>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <p class="text-xs text-gallery-600 mb-2">Commission Rate</p>
        <p class="text-2xl font-display font-bold text-blue-700">
          ${((balance.commission_rate || 0.20) * 100).toFixed(0)}%
        </p>
        <p class="text-xs text-gallery-500 mt-1">Platform fee</p>
      </div>
    </div>
    
    <div class="border-t border-gallery-100 pt-6">
      <h4 class="text-sm font-semibold text-gallery-900 mb-4">Recent Payouts</h4>
      ${recentPayouts.length > 0 ? `
        <div class="space-y-2 max-h-60 overflow-y-auto">
          ${recentPayouts.map(payout => `
            <div class="flex justify-between items-center p-3 hover:bg-gallery-50 rounded-lg transition">
              <div>
                <p class="font-medium text-gallery-900">KSH ${(payout.payout_amount || 0).toLocaleString()}</p>
                <p class="text-xs text-gallery-500">${new Date(payout.created_at).toLocaleDateString()}</p>
              </div>
              <span class="px-2 py-1 rounded-full text-xs font-medium ${
                payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }">
                ${payout.status}
              </span>
            </div>
          `).join('')}
        </div>
      ` : `
        <p class="text-sm text-gallery-500 text-center py-8">No payouts yet. Start selling to earn!</p>
      `}
    </div>
    
    <div class="mt-6 p-4 bg-gallery-50 rounded-xl">
      <p class="text-xs text-gallery-600 leading-relaxed">
        <strong class="text-gallery-900">How payouts work:</strong><br>
        • You earn 80% of each sale (20% platform fee)<br>
        • Payouts processed weekly on Fridays<br>
        • Minimum payout: KSH 500<br>
        • Payment via M-Pesa to your registered number
      </p>
    </div>
  `;
}

/* ========== SALES ANALYTICS ========== */
async function loadSalesAnalytics() {
  if (!currentArtistProfile) return;
  
  try {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(`${API_BASE_URL}/orders`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (response.ok) {
      const allOrders = await response.json();
      const myPaintings = await getAllPaintings();
      const myPaintingIds = myPaintings
        .filter(p => String(p.artist_id) === String(currentArtistProfile.id))
        .map(p => p.id);
      
      artistSalesData = calculateSalesData(allOrders, myPaintingIds);
      renderSalesAnalytics(artistSalesData);
      
      // Update stats after loading sales data
      const paintings = myPaintings.filter(p => String(p.artist_id) === String(currentArtistProfile.id));
      updateStats(paintings);
    }
  } catch (error) {
    console.error("Failed to load sales analytics:", error);
  }
}

function calculateSalesData(orders, myPaintingIds) {
  const salesData = {
    totalSales: 0,
    totalRevenue: 0,
    monthlySales: {},
    paintingSales: {},
    recentOrders: []
  };
  
  orders.forEach(order => {
    const orderDetails = order.details || [];
    const relevantDetails = orderDetails.filter(d => myPaintingIds.includes(d.painting_id));
    
    if (relevantDetails.length > 0 && order.status === 'paid') {
      relevantDetails.forEach(detail => {
        const revenue = detail.price * detail.quantity;
        salesData.totalSales += detail.quantity;
        salesData.totalRevenue += revenue;
        
        if (!salesData.paintingSales[detail.painting_id]) {
          salesData.paintingSales[detail.painting_id] = { count: 0, revenue: 0, sold: false };
        }
        salesData.paintingSales[detail.painting_id].count += detail.quantity;
        salesData.paintingSales[detail.painting_id].revenue += revenue;
        salesData.paintingSales[detail.painting_id].sold = true;
        
        const month = new Date(order.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        if (!salesData.monthlySales[month]) {
          salesData.monthlySales[month] = { count: 0, revenue: 0 };
        }
        salesData.monthlySales[month].count += detail.quantity;
        salesData.monthlySales[month].revenue += revenue;
      });
      
      salesData.recentOrders.push({
        orderId: order.id,
        date: order.created_at,
        items: relevantDetails,
        total: relevantDetails.reduce((sum, d) => sum + (d.price * d.quantity), 0)
      });
    }
  });
  
  salesData.recentOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
  return salesData;
}

function getSalesStatusForPainting(paintingId) {
  if (!artistSalesData?.paintingSales) return null;
  return artistSalesData.paintingSales[paintingId] || { sold: false, count: 0, revenue: 0 };
}

function renderSalesAnalytics(salesData) {
  const container = document.getElementById("sales-analytics-content");
  if (!container) return;
  
  if (!salesData) {
    container.innerHTML = `
      <div class="p-8 text-center text-sm text-gallery-500">
        No sales data available yet
      </div>
    `;
    return;
  }
  
  const recentOrders = salesData.recentOrders.slice(0, 5);
  const monthlyData = Object.entries(salesData.monthlySales).slice(-6);
  
  container.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-xl border border-gallery-100">
        <p class="text-xs text-gallery-600">Total Sales</p>
        <p class="text-2xl font-display font-bold text-gallery-900">${salesData.totalSales}</p>
      </div>
      <div class="bg-white p-4 rounded-xl border border-gallery-100">
        <p class="text-xs text-gallery-600">Gross Revenue</p>
        <p class="text-2xl font-display font-bold text-gallery-900">KSH ${salesData.totalRevenue.toLocaleString()}</p>
      </div>
      <div class="bg-white p-4 rounded-xl border border-gallery-100">
        <p class="text-xs text-gallery-600">Your Share (80%)</p>
        <p class="text-2xl font-display font-bold text-green-600">KSH ${(salesData.totalRevenue * 0.8).toLocaleString()}</p>
      </div>
      <div class="bg-white p-4 rounded-xl border border-gallery-100">
        <p class="text-xs text-gallery-600">Platform Fee</p>
        <p class="text-2xl font-display font-bold text-gallery-500">KSH ${(salesData.totalRevenue * 0.2).toLocaleString()}</p>
      </div>
    </div>
    
    ${monthlyData.length > 0 ? `
      <div class="bg-white p-5 rounded-xl border border-gallery-100 mb-6">
        <h4 class="text-sm font-semibold text-gallery-900 mb-4">Monthly Sales Trend</h4>
        <div class="space-y-3">
          ${monthlyData.map(([month, data]) => `
            <div class="flex items-center gap-3">
              <span class="text-xs text-gallery-600 w-20 flex-shrink-0">${month}</span>
              <div class="flex-1 bg-gallery-100 rounded-full h-8 relative overflow-hidden">
                <div class="bg-accent h-8 rounded-full flex items-center justify-end pr-3 transition-all duration-500" 
                     style="width: ${Math.max(10, (data.revenue / salesData.totalRevenue * 100)).toFixed(1)}%">
                  <span class="text-xs text-white font-medium">
                    KSH ${data.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    ${recentOrders.length > 0 ? `
      <div class="bg-white p-5 rounded-xl border border-gallery-100">
        <h4 class="text-sm font-semibold text-gallery-900 mb-4">Recent Sales</h4>
        <div class="space-y-2">
          ${recentOrders.map(order => `
            <div class="flex justify-between items-center p-3 hover:bg-gallery-50 rounded-lg transition">
              <div class="text-xs">
                <p class="font-medium text-gallery-900">Order #${order.orderId}</p>
                <p class="text-gallery-500">${new Date(order.date).toLocaleDateString()}</p>
              </div>
              <div class="text-right text-xs">
                <p class="font-medium text-green-600">KSH ${order.total.toLocaleString()}</p>
                <p class="text-gallery-500">${order.items.length} item(s)</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

/* ========== FORM HANDLERS ========== */
async function onProfileSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;

  const bio = els.bioInput?.value.trim();
  const socialLinks = els.socialInput?.value.trim();
  const pictureFile = els.pictureInput?.files[0] || null;

  if (!bio) {
    alert("Bio is required.");
    return;
  }

  const formData = new FormData();
  formData.append("user_id", currentUser.id);
  formData.append("bio", bio);
  if (socialLinks) formData.append("social_links", socialLinks);
  if (pictureFile) formData.append("profile_picture", pictureFile);

  try {
    setMessage("Saving profile...", false);

    if (currentArtistProfile) {
      await updateArtistProfile(currentArtistProfile.id, formData);
    } else {
      await createArtistProfile(formData);
    }

    await loadArtistProfile();
    setMessage("Profile saved successfully!", false);
    setTimeout(() => clearMessage(), 2000);
  } catch (err) {
    console.error(err);
    const msg = err.data?.message || err.data?.error || err.message || "Failed to save profile.";
    setMessage(msg, true);
  }
}

async function onNewPaintingSubmit(e) {
  e.preventDefault();
  if (!currentUser || !currentArtistProfile) {
    alert("Please create your artist profile first.");
    return;
  }

  const form = e.target;
  const title = form["title"].value.trim();
  const price = form["price"].value.trim();
  const categoryId = form["category_id"]?.value?.trim() || "";
  const description = form["description"]?.value?.trim() || "";
  const imageFile = form["image"].files[0];
  const materials = form["materials"]?.value?.trim() || "Not specified";
  const location = form["location"]?.value?.trim() || "Kenya";

  if (!title || !price || (!editingPainting && !imageFile)) {
    alert("Title, price, and image are required.");
    return;
  }

  try {
    if (editingPainting) {
      // --- UPDATE EXISTING PAINTING ---
      setMessage("Updating artwork...", false);
      const formData = new FormData();
      formData.append("title", title);
      formData.append("price", price);
      if (categoryId) formData.append("category_id", categoryId);
      if (description) formData.append("description", description);
      if (materials) formData.append("materials", materials);
      if (location) formData.append("location", location);
      if (imageFile) formData.append("image", imageFile);

      await updatePainting(editingPainting.id, formData);
      resetEditState();

    } else {
      // --- CREATE NEW PAINTING ---
      setMessage("Uploading image and generating certificate...", false);

      // 1. Upload image first
      let imageUrl = "";
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append("file", imageFile);

        const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("auth_token")}` 
          },
          body: uploadData
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Image upload failed");
        }

        const result = await uploadRes.json();
        imageUrl = result.url;
        console.log("✅ Image uploaded:", imageUrl);
      }

      // 2. Create painting with FormData (NOT JSON)
      const paintingFormData = new FormData();
      paintingFormData.append("artist_id", currentArtistProfile.id);
      paintingFormData.append("title", title);
      paintingFormData.append("price", price);
      paintingFormData.append("image_url", imageUrl);
      
      if (categoryId) paintingFormData.append("category_id", categoryId);
      if (description) paintingFormData.append("description", description);
      if (materials) paintingFormData.append("materials", materials);
      if (location) paintingFormData.append("location", location);

      // Debug log
      console.log("=== Creating painting ===");
      for (let [key, value] of paintingFormData.entries()) {
        console.log(`${key}: ${value}`);
      }

      const response = await fetch(`${API_BASE_URL}/paintings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`
          // ❌ Remove "Content-Type": "application/json"
          // Browser sets correct multipart/form-data automatically
        },
        body: paintingFormData  // ✅ FormData, not JSON.stringify()
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.message || "Failed to create painting");
      }

      const painting = await response.json();
      form.reset();

      // Success message with certificate info
      if (painting.ipfs_cid && painting.qr_code_url) {
        setTimeout(() => {
          alert(
            `🎨 "${painting.title}" created successfully!\n\n` +
            `✅ Hakika ya Kienyeji Certificate Generated!\n` +
            `🔗 QR Code: ${painting.qr_code_url}\n` +
            `🆔 Certificate ID: ${painting.ipfs_cid}`
          );
        }, 500);
      } else {
        alert(`🎨 "${painting.title}" created successfully!`);
      }
    }

    await loadArtistPaintings();
    setMessage("Artwork saved successfully!", false);
    setTimeout(() => clearMessage(), 2000);

  } catch (err) {
    console.error("Painting submission error:", err);
    const msg = err.data?.message || err.data?.error || err.message || "Failed to save artwork.";
    setMessage(msg, true);
  }
}
/* ========== PAINTING ACTIONS ========== */
function startEditPainting(p) {
  editingPainting = p;

  if (els.newPaintingWrap?.classList.contains("hidden")) {
    els.newPaintingWrap?.classList.remove("hidden");
    els.newPaintingWrap?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const form = els.newPaintingForm;
  if (!form) return;

  form["title"].value = p.title || "";
  form["price"].value = p.price || "";
  form["description"].value = p.description || "";
  if (els.npCategorySelect) els.npCategorySelect.value = p.category_id || "";
  if (els.newPaintingToggle) els.newPaintingToggle.textContent = "Cancel edit";
}

function resetEditState() {
  editingPainting = null;
  els.newPaintingForm?.reset();
  if (els.npCategorySelect) els.npCategorySelect.value = "";
  if (els.newPaintingToggle) {
    els.newPaintingToggle.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
      </svg>
      Add Artwork
    `;
  }
}

async function onDeletePainting(p) {
  const ok = window.confirm(`Are you sure you want to delete "${p.title || "this artwork"}"?`);
  if (!ok) return;

  try {
    setMessage("Deleting artwork...", false);
    await deletePainting(p.id);

    if (editingPainting?.id === p.id) resetEditState();

    await loadArtistPaintings();
    setMessage("Artwork deleted.", false);
    setTimeout(() => clearMessage(), 2000);
  } catch (err) {
    console.error(err);
    const msg = err.data?.message || err.data?.error || err.message || "Failed to delete artwork.";
    setMessage(msg, true);
  }
}

/* ========== UTILITIES ========== */
function buildImageUrl(imageUrl) {
  if (!imageUrl) return "https://via.placeholder.com/300x200?text=No+Image";
  if (imageUrl.startsWith("http")) return imageUrl;
  return API_BASE_URL + imageUrl;
}

function setMessage(text, isError = false) {
  if (!els.msg) return;
  
  const bgColor = isError 
    ? "bg-red-50 border-red-200 text-red-700" 
    : "bg-blue-50 border-blue-200 text-blue-700";
  
  const icon = isError
    ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  
  els.msg.innerHTML = `
    <div class="${bgColor} border rounded-xl p-4 flex items-center gap-3 animate-fade-in">
      ${icon}
      <p class="text-sm font-medium">${text}</p>
    </div>
  `;
  els.msg.classList.remove("hidden");
}

function clearMessage() {
  if (!els.msg) return;
  els.msg.innerHTML = "";
  els.msg.classList.add("hidden");
}

/* ========== GLOBAL FUNCTIONS ========== */
window.copyCID = function(cid) {
  navigator.clipboard.writeText(cid).then(() => {
    alert("✅ Certificate ID copied to clipboard!");
  }).catch(err => {
    console.error("Failed to copy:", err);
    alert("Failed to copy. Please select and copy manually.");
  });
};

window.refreshEarnings = async function() {
  const container = document.getElementById("earnings-content");
  if (container) {
    container.innerHTML = `
      <div class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    `;
  }
  await loadArtistEarnings();
};

window.refreshSales = async function() {
  const container = document.getElementById("sales-analytics-content");
  if (container) {
    container.innerHTML = `
      <div class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    `;
  }
  await loadSalesAnalytics();
};