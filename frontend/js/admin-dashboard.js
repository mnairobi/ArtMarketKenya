// js/admin-dashboard.js
// At the top of the file
import { initCategoryManagement, loadCategories } from "./admin-categories.js";

// In your showSection function, add handling for categories:
function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll("section").forEach(s => s.classList.add("hidden"));
  
  // Show selected section
  const section = document.getElementById(`${sectionName}-section`);
  if (section) {
    section.classList.remove("hidden");
  }
  
  // Load data for specific sections
  if (sectionName === "categories") {
    loadCategories();
  }
  
  // Update navigation active state
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("bg-amber-50", "text-amber-700");
    if (link.dataset.section === sectionName) {
      link.classList.add("bg-amber-50", "text-amber-700");
    }
  });
}

// Make sure to initialize
document.addEventListener("DOMContentLoaded", () => {
  // ... your existing init code
  initCategoryManagement();
});
import { 
  API_BASE_URL,
  getAllOrders,
  getAllUsers,
  getArtists,
  getAllPaintings,
  getAllPayments,
  getPlatformEarnings,
  getAllPayouts,
  processBulkPayouts,
  processPayout as processPayoutAPI,
  updateUser,
  suspendUser,
  // Delivery imports
  updateDelivery,
  shipDelivery,
  getAllDeliveries,
  markAsDelivered,
  markAsProcessing,
  cancelDelivery,
  updateTrackingInfo,
} from "./api.js";

let currentUser = null;
let currentTab = 'orders';
let dashboardData = {
  orders: [],
  users: [],
  artists: [],
  paintings: [],
  payments: [],
  payouts: [],
  deliveries: []
};

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  setupEventListeners();
  loadDashboardData();
});

// ==================== AUTH & INITIALIZATION ====================

function initAuth() {
  try {
    const rawUser = localStorage.getItem("auth_user");
    const token = localStorage.getItem("auth_token");
    
    if (!rawUser || !token) {
      window.location.href = "./login.html";
      return;
    }
    
    currentUser = JSON.parse(rawUser);
    
    if (currentUser.role !== "admin") {
      alert("Access denied. Admin privileges required.");
      window.location.href = "./index.html";
      return;
    }
    
    const usernameEl = document.getElementById("admin-username");
    if (usernameEl) {
      usernameEl.textContent = currentUser.username || currentUser.email || "Admin";
    }
  } catch (e) {
    console.error("Auth error:", e);
    window.location.href = "./login.html";
  }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
      window.location.href = "./login.html";
    });
  }

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Filters
  const orderFilter = document.getElementById("order-status-filter");
  if (orderFilter) {
    orderFilter.addEventListener("change", filterOrders);
  }

  const userSearch = document.getElementById("user-search");
  if (userSearch) {
    userSearch.addEventListener("input", filterUsers);
  }

  const roleFilter = document.getElementById("user-role-filter");
  if (roleFilter) {
    roleFilter.addEventListener("change", filterUsers);
  }
}

// ==================== TAB MANAGEMENT ====================

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.className = "tab-btn py-3 px-4 border-b-2 border-indigo-500 font-medium text-sm text-indigo-600 whitespace-nowrap";
    } else {
      btn.className = "tab-btn py-3 px-4 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap";
    }
  });
  
  // Show/hide tab contents
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.add("hidden");
  });
  
  const activeTab = document.getElementById(`${tabName}-tab`);
  if (activeTab) {
    activeTab.classList.remove("hidden");
  }
  
  // Refresh data for active tab
  refreshTabData(tabName);
}

function refreshTabData(tab) {
  switch(tab) {
    case 'orders':
      renderOrders();
      break;
    case 'deliveries':
      renderDeliveries();
      break;
    case 'users':
      renderUsers();
      break;
    case 'artists':
      renderArtists();
      renderPaintings();
      break;
    case 'payments':
      renderPayments();
      loadPayoutManagement();
      break;
    case 'analytics':
      initCharts();
      break;
  }
}

// ==================== DATA LOADING ====================

async function loadDashboardData() {
  showMessage("Loading dashboard...", false);
  
  try {
    const token = localStorage.getItem("auth_token");
    
    // Load all data in parallel
    const results = await Promise.allSettled([
      getAllOrders(token),
      getAllUsers(token),
      getArtists(),
      getAllPaintings(),
      getAllPayments(token),
      getAllDeliveries(token)
    ]);
    
    // Process results
    dashboardData.orders = results[0].status === 'fulfilled' ? results[0].value : [];
    dashboardData.users = results[1].status === 'fulfilled' ? results[1].value : [];
    
    const artistsResult = results[2].status === 'fulfilled' ? results[2].value : { artists: [] };
    dashboardData.artists = artistsResult.artists || artistsResult || [];
    
    dashboardData.paintings = results[3].status === 'fulfilled' ? results[3].value : [];
    dashboardData.payments = results[4].status === 'fulfilled' ? results[4].value : [];
    dashboardData.deliveries = results[5].status === 'fulfilled' ? results[5].value : [];
    
    hideMessage();
    updateStats();
    renderDashboard();
    
  } catch (error) {
    console.error("Dashboard load error:", error);
    showMessage("Failed to load dashboard data", true);
  }
}

function updateStats() {
  const orders = dashboardData.orders || [];
  const deliveries = dashboardData.deliveries || [];
  
  const stats = {
    totalRevenue: orders
      .filter(o => o.status === 'paid' || o.status === 'completed')
      .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    totalArtists: dashboardData.artists.length,
    totalPaintings: dashboardData.paintings.length,
    totalUsers: dashboardData.users.length,
    totalDeliveries: deliveries.length,
    pendingDeliveries: deliveries.filter(d => d.status === 'pending').length
  };
  
  // Update UI
  setText('total-revenue', `Ksh ${stats.totalRevenue.toLocaleString()}`);
  setText('total-orders', stats.totalOrders);
  setText('pending-orders', `${stats.pendingOrders} pending`);
  setText('total-artists', stats.totalArtists);
  setText('total-paintings', stats.totalPaintings);
  setText('total-users', stats.totalUsers);
  setText('total-deliveries', stats.totalDeliveries);
  setText('pending-deliveries', `${stats.pendingDeliveries} pending`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ==================== RENDER FUNCTIONS ====================

function renderDashboard() {
  renderOrders();
  renderUsers();
  renderArtists();
  renderPaintings();
  renderPayments();
  renderDeliveries();
}

function renderOrders() {
  const tbody = document.getElementById("orders-table");
  if (!tbody) return;
  
  const orders = dashboardData.orders.slice(0, 20);
  
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No orders found</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(order => {
    const date = new Date(order.created_at).toLocaleDateString();
    const paymentBadge = getPaymentBadge(order.status);
    
    // Find delivery for this order
    const delivery = dashboardData.deliveries.find(d => d.order_id === order.id);
    const deliveryBadge = delivery ? getDeliveryBadge(delivery.status) : '<span class="text-xs text-gray-400">-</span>';
    
    return `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${order.id}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${order.buyer?.name || order.buyer?.email || 'N/A'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          Ksh ${(parseFloat(order.total) || 0).toLocaleString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">${paymentBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap">${deliveryBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          <button onclick="viewOrder(${order.id})" class="text-indigo-600 hover:text-indigo-900 mr-2">View</button>
          ${delivery ? `
            <button onclick="openShipModal(${delivery.id})" class="text-green-600 hover:text-green-900">
              Ship
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function renderUsers() {
  const tbody = document.getElementById("users-table");
  if (!tbody) return;
  
  const users = dashboardData.users || [];
  
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No users found</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(user => {
    const joined = new Date(user.created_at).toLocaleDateString();
    const roleBadge = getRoleBadge(user.role);
    const statusBadge = user.is_active !== false 
      ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>'
      : '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactive</span>';
    
    return `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 text-sm text-gray-500">${user.id}</td>
        <td class="px-6 py-4 text-sm font-medium text-gray-900">${user.name || user.username || 'N/A'}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${user.email}</td>
        <td class="px-6 py-4">${roleBadge}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${joined}</td>
        <td class="px-6 py-4">${statusBadge}</td>
        <td class="px-6 py-4 text-sm">
          <button onclick="openUserModal(${user.id})" class="text-indigo-600 hover:text-indigo-900 mr-2">Edit</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderArtists() {
  const container = document.getElementById("artists-list");
  if (!container) return;
  
  const artists = dashboardData.artists || [];
  
  if (!artists.length) {
    container.innerHTML = '<p class="text-center py-4 text-gray-500">No artists found</p>';
    return;
  }
  
  container.innerHTML = artists.map(artist => {
    const paintingCount = dashboardData.paintings.filter(p => p.artist_id === artist.id).length;
    const imgSrc = artist.profile_picture 
      ? (artist.profile_picture.startsWith('http') ? artist.profile_picture : `${API_BASE_URL}${artist.profile_picture}`)
      : 'https://via.placeholder.com/40';
    
    return `
      <div class="p-3 hover:bg-white rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="${imgSrc}" alt="Artist" class="w-10 h-10 rounded-full object-cover">
            <div>
              <p class="text-sm font-medium text-gray-900">${artist.user?.name || artist.user?.username || 'Artist'}</p>
              <p class="text-xs text-gray-500">${paintingCount} paintings</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPaintings() {
  const container = document.getElementById("paintings-grid");
  if (!container) return;
  
  const paintings = dashboardData.paintings.slice(0, 6);
  
  if (!paintings.length) {
    container.innerHTML = '<p class="text-center py-4 text-gray-500 col-span-2">No paintings found</p>';
    return;
  }
  
  container.innerHTML = paintings.map(painting => {
    const imgSrc = painting.image_url 
      ? (painting.image_url.startsWith('http') ? painting.image_url : `${API_BASE_URL}${painting.image_url}`)
      : 'https://via.placeholder.com/100';
    
    return `
      <div class="relative group">
        <img src="${imgSrc}" alt="${painting.title}" class="w-full h-24 object-cover rounded-lg">
        <p class="text-xs mt-1 truncate">${painting.title}</p>
        <p class="text-xs text-gray-500">Ksh ${painting.price}</p>
      </div>
    `;
  }).join('');
}

function renderPayments() {
  const tbody = document.getElementById("payments-table");
  if (!tbody) return;
  
  const payments = Array.isArray(dashboardData.payments) ? dashboardData.payments.slice(0, 5) : [];
  
  if (!payments.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-xs text-gray-500">No payments found</td></tr>';
    return;
  }
  
  tbody.innerHTML = payments.map(payment => {
    const statusBadge = payment.status === 'completed'
      ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Completed</span>'
      : '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>';
    
    return `
      <tr>
        <td class="px-4 py-2 text-xs">${payment.id}</td>
        <td class="px-4 py-2 text-xs">#${payment.order_id}</td>
        <td class="px-4 py-2 text-xs">Ksh ${payment.amount}</td>
        <td class="px-4 py-2 text-xs">${payment.method || 'M-Pesa'}</td>
        <td class="px-4 py-2">${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

// ==================== DELIVERY MANAGEMENT ====================

function renderDeliveries() {
  const container = document.getElementById("deliveries-section");
  if (!container) return;

  const deliveries = dashboardData.deliveries || [];
  
  const pending = deliveries.filter(d => d.status === 'pending');
  const processing = deliveries.filter(d => d.status === 'processing');
  const shipping = deliveries.filter(d => d.status === 'shipping');
  const delivered = deliveries.filter(d => d.status === 'delivered');

  container.innerHTML = `
    <!-- Delivery Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <span class="text-xl">⏳</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-yellow-700">${pending.length}</p>
            <p class="text-xs text-yellow-600">Pending</p>
          </div>
        </div>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span class="text-xl">📦</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-blue-700">${processing.length}</p>
            <p class="text-xs text-blue-600">Processing</p>
          </div>
        </div>
      </div>
      
      <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <span class="text-xl">🚚</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-indigo-700">${shipping.length}</p>
            <p class="text-xs text-indigo-600">Shipping</p>
          </div>
        </div>
      </div>
      
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span class="text-xl">✅</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-green-700">${delivered.length}</p>
            <p class="text-xs text-green-600">Delivered</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <select id="delivery-status-filter" onchange="filterDeliveriesHandler()" 
              class="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500">
        <option value="all">All Deliveries</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="shipping">Shipping</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
      
      <button onclick="refreshDeliveriesHandler()" 
              class="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg flex items-center gap-2">
        🔄 Refresh
      </button>
      
      <button onclick="exportDeliveriesHandler()" 
              class="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2">
        📥 Export CSV
      </button>
    </div>

    <!-- Deliveries Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody id="deliveries-table" class="bg-white divide-y divide-gray-200">
            <!-- JS will populate -->
          </tbody>
        </table>
      </div>
    </div>

    ${deliveries.length === 0 ? `
      <div class="text-center py-12 bg-gray-50 rounded-lg mt-4">
        <p class="text-gray-500">No deliveries found</p>
        <p class="text-sm text-gray-400 mt-1">Deliveries appear when orders are paid</p>
      </div>
    ` : ''}
  `;

  renderDeliveriesTable(deliveries);
}

function renderDeliveriesTable(deliveries) {
  const tbody = document.getElementById("deliveries-table");
  if (!tbody) return;

  if (!deliveries || deliveries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-gray-500">No deliveries found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = deliveries.map(delivery => {
    const statusBadge = getDeliveryStatusBadge(delivery.status);
    const address = delivery.address || {};
    const buyer = delivery.buyer || {};
    const order = delivery.order || {};

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-4">
          <p class="text-sm font-medium text-gray-900">#${delivery.order_id}</p>
          <p class="text-xs text-gray-500">KSH ${(order.total || 0).toLocaleString()}</p>
        </td>
        <td class="px-4 py-4">
          <p class="text-sm font-medium text-gray-900">${buyer.name || 'N/A'}</p>
          <p class="text-xs text-gray-500">${buyer.email || ''}</p>
        </td>
        <td class="px-4 py-4">
          <p class="text-xs text-gray-600">${address.street || '-'}</p>
          <p class="text-xs text-gray-500">${address.town || ''}, ${address.county || ''}</p>
        </td>
        <td class="px-4 py-4">${statusBadge}</td>
        <td class="px-4 py-4">
          ${delivery.tracking_number 
            ? `<p class="text-sm font-mono">${delivery.tracking_number}</p>
               <p class="text-xs text-gray-500">${delivery.carrier || ''}</p>`
            : '<span class="text-xs text-gray-400">No tracking</span>'
          }
        </td>
        <td class="px-4 py-4">
          <div class="flex flex-wrap gap-1">
            ${getDeliveryActionButtons(delivery)}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getDeliveryActionButtons(delivery) {
  let buttons = '';
  
  switch(delivery.status) {
    case 'pending':
      buttons = `
        <button onclick="handleMarkAsProcessing(${delivery.id})" 
                class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
          Process
        </button>
        <button onclick="openShipModal(${delivery.id})" 
                class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">
          Ship
        </button>
      `;
      break;
    case 'processing':
      buttons = `
        <button onclick="openShipModal(${delivery.id})" 
                class="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">
          Ship Now
        </button>
      `;
      break;
    case 'shipping':
      buttons = `
        <button onclick="handleMarkAsDelivered(${delivery.id})" 
                class="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
          Delivered
        </button>
        <button onclick="openUpdateTrackingModal(${delivery.id}, '${delivery.tracking_number || ''}', '${delivery.carrier || ''}')" 
                class="text-xs text-indigo-600 hover:underline">
          Update
        </button>
      `;
      break;
    case 'delivered':
      buttons = '<span class="text-xs text-green-600">✅ Complete</span>';
      break;
    case 'cancelled':
      buttons = '<span class="text-xs text-red-600">❌ Cancelled</span>';
      break;
  }
  
  buttons += `
    <button onclick="viewOrder(${delivery.order_id})" 
            class="text-xs text-gray-500 hover:text-gray-700">
      View
    </button>
  `;
  
  return buttons;
}

function getDeliveryStatusBadge(status) {
  const badges = {
    'pending': '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">⏳ Pending</span>',
    'processing': '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">📦 Processing</span>',
    'shipping': '<span class="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">🚚 Shipping</span>',
    'delivered': '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✅ Delivered</span>',
    'cancelled': '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">❌ Cancelled</span>'
  };
  return badges[status] || badges['pending'];
}

// ==================== PAYOUT MANAGEMENT ====================

async function loadPayoutManagement() {
  const container = document.getElementById("payout-management-section");
  if (!container) return;
  
  const token = localStorage.getItem("auth_token");
  
  try {
    const [earnings, allPayouts] = await Promise.all([
      getPlatformEarnings(token),
      getAllPayouts(token)
    ]);
    
    const pendingPayouts = Array.isArray(allPayouts) 
      ? allPayouts.filter(p => p.status === 'pending') 
      : [];
    
    container.innerHTML = `
      <div class="bg-white rounded-lg p-4">
        <h3 class="text-md font-semibold mb-4">Payout Management</h3>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="bg-green-50 p-3 rounded">
            <p class="text-xs text-gray-600">Platform Earnings</p>
            <p class="text-xl font-bold text-green-600">KSH ${(earnings.total_earned || 0).toLocaleString()}</p>
          </div>
          <div class="bg-yellow-50 p-3 rounded">
            <p class="text-xs text-gray-600">Pending Payouts</p>
            <p class="text-xl font-bold text-yellow-600">${pendingPayouts.length}</p>
          </div>
        </div>
        
        ${pendingPayouts.length > 0 ? `
          <button onclick="processAllPayouts()" 
                  class="w-full py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
            Process All Payouts
          </button>
        ` : '<p class="text-sm text-gray-500 text-center">No pending payouts</p>'}
      </div>
    `;
  } catch (error) {
    console.error("Failed to load payouts:", error);
    container.innerHTML = '<p class="text-sm text-red-500">Failed to load payout data</p>';
  }
}

// ==================== CHARTS ====================

function initCharts() {
  // Sales Chart
  const salesCtx = document.getElementById('sales-chart')?.getContext('2d');
  if (salesCtx && typeof Chart !== 'undefined') {
    new Chart(salesCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Sales (KSH)',
          data: [12000, 19000, 15000, 25000, 22000, 30000],
          borderColor: 'rgb(79, 70, 229)',
          tension: 0.1
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  
  // Category Chart
  const categoryCtx = document.getElementById('category-chart')?.getContext('2d');
  if (categoryCtx && typeof Chart !== 'undefined') {
    new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: ['Landscape', 'Portrait', 'Abstract', 'Wildlife'],
        datasets: [{
          data: [30, 25, 25, 20],
          backgroundColor: ['#4F46E5', '#22C55E', '#EAB308', '#EF4444']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

// ==================== BADGE HELPERS ====================

function getPaymentBadge(status) {
  const badges = {
    'paid': '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Paid</span>',
    'pending': '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>',
    'failed': '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Failed</span>',
    'completed': '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Completed</span>'
  };
  return badges[status] || badges['pending'];
}

function getDeliveryBadge(status) {
  const badges = {
    'pending': '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>',
    'processing': '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Processing</span>',
    'shipping': '<span class="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">Shipping</span>',
    'delivered': '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Delivered</span>',
    'cancelled': '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Cancelled</span>'
  };
  return badges[status] || badges['pending'];
}

function getRoleBadge(role) {
  const badges = {
    'admin': '<span class="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">Admin</span>',
    'artist': '<span class="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">Artist</span>',
    'buyer': '<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Buyer</span>'
  };
  return badges[role] || badges['buyer'];
}

// ==================== MESSAGE HELPERS ====================

function showMessage(text, isError = false) {
  const msg = document.getElementById("admin-message");
  if (msg) {
    msg.textContent = text;
    msg.classList.remove("hidden");
    msg.className = `mb-4 text-sm text-center ${isError ? 'text-red-600' : 'text-gray-600'}`;
  }
}

function hideMessage() {
  const msg = document.getElementById("admin-message");
  if (msg) msg.classList.add("hidden");
}

function showToast(message, type = "info") {
  document.querySelectorAll(".toast-notification").forEach(t => t.remove());
  
  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500"
  };
  
  const toast = document.createElement("div");
  toast.className = `toast-notification fixed bottom-4 right-4 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg z-50`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// ==================== FILTER FUNCTIONS ====================

function filterOrders() {
  const filter = document.getElementById("order-status-filter")?.value;
  let filtered = dashboardData.orders;
  
  if (filter && filter !== 'all') {
    filtered = dashboardData.orders.filter(o => o.status === filter);
  }
  
  const tbody = document.getElementById("orders-table");
  if (tbody && filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No orders found</td></tr>';
  } else {
    // Re-render with filtered data
    const temp = dashboardData.orders;
    dashboardData.orders = filtered;
    renderOrders();
    dashboardData.orders = temp;
  }
}

function filterUsers() {
  const search = document.getElementById("user-search")?.value.toLowerCase() || '';
  const role = document.getElementById("user-role-filter")?.value || 'all';
  
  let filtered = dashboardData.users;
  
  if (search) {
    filtered = filtered.filter(u => 
      (u.name?.toLowerCase().includes(search)) ||
      (u.email?.toLowerCase().includes(search)) ||
      (u.username?.toLowerCase().includes(search))
    );
  }
  
  if (role !== 'all') {
    filtered = filtered.filter(u => u.role === role);
  }
  
  const temp = dashboardData.users;
  dashboardData.users = filtered;
  renderUsers();
  dashboardData.users = temp;
}

// ==================== GLOBAL WINDOW FUNCTIONS ====================

// Delivery Actions
window.handleMarkAsProcessing = async function(deliveryId) {
  if (!confirm("Mark this delivery as processing?")) return;
  const token = localStorage.getItem("auth_token");
  
  try {
    await markAsProcessing(deliveryId, "Order is being prepared", token);
    showToast("Delivery marked as processing", "success");
    dashboardData.deliveries = await getAllDeliveries(token);
    renderDeliveries();
  } catch (error) {
    console.error("Error:", error);
    showToast("Failed to update delivery", "error");
  }
};

window.handleMarkAsDelivered = async function(deliveryId) {
  const notes = prompt("Add delivery notes (optional):", "Package delivered successfully");
  if (notes === null) return;
  
  const token = localStorage.getItem("auth_token");
  
  try {
    await markAsDelivered(deliveryId, notes, token);
    showToast("Delivery marked as delivered!", "success");
    dashboardData.deliveries = await getAllDeliveries(token);
    renderDeliveries();
  } catch (error) {
    console.error("Error:", error);
    showToast("Failed to update delivery", "error");
  }
};

window.openShipModal = function(deliveryId) {
  document.getElementById("ship-modal-delivery-id").value = deliveryId;
  document.getElementById("ship-tracking-number").value = "";
  document.getElementById("ship-carrier").value = "Standard Delivery";
  document.getElementById("ship-estimated-days").value = "7";
  document.getElementById("ship-notes").value = "";
  
  const modal = document.getElementById("ship-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
};

window.closeShipModal = function() {
  const modal = document.getElementById("ship-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
};

window.submitShipment = async function(event) {
  event.preventDefault();
  
  const deliveryId = document.getElementById("ship-modal-delivery-id").value;
  const trackingNumber = document.getElementById("ship-tracking-number").value.trim();
  const carrier = document.getElementById("ship-carrier").value;
  const estimatedDays = parseInt(document.getElementById("ship-estimated-days").value) || 7;
  
  if (!trackingNumber) {
    alert("Please enter a tracking number");
    return;
  }
  
  const token = localStorage.getItem("auth_token");
  
  try {
    await shipDelivery(deliveryId, {
      tracking_number: trackingNumber,
      carrier: carrier,
      estimated_days: estimatedDays
    }, token);
    
    closeShipModal();
    showToast("Order shipped! Customer notified.", "success");
    dashboardData.deliveries = await getAllDeliveries(token);
    renderDeliveries();
  } catch (error) {
    console.error("Error:", error);
    showToast("Failed to ship order", "error");
  }
};

window.openUpdateTrackingModal = function(deliveryId, trackingNumber, carrier) {
  document.getElementById("update-modal-delivery-id").value = deliveryId;
  document.getElementById("update-tracking-number").value = trackingNumber || "";
  document.getElementById("update-carrier").value = carrier || "Standard Delivery";
  
  const modal = document.getElementById("update-tracking-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
};

window.closeUpdateTrackingModal = function() {
  const modal = document.getElementById("update-tracking-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
};

window.submitTrackingUpdate = async function(event) {
  event.preventDefault();
  
  const deliveryId = document.getElementById("update-modal-delivery-id").value;
  const trackingNumber = document.getElementById("update-tracking-number").value.trim();
  const carrier = document.getElementById("update-carrier").value;
  
  if (!trackingNumber) {
    alert("Please enter a tracking number");
    return;
  }
  
  const token = localStorage.getItem("auth_token");
  
  try {
    await updateTrackingInfo(deliveryId, trackingNumber, carrier, null, token);
    closeUpdateTrackingModal();
    showToast("Tracking info updated", "success");
    dashboardData.deliveries = await getAllDeliveries(token);
    renderDeliveries();
  } catch (error) {
    console.error("Error:", error);
    showToast("Failed to update tracking", "error");
  }
};

window.filterDeliveriesHandler = async function() {
  const status = document.getElementById("delivery-status-filter")?.value;
  const token = localStorage.getItem("auth_token");
  
  try {
    dashboardData.deliveries = await getAllDeliveries(token, status);
    renderDeliveriesTable(dashboardData.deliveries);
  } catch (error) {
    console.error("Error:", error);
  }
};

window.refreshDeliveriesHandler = async function() {
  const token = localStorage.getItem("auth_token");
  try {
    dashboardData.deliveries = await getAllDeliveries(token);
    renderDeliveries();
    showToast("Deliveries refreshed", "success");
  } catch (error) {
    console.error("Error:", error);
    showToast("Failed to refresh", "error");
  }
};

window.exportDeliveriesHandler = function() {
  const deliveries = dashboardData.deliveries || [];
  
  if (!deliveries.length) {
    showToast("No deliveries to export", "warning");
    return;
  }
  
  const csv = [
    ['ID', 'Order ID', 'Customer', 'Status', 'Tracking', 'Carrier'],
    ...deliveries.map(d => [
      d.id,
      d.order_id,
      d.buyer?.name || 'N/A',
      d.status,
      d.tracking_number || '',
      d.carrier || ''
    ])
  ].map(row => row.join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deliveries_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast("Exported!", "success");
};

// Order & User Actions
window.viewOrder = function(orderId) {
  window.location.href = `./order-details.html?order_id=${orderId}`;
};

window.openUserModal = function(userId) {
  const user = dashboardData.users.find(u => u.id === userId);
  if (!user) return;
  
  document.getElementById("modal-user-id").value = userId;
  document.getElementById("modal-user-name").value = user.name || user.username || '';
  document.getElementById("modal-user-role").value = user.role || 'buyer';
  document.getElementById("modal-user-status").value = user.is_active !== false ? 'active' : 'suspended';
  
  const modal = document.getElementById("user-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
};

window.closeUserModal = function() {
  const modal = document.getElementById("user-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
};

window.closeDeliveryModal = function() {
  const modal = document.getElementById("delivery-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
};

window.exportOrders = function() {
  const orders = dashboardData.orders || [];
  
  const csv = [
    ['Order ID', 'Customer', 'Amount', 'Status', 'Date'],
    ...orders.map(o => [
      o.id,
      o.buyer?.email || 'N/A',
      o.total || 0,
      o.status,
      new Date(o.created_at).toLocaleDateString()
    ])
  ].map(row => row.join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast("Orders exported!", "success");
};

window.processAllPayouts = async function() {
  if (!confirm("Process all pending payouts?")) return;
  
  const token = localStorage.getItem("auth_token");
  
  try {
    const result = await processBulkPayouts(token);
    alert(`Processed ${result.processed || 0} payouts`);
    loadPayoutManagement();
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to process payouts");
  }
};