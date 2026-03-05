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
  getUserOrders,  // Add this import
} from "./api.js";

let currentUser = null;
let currentArtistProfile = null;
let categories = [];
let editingPainting = null;
let artistSalesData = null;

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  // Grab all DOM elements now that DOM is fully loaded
  els.msg = document.getElementById("dashboard-message");

  els.usernameLabel = document.getElementById("artist-username");
  els.roleLabel = document.getElementById("artist-role-label");
  els.artistName = document.getElementById("artist-name");
  els.artistBioText = document.getElementById("artist-bio-text");
  els.artistImage = document.getElementById("artist-profile-image");
  els.avatarButton = document.getElementById("artist-avatar-button");

  els.profileFormWrap = document.getElementById("artist-profile-form-wrap");
  els.profileModeLabel = document.getElementById("profile-mode-label");
  els.profileForm = document.getElementById("artist-profile-form");
  els.bioInput = document.getElementById("artist-bio");
  els.socialInput = document.getElementById("artist-social-links");
  els.pictureInput = document.getElementById("artist-picture");
  els.profileSubmit = document.getElementById("artist-profile-submit");
  els.profileToggleBtn = document.getElementById("edit-profile-btn");

  els.paintingsList = document.getElementById("artist-paintings-list");
  els.paintingsMsg = document.getElementById("artist-paintings-message");

  els.newPaintingToggle = document.getElementById("toggle-new-painting-form");
  els.newPaintingWrap = document.getElementById("new-painting-form-wrap");
  els.newPaintingForm = document.getElementById("new-painting-form");
  els.npCategorySelect = document.getElementById("np-category");

  els.logoutBtn = document.getElementById("logout-btn");

  // Now that elements are set, run the logic
  initAuthGuard();
  bindEvents();
  loadDashboardData();
});

/* ===== Auth guard: only allow artists ===== */

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
  if (els.roleLabel) {
    els.roleLabel.textContent = "Artist account";
  }
}

/* ===== Events ===== */

function bindEvents() {
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
      window.location.href = "./login.html";
    });
  }

  // Toggle profile form when clicking avatar or "Edit profile" button
  if (els.avatarButton && els.profileFormWrap) {
    els.avatarButton.addEventListener("click", toggleProfileForm);
  }
  if (els.profileToggleBtn && els.profileFormWrap) {
    els.profileToggleBtn.addEventListener("click", toggleProfileForm);
  }

  if (els.profileForm) {
    els.profileForm.addEventListener("submit", onProfileSubmit);
  }

  // NEW painting: single toggle handler
  if (els.newPaintingToggle && els.newPaintingWrap) {
    els.newPaintingToggle.addEventListener("click", () => {
      // If we're currently editing and user clicks again → cancel edit
      if (editingPainting) {
        resetEditState();
        els.newPaintingWrap.classList.add("hidden");
        return;
      }

      const hidden = els.newPaintingWrap.classList.contains("hidden");
      els.newPaintingWrap.classList.toggle("hidden", !hidden);
      if (hidden) {
        els.newPaintingWrap.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  // NEW painting: single submit handler
  if (els.newPaintingForm) {
    els.newPaintingForm.addEventListener("submit", onNewPaintingSubmit);
  }
}

function toggleProfileForm() {
  if (!els.profileFormWrap) return;
  const isHidden = els.profileFormWrap.classList.contains("hidden");
  if (isHidden) {
    els.profileFormWrap.classList.remove("hidden");
    els.profileFormWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    els.profileFormWrap.classList.add("hidden");
  }
}

/* ===== Data loading ===== */

async function loadDashboardData() {
  clearMessage();
  setMessage("Loading your artist dashboard...", false);

  try {
    await loadCategories();
    await loadArtistProfile();
    await loadArtistPaintings();
    await loadArtistEarnings();
    await loadSalesAnalytics();  // NEW: Load sales data
    clearMessage();
  } catch (err) {
    console.error(err);
    setMessage("Failed to load dashboard data. Please refresh.", true);
  }
}

async function loadCategories() {
  if (!els.npCategorySelect) return;

  const data = await getAllCategories();
  categories = Array.isArray(data) ? data : [];

  els.npCategorySelect.innerHTML = `
    <option value="">Select category (optional)</option>
  `;

  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name || `Category #${cat.id}`;
    els.npCategorySelect.appendChild(opt);
  });
}

async function loadArtistProfile() {
  const data = await getArtists(); // { artists: [...] }
  const artists = data && data.artists ? data.artists : [];

  currentArtistProfile =
    artists.find((a) => String(a.user_id) === String(currentUser.id)) || null;

  if (!currentArtistProfile) {
    if (els.profileModeLabel) {
      els.profileModeLabel.textContent = "New profile";
    }
    if (els.artistBioText) {
      els.artistBioText.textContent =
        "You haven't created your artist profile yet. Click your picture to get started.";
    }
    if (els.bioInput) els.bioInput.value = "";
    if (els.socialInput) els.socialInput.value = "";
    if (els.artistImage) {
      els.artistImage.src = "https://via.placeholder.com/150?text=Artist";
    }
    return;
  }

  if (els.profileModeLabel) {
    els.profileModeLabel.textContent = "Update profile";
  }
  if (els.artistBioText) {
    els.artistBioText.textContent = currentArtistProfile.bio || "";
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
}

async function loadArtistPaintings() {
  if (!els.paintingsList || !els.paintingsMsg) return;

  els.paintingsList.innerHTML = "";
  els.paintingsMsg.classList.add("hidden");

  const all = await getAllPaintings();
  const paintings = Array.isArray(all) ? all : [];

  let myPaintings = [];
  if (currentArtistProfile) {
    myPaintings = paintings.filter(
      (p) => String(p.artist_id) === String(currentArtistProfile.id)
    );
  } else {
    myPaintings = [];
  }

  if (!myPaintings.length) {
    els.paintingsMsg.textContent =
      "You have not added any paintings yet. Use the form above to create one.";
    els.paintingsMsg.classList.remove("hidden");
    return;
  }

  myPaintings.forEach((p) => {
    const card = document.createElement("div");
    card.className =
      "bg-white border rounded-lg overflow-hidden shadow-sm text-sm flex flex-col";

    const imgUrl = buildImageUrl(p.image_url);

    // Format price
    const formattedPrice = new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(p.price);

    // Get sales status
    const salesStatus = getSalesStatusForPainting(p.id);

    // Build certificate UI
    let certificateHtml = "";
    if (p.ipfs_cid) {
      certificateHtml = `
        <div class="p-3 bg-green-50 border-t">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
            <span class="text-xs font-medium text-green-800">Hakika ya Kienyeji ✅</span>
          </div>
          <a href="${p.qr_code_url}" target="_blank" class="text-xs text-blue-600 hover:underline mt-1 block">
            View/Download QR Code
          </a>
          <button 
            type="button"
            onclick="copyCID('${p.ipfs_cid}')"
            class="text-xs text-gray-500 hover:text-gray-700 mt-1"
          >
            Copy Certificate ID
          </button>
        </div>
      `;
    } else if (p.message && p.message.includes("certificate generation failed")) {
      certificateHtml = `
        <div class="p-3 bg-yellow-50 border-t">
          <span class="text-xs text-yellow-700">⚠️ Certificate failed. Retry later.</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="w-full h-40 bg-gray-100 overflow-hidden">
        <img src="${imgUrl}" alt="${p.title || "Painting"}"
             class="w-full h-full object-cover" />
      </div>
      <div class="p-3 space-y-1 flex-1">
        <p class="font-semibold text-gray-800 truncate">${p.title || "Untitled"}</p>
        <p class="text-xs text-gray-500">${formattedPrice}</p>
        <p class="text-xs text-gray-400">ID: ${p.id}</p>
        ${salesStatus ? `
          <div class="mt-2">
            <span class="text-xs px-2 py-1 rounded ${
              salesStatus.sold ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }">
              ${salesStatus.sold ? `Sold ${salesStatus.count}x` : 'Not sold yet'}
            </span>
            ${salesStatus.revenue > 0 ? `
              <p class="text-xs text-green-600 mt-1">Revenue: KSH ${salesStatus.revenue.toLocaleString()}</p>
            ` : ''}
          </div>
        ` : ''}
      </div>
      ${certificateHtml}
      <div class="px-3 pb-3 pt-2 border-t flex items-center justify-between gap-2">
        <button
          type="button"
          class="text-xs text-indigo-600 hover:underline"
          data-action="edit"
        >
          Edit
        </button>
        <button
          type="button"
          class="text-xs text-red-600 hover:underline"
          data-action="delete"
        >
          Delete
        </button>
      </div>
    `;

    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');

    editBtn.addEventListener("click", () => startEditPainting(p));
    deleteBtn.addEventListener("click", () => onDeletePainting(p));

    els.paintingsList.appendChild(card);
  });
}

/* ===== Enhanced Earnings & Sales Tracking ===== */

async function loadArtistEarnings() {
  if (!currentArtistProfile) return;
  
  const artistId = currentArtistProfile.id;
  const token = localStorage.getItem("auth_token");
  
  try {
    // Get balance using imported API function
    const balance = await getArtistBalance(artistId, token);
    
    // Get recent payouts using imported API function
    let payouts = [];
    try {
      payouts = await getArtistPayouts(artistId, token);
    } catch (error) {
      console.log("No payouts found yet");
      payouts = [];
    }
    
    renderEarnings(balance, payouts);
  } catch (error) {
    console.error("Failed to load earnings:", error);
    // Show a message but don't fail the whole dashboard
    const container = document.getElementById("earnings-content");
    if (container) {
      container.innerHTML = `
        <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-sm text-yellow-800">Unable to load earnings data. Please try again later.</p>
        </div>
      `;
    }
  }
}

async function loadSalesAnalytics() {
  if (!currentArtistProfile) return;
  
  try {
    const token = localStorage.getItem("auth_token");
    
    // Get all orders to find sales
    const response = await fetch(`${API_BASE_URL}/orders`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (response.ok) {
      const allOrders = await response.json();
      
      // Filter orders that contain our paintings
      const myPaintings = await getAllPaintings();
      const myPaintingIds = myPaintings
        .filter(p => String(p.artist_id) === String(currentArtistProfile.id))
        .map(p => p.id);
      
      // Calculate sales data
      artistSalesData = calculateSalesData(allOrders, myPaintingIds);
      renderSalesAnalytics(artistSalesData);
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
    // Check if order contains our paintings
    const orderDetails = order.details || [];
    const relevantDetails = orderDetails.filter(d => 
      myPaintingIds.includes(d.painting_id)
    );
    
    if (relevantDetails.length > 0 && order.status === 'paid') {
      relevantDetails.forEach(detail => {
        const revenue = detail.price * detail.quantity;
        salesData.totalSales += detail.quantity;
        salesData.totalRevenue += revenue;
        
        // Track by painting
        if (!salesData.paintingSales[detail.painting_id]) {
          salesData.paintingSales[detail.painting_id] = {
            count: 0,
            revenue: 0,
            sold: false
          };
        }
        salesData.paintingSales[detail.painting_id].count += detail.quantity;
        salesData.paintingSales[detail.painting_id].revenue += revenue;
        salesData.paintingSales[detail.painting_id].sold = true;
        
        // Track by month
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
      
      // Add to recent orders
      salesData.recentOrders.push({
        orderId: order.id,
        date: order.created_at,
        items: relevantDetails,
        total: relevantDetails.reduce((sum, d) => sum + (d.price * d.quantity), 0)
      });
    }
  });
  
  // Sort recent orders by date
  salesData.recentOrders.sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  return salesData;
}

function getSalesStatusForPainting(paintingId) {
  if (!artistSalesData || !artistSalesData.paintingSales) return null;
  return artistSalesData.paintingSales[paintingId] || { sold: false, count: 0, revenue: 0 };
}

function renderEarnings(balance, payouts) {
  const container = document.getElementById("earnings-content");
  if (!container) return;
  
  const recentPayouts = Array.isArray(payouts) ? payouts.slice(0, 5) : [];
  
  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-xs text-gray-600 mb-1">Pending Balance</p>
        <p class="text-xl font-bold text-yellow-700">
          KSH ${(balance.pending_balance || 0).toLocaleString()}
        </p>
        <p class="text-xs text-gray-500 mt-1">Awaiting payout</p>
      </div>
      
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <p class="text-xs text-gray-600 mb-1">Total Earned</p>
        <p class="text-xl font-bold text-green-700">
          KSH ${(balance.total_earned || 0).toLocaleString()}
        </p>
        <p class="text-xs text-gray-500 mt-1">All time</p>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-xs text-gray-600 mb-1">Commission Rate</p>
        <p class="text-xl font-bold text-blue-700">
          ${((balance.commission_rate || 0.20) * 100).toFixed(0)}%
        </p>
        <p class="text-xs text-gray-500 mt-1">Platform fee</p>
      </div>
    </div>
    
    <div class="border-t pt-4">
      <h4 class="text-sm font-semibold mb-3">Recent Payouts</h4>
      ${recentPayouts.length > 0 ? `
        <div class="space-y-2 max-h-60 overflow-y-auto">
          ${recentPayouts.map(payout => `
            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded text-xs">
              <div>
                <p class="font-medium">KSH ${(payout.payout_amount || 0).toLocaleString()}</p>
                <p class="text-gray-500">${new Date(payout.created_at).toLocaleDateString()}</p>
                ${payout.order_id ? `<p class="text-gray-400">Order #${payout.order_id}</p>` : ''}
              </div>
              <span class="px-2 py-1 rounded-full text-xs ${
                payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                payout.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }">
                ${payout.status}
              </span>
            </div>
          `).join('')}
        </div>
      ` : `
        <p class="text-xs text-gray-500">No payouts yet. Start selling to earn!</p>
      `}
    </div>
    
    <div class="mt-4 p-3 bg-gray-50 rounded-lg">
      <p class="text-xs text-gray-600">
        <strong>How payouts work:</strong><br>
        • You earn 80% of each sale (20% platform fee)<br>
        • Payouts are processed weekly on Fridays<br>
        • Minimum payout amount: KSH 500<br>
        • Payment via M-Pesa to your registered number
      </p>
    </div>
  `;
}

function renderSalesAnalytics(salesData) {
  const container = document.getElementById("sales-analytics-content");
  if (!container) return;
  
  if (!salesData) {
    container.innerHTML = `
      <div class="p-4 text-center text-sm text-gray-500">
        No sales data available yet
      </div>
    `;
    return;
  }
  
  const recentOrders = salesData.recentOrders.slice(0, 5);
  const monthlyData = Object.entries(salesData.monthlySales).slice(-6);
  
  container.innerHTML = `
    <!-- Sales Overview -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="bg-white p-3 rounded-lg border">
        <p class="text-xs text-gray-600">Total Sales</p>
        <p class="text-lg font-bold text-gray-900">${salesData.totalSales}</p>
      </div>
      <div class="bg-white p-3 rounded-lg border">
        <p class="text-xs text-gray-600">Gross Revenue</p>
        <p class="text-lg font-bold text-gray-900">KSH ${salesData.totalRevenue.toLocaleString()}</p>
      </div>
      <div class="bg-white p-3 rounded-lg border">
        <p class="text-xs text-gray-600">Your Share (80%)</p>
        <p class="text-lg font-bold text-green-600">KSH ${(salesData.totalRevenue * 0.8).toLocaleString()}</p>
      </div>
      <div class="bg-white p-3 rounded-lg border">
        <p class="text-xs text-gray-600">Platform Fee (20%)</p>
        <p class="text-lg font-bold text-gray-500">KSH ${(salesData.totalRevenue * 0.2).toLocaleString()}</p>
      </div>
    </div>
    
    <!-- Monthly Sales Chart -->
    ${monthlyData.length > 0 ? `
      <div class="bg-white p-4 rounded-lg border mb-6">
        <h4 class="text-sm font-semibold mb-3">Monthly Sales Trend</h4>
        <div class="space-y-2">
          ${monthlyData.map(([month, data]) => `
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-600 w-16">${month}</span>
              <div class="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div class="bg-indigo-600 h-6 rounded-full flex items-center justify-end pr-2" 
                     style="width: ${(data.revenue / salesData.totalRevenue * 100).toFixed(1)}%">
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
    
    <!-- Recent Orders -->
    ${recentOrders.length > 0 ? `
      <div class="bg-white p-4 rounded-lg border">
        <h4 class="text-sm font-semibold mb-3">Recent Sales</h4>
        <div class="space-y-2">
          ${recentOrders.map(order => `
            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
              <div class="text-xs">
                <p class="font-medium">Order #${order.orderId}</p>
                <p class="text-gray-500">${new Date(order.date).toLocaleDateString()}</p>
              </div>
              <div class="text-right text-xs">
                <p class="font-medium text-green-600">KSH ${order.total.toLocaleString()}</p>
                <p class="text-gray-500">${order.items.length} item(s)</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

/* ===== Handlers ===== */

async function onProfileSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;

  const bio = els.bioInput.value.trim();
  const socialLinks = els.socialInput.value.trim();
  const pictureFile = els.pictureInput.files[0] || null;

  if (!bio) {
    alert("Bio is required.");
    return;
  }

  const formData = new FormData();
  formData.append("user_id", currentUser.id);
  formData.append("bio", bio);
  if (socialLinks) {
    formData.append("social_links", socialLinks);
  }
  if (pictureFile) {
    formData.append("profile_picture", pictureFile);
  }

  try {
    setMessage("Saving profile...", false);

    let result;
    if (currentArtistProfile) {
      result = await updateArtistProfile(currentArtistProfile.id, formData);
    } else {
      result = await createArtistProfile(formData);
    }

    console.log("Profile save result", result);
    await loadArtistProfile();
    setMessage("Profile saved successfully.", false);
    setTimeout(() => clearMessage(), 1200);
  } catch (err) {
    console.error(err);
    const msg =
      (err.data && (err.data.message || err.data.error)) ||
      err.message ||
      "Failed to save profile.";
    setMessage(msg, true);
  }
}

async function onNewPaintingSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;

  if (!currentArtistProfile) {
    alert("Please create your artist profile first.");
    return;
  }

  const form = e.target;
  const title = form["np-title"].value.trim();
  const price = form["np-price"].value.trim();
  const categoryId = form["np-category"].value.trim();
  const description = form["np-description"].value.trim();
  const imageFile = form["np-image"].files[0];
  const materials = form["np-materials"]?.value.trim() || "Not specified";
  const location = form["np-location"]?.value.trim() || "Kenya";

  if (!title || !price || (!editingPainting && !imageFile)) {
    alert("Title, price, and image (for new painting) are required.");
    return;
  }

  try {
    if (editingPainting) {
      setMessage("Updating painting...", false);
      const formData = new FormData();
      formData.append("title", title);
      formData.append("price", price);
      if (categoryId) formData.append("category_id", categoryId);
      if (description) formData.append("description", description);
      if (imageFile) formData.append("image", imageFile);

      await updatePainting(editingPainting.id, formData);
      resetEditState();
    } else {
      showLoading("Uploading image and generating certificate...");

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
          const errorText = await uploadRes.text();
          console.error("Server responded with:", errorText);
          throw new Error("Image upload failed");
        }

        const result = await uploadRes.json();
        imageUrl = result.url;
      }
      
      // Safety check
      if (!currentArtistProfile || !currentArtistProfile.id) {
        alert("Artist profile not loaded. Please refresh or contact support.");
        return;
      }
      
      // Create painting via API
      const paintingData = {
        artist_id: currentArtistProfile.id,
        title,
        price: parseFloat(price),
        description,
        category_id: categoryId ? parseInt(categoryId) : null,
        image_url: imageUrl,
        materials,
        location
      };
      
      const response = await fetch(`${API_BASE_URL}/paintings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`
        },
        body: JSON.stringify(paintingData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to create painting");
      }

      const painting = await response.json();

      // SUCCESS!
      form.reset();
      if (els.npCategorySelect) els.npCategorySelect.value = "";

      // Show success message
      if (painting.ipfs_cid && painting.qr_code_url) {
        setTimeout(() => {
          alert(`
🎨 "${painting.title}" created successfully!

✅ Hakika ya Kienyeji Certificate Generated!
- Stored permanently on IPFS
- Buyers can scan QR to verify authenticity

🔗 QR Code: ${painting.qr_code_url}
🆔 Certificate ID: ${painting.ipfs_cid}

Stick the QR code on the back of your physical artwork!
          `.trim());
        }, 500);
      } else {
        alert(`🎨 "${painting.title}" created successfully!`);
      }
    }

    await loadArtistPaintings();
    setMessage("Painting saved successfully.", false);
    setTimeout(() => clearMessage(), 1200);
  } catch (err) {
    console.error(err);
    const msg =
      (err.data && (err.data.message || err.data.error)) ||
      err.message ||
      "Failed to save painting.";
    setMessage(msg, true);
  }
}

/* ===== Helpers ===== */

function buildImageUrl(imageUrl) {
  if (!imageUrl) {
    return "https://via.placeholder.com/300x200?text=No+Image";
  }
  if (imageUrl.startsWith("http")) return imageUrl;
  return API_BASE_URL + imageUrl;
}

function setMessage(text, isError = false) {
  if (!els.msg) return;
  els.msg.textContent = text;
  els.msg.classList.remove("hidden");
  els.msg.classList.toggle("text-red-600", isError);
  els.msg.classList.toggle("text-green-600", !isError);
}

function clearMessage() {
  if (!els.msg) return;
  els.msg.textContent = "";
  els.msg.classList.add("hidden");
}

function startEditPainting(p) {
  editingPainting = p;

  if (els.newPaintingWrap.classList.contains("hidden")) {
    els.newPaintingWrap.classList.remove("hidden");
    els.newPaintingWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const form = els.newPaintingForm;
  if (!form) return;

  form["np-title"].value = p.title || "";
  form["np-price"].value = p.price || "";
  form["np-description"].value = p.description || "";

  if (els.npCategorySelect) {
    els.npCategorySelect.value = p.category_id || "";
  }

  if (els.newPaintingToggle) {
    els.newPaintingToggle.textContent = "Cancel edit";
  }
}

function resetEditState() {
  editingPainting = null;

  if (els.newPaintingForm) {
    els.newPaintingForm.reset();
  }
  if (els.npCategorySelect) {
    els.npCategorySelect.value = "";
  }
  if (els.newPaintingToggle) {
    els.newPaintingToggle.textContent = "+ Add new painting";
  }
}

async function onDeletePainting(p) {
  const ok = window.confirm(
    `Are you sure you want to delete "${p.title || "this painting"}"?`
  );
  if (!ok) return;

  try {
    setMessage("Deleting painting...", false);
    await deletePainting(p.id);

    if (editingPainting && editingPainting.id === p.id) {
      resetEditState();
    }

    await loadArtistPaintings();
    setMessage("Painting deleted.", false);
    setTimeout(() => clearMessage(), 1200);
  } catch (err) {
    console.error(err);
    const msg =
      (err.data && (err.data.message || err.data.error)) ||
      err.message ||
      "Failed to delete painting.";
    setMessage(msg, true);
  }
}

// Helper: Copy Certificate ID to clipboard
window.copyCID = function(cid) {
  navigator.clipboard.writeText(cid).then(() => {
    alert("✅ Certificate ID copied to clipboard!\n\nBuyers can use this to verify authenticity on IPFS.");
  }).catch(err => {
    console.error("Failed to copy:", err);
    alert("Failed to copy. Please select and copy manually.");
  });
}

function showLoading(text = "Processing...") {
  if (!els.msg) return;
  els.msg.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
      <span>${text}</span>
    </div>
  `;
  els.msg.classList.remove("hidden");
  els.msg.classList.remove("text-red-600", "text-green-600");
}

window.refreshEarnings = async function() {
  const container = document.getElementById("earnings-content");
  if (container) {
    container.innerHTML = `
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span class="ml-2 text-sm text-gray-600">Refreshing earnings...</span>
      </div>
    `;
  }
  await loadArtistEarnings();
}

window.refreshSales = async function() {
  const container = document.getElementById("sales-analytics-content");
  if (container) {
    container.innerHTML = `
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span class="ml-2 text-sm text-gray-600">Refreshing sales data...</span>
      </div>
    `;
  }
  await loadSalesAnalytics();
}


// At the end of artist-dashboard.js - Make functions globally available
window.refreshEarnings = async function() {
  const container = document.getElementById("earnings-content");
  if (container) {
    container.innerHTML = `
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span class="ml-2 text-sm text-gray-600">Refreshing earnings...</span>
      </div>
    `;
  }
  await loadArtistEarnings();
}

window.refreshSales = async function() {
  const container = document.getElementById("sales-analytics-content");
  if (container) {
    container.innerHTML = `
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span class="ml-2 text-sm text-gray-600">Refreshing sales data...</span>
      </div>
    `;
  }
  await loadSalesAnalytics();
}

// Also make loadArtistEarnings and loadSalesAnalytics accessible if needed
window.loadArtistEarnings = loadArtistEarnings;
window.loadSalesAnalytics = loadSalesAnalytics;