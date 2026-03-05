// js/admin-dashboard.js
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
  updateDeliveryStatus,
  getAllDeliveries,
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
  initCharts();
  
  // Initialize payout management if section exists
  if (document.getElementById("payout-management-section")) {
    initPayoutManagement();
  }
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
    
    // Verify admin role
    if (currentUser.role !== "admin") {
      alert("Access denied. Admin privileges required.");
      window.location.href = "./index.html";
      return;
    }
    
    // Display admin username
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
  // Logout button
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

  const paintingFilter = document.getElementById("painting-filter");
  if (paintingFilter) {
    paintingFilter.addEventListener("change", filterPaintings);
  }
}

// ==================== TAB MANAGEMENT ====================

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.className = "tab-btn py-2 px-1 border-b-2 border-indigo-500 font-medium text-sm text-indigo-600";
    } else {
      btn.className = "tab-btn py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300";
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
  
  // Refresh data for the active tab
  refreshTabData(tabName);
}

// ==================== DATA LOADING ====================

async function loadDashboardData() {
  showMessage("Loading dashboard...", false);
  
  try {
    await Promise.all([
      loadOrders(),
      loadUsers(),
      loadArtists(),
      loadPaintings(),
      loadPayments(),
      loadDeliveries(),
      loadStats()
    ]);
    
    hideMessage();
    renderDashboard();
  } catch (error) {
    console.error("Dashboard load error:", error);
    showMessage("Failed to load dashboard data", true);
  }
}

async function loadOrders() {
  const token = localStorage.getItem("auth_token");
  try {
    dashboardData.orders = await getAllOrders(token);
  } catch (error) {
    console.error("Error loading orders:", error);
    dashboardData.orders = [];
  }
}

async function loadUsers() {
  const token = localStorage.getItem("auth_token");
  try {
    dashboardData.users = await getAllUsers(token);
  } catch (error) {
    console.error("Error loading users:", error);
    dashboardData.users = [];
  }
}

async function loadArtists() {
  try {
    const response = await getArtists();
    dashboardData.artists = response.artists || response || [];
  } catch (error) {
    console.error("Error loading artists:", error);
    dashboardData.artists = [];
  }
}

async function loadPaintings() {
  try {
    dashboardData.paintings = await getAllPaintings();
  } catch (error) {
    console.error("Error loading paintings:", error);
    dashboardData.paintings = [];
  }
}

async function loadPayments() {
  const token = localStorage.getItem("auth_token");
  try {
    dashboardData.payments = await getAllPayments(token);
  } catch (error) {
    console.error("Error loading payments:", error);
    dashboardData.payments = [];
  }
}

async function loadDeliveries() {
  const token = localStorage.getItem("auth_token");
  try {
    dashboardData.deliveries = await getAllDeliveries(token);
  } catch (error) {
    console.error("Error loading deliveries:", error);
    dashboardData.deliveries = [];
  }
}

async function loadStats() {
  // Calculate statistics
  const stats = {
    totalRevenue: dashboardData.orders
      .filter(o => o.status === 'paid' || o.status === 'completed')
      .reduce((sum, o) => sum + (o.total || 0), 0),
    totalOrders: dashboardData.orders.length,
    pendingOrders: dashboardData.orders.filter(o => o.status === 'pending').length,
    totalArtists: dashboardData.artists.length,
    totalPaintings: dashboardData.paintings.length,
    soldPaintings: dashboardData.orders.filter(o => o.status === 'paid').length
  };
  
  // Update UI
  updateStatCards(stats);
}

function updateStatCards(stats) {
  const elements = {
    'total-revenue': `Ksh ${stats.totalRevenue.toLocaleString()}`,
    'total-orders': stats.totalOrders,
    'pending-orders': `${stats.pendingOrders} pending`,
    'total-artists': stats.totalArtists,
    'total-paintings': stats.totalPaintings,
    'sold-paintings': `${stats.soldPaintings} sold`
  };

  Object.keys(elements).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = elements[id];
    }
  });
}

// ==================== RENDERING FUNCTIONS ====================

function renderDashboard() {
  renderOrders();
  renderUsers();
  renderArtists();
  renderPaintings();
  renderPayments();
  renderActivity();
}

function renderOrders() {
  const tbody = document.getElementById("orders-table");
  if (!tbody) return;
  
  const orders = dashboardData.orders.slice(0, 10); // Show recent 10
  
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No orders found</td></tr>';
    return;
  }
  
  tbody.innerHTML = orders.map(order => {
    const date = new Date(order.created_at).toLocaleDateString();
    const paymentBadge = getPaymentBadge(order.status);
    const deliveryBadge = order.delivery ? 
      getDeliveryBadge(order.delivery.status) : 
      '<span class="text-xs text-gray-500">No delivery</span>';
    
    return `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          #${order.id}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${order.buyer?.name || order.buyer?.email || 'N/A'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          Ksh ${(order.total || 0).toLocaleString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${paymentBadge}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${deliveryBadge}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${date}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button onclick="viewOrder(${order.id})" class="text-indigo-600 hover:text-indigo-900 mr-2">
            View
          </button>
          ${order.delivery ? `
            <button onclick="openDeliveryModal(${order.delivery.id}, '${order.delivery.status}')" 
                    class="text-green-600 hover:text-green-900">
              Update Shipping
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
  
  if (!dashboardData.users.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No users found</td></tr>';
    return;
  }
  
  tbody.innerHTML = dashboardData.users.map(user => {
    const joined = new Date(user.created_at).toLocaleDateString();
    const roleBadge = getRoleBadge(user.role);
    const statusBadge = user.is_active !== false ? 
      '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>' :
      '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactive</span>';
    
    return `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.id}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          ${user.name || user.username || 'N/A'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
        <td class="px-6 py-4 whitespace-nowrap">${roleBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${joined}</td>
        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button onclick="openUserModal(${user.id})" class="text-indigo-600 hover:text-indigo-900 mr-2">
            Edit
          </button>
          ${user.role !== 'admin' ? `
            <button onclick="toggleUserStatus(${user.id})" class="text-red-600 hover:text-red-900">
              ${user.is_active !== false ? 'Suspend' : 'Activate'}
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function renderArtists() {
  const container = document.getElementById("artists-list");
  if (!container) return;
  
  if (!dashboardData.artists.length) {
    container.innerHTML = '<p class="text-center py-4 text-gray-500">No artists found</p>';
    return;
  }
  
  container.innerHTML = dashboardData.artists.map(artist => {
    const paintingCount = dashboardData.paintings.filter(p => p.artist_id === artist.id).length;
    
    return `
      <div class="p-4 hover:bg-gray-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="${artist.profile_picture || 'https://via.placeholder.com/40'}" 
                 alt="${artist.user?.name || 'Artist'}"
                 class="w-10 h-10 rounded-full object-cover">
            <div>
              <p class="text-sm font-medium text-gray-900">
                ${artist.user?.name || artist.user?.username || 'Artist'}
              </p>
              <p class="text-xs text-gray-500">${paintingCount} paintings</p>
            </div>
          </div>
          <button onclick="viewArtist(${artist.id})" 
                  class="text-xs text-indigo-600 hover:text-indigo-900">
            View Profile
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderPaintings() {
  const container = document.getElementById("paintings-grid");
  if (!container) return;
  
  const paintings = dashboardData.paintings.slice(0, 6); // Show recent 6
  
  if (!paintings.length) {
    container.innerHTML = '<p class="text-center py-4 text-gray-500 col-span-2">No paintings found</p>';
    return;
  }
  
  container.innerHTML = paintings.map(painting => `
    <div class="relative group">
      <img src="${API_BASE_URL}${painting.image_url}" 
           alt="${painting.title}"
           class="w-full h-32 object-cover rounded-lg">
      <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 
                  rounded-lg flex items-center justify-center transition-opacity">
        <button onclick="viewPainting(${painting.id})" 
                class="text-white text-xs bg-indigo-600 px-2 py-1 rounded">
          View Details
        </button>
      </div>
      <p class="text-xs mt-1 truncate">${painting.title}</p>
      <p class="text-xs text-gray-500">Ksh ${painting.price}</p>
    </div>
  `).join('');
}

function renderPayments() {
  const tbody = document.getElementById("payments-table");
  if (!tbody) return;
  
  const payments = Array.isArray(dashboardData.payments) 
    ? dashboardData.payments.slice(0, 5)
    : [];
  
  if (!payments.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-xs text-gray-500">No payments found</td></tr>';
    return;
  }
  
  tbody.innerHTML = payments.map(payment => {
    const statusBadge = payment.status === 'completed' ?
      '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Completed</span>' :
      '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>';
    
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

function renderActivity() {
  const container = document.getElementById("activity-log");
  if (!container) return;
  
  // Generate sample activity from real data
  const activities = [];
  
  // Recent orders
  dashboardData.orders.slice(0, 3).forEach(order => {
    activities.push({
      time: new Date(order.created_at),
      text: `New order #${order.id} placed by ${order.buyer?.name || 'customer'}`,
      type: 'order'
    });
  });
  
  // Recent paintings
  dashboardData.paintings.slice(0, 2).forEach(painting => {
    activities.push({
      time: new Date(painting.created_at || Date.now()),
      text: `New painting "${painting.title}" added`,
      type: 'painting'
    });
  });
  
  // Sort by time
  activities.sort((a, b) => b.time - a.time);
  
  container.innerHTML = activities.map(activity => `
    <div class="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
      <span class="text-lg">
        ${activity.type === 'order' ? '🛒' : '🎨'}
      </span>
      <div class="flex-1">
        <p class="text-gray-700">${activity.text}</p>
        <p class="text-xs text-gray-400">${activity.time.toLocaleString()}</p>
      </div>
    </div>
  `).join('');
}

// ==================== PAYOUT MANAGEMENT ====================

async function loadPayoutManagement() {
  const token = localStorage.getItem("auth_token");
  
  try {
    const earnings = await getPlatformEarnings(token);
    const allPayouts = await getAllPayouts(token);
    
    const pendingPayouts = Array.isArray(allPayouts) 
      ? allPayouts.filter(p => p.status === 'pending') 
      : [];
    
    renderPayoutManagement(earnings, pendingPayouts);
  } catch (error) {
    console.error("Failed to load payout data:", error);
    const container = document.getElementById("payout-management-section");
    if (container) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-800">Failed to load payout data. Please try again.</p>
          <button onclick="loadPayoutManagement()" class="mt-2 text-xs text-red-600 underline">
            Retry
          </button>
        </div>
      `;
    }
  }
}

function renderPayoutManagement(earnings, pendingPayouts) {
  const html = `
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold mb-4">Payout Management</h3>
      
      <!-- Platform Earnings Summary -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-green-50 p-4 rounded">
          <p class="text-sm text-gray-600">Platform Earnings</p>
          <p class="text-2xl font-bold text-green-600">
            KSH ${(earnings.total_earned || 0).toLocaleString()}
          </p>
        </div>
        <div class="bg-yellow-50 p-4 rounded">
          <p class="text-sm text-gray-600">Pending Commission</p>
          <p class="text-2xl font-bold text-yellow-600">
            KSH ${(earnings.pending_earnings || 0).toLocaleString()}
          </p>
        </div>
      </div>
      
      <!-- Pending Payouts -->
      <div class="border-t pt-4">
        <div class="flex justify-between items-center mb-3">
          <h4 class="font-semibold">Pending Artist Payouts (${pendingPayouts.length})</h4>
          <button 
            onclick="processAllPayouts()" 
            class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
            ${pendingPayouts.length === 0 ? 'disabled' : ''}
          >
            Process All Payouts
          </button>
        </div>
        
        ${pendingPayouts.length > 0 ? `
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left">Artist</th>
                  <th class="px-4 py-2 text-left">Amount</th>
                  <th class="px-4 py-2 text-left">Order</th>
                  <th class="px-4 py-2 text-left">Created</th>
                  <th class="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                ${pendingPayouts.map(payout => `
                  <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-2">Artist #${payout.artist_id}</td>
                    <td class="px-4 py-2 font-medium">
                      KSH ${(payout.payout_amount || 0).toLocaleString()}
                    </td>
                    <td class="px-4 py-2">#${payout.order_id || 'N/A'}</td>
                    <td class="px-4 py-2">${new Date(payout.created_at).toLocaleDateString()}</td>
                    <td class="px-4 py-2">
                      <button 
                        onclick="processPayout(${payout.id})" 
                        class="text-green-600 hover:text-green-800"
                      >
                        Process
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="py-8 text-center bg-gray-50 rounded">
            <p class="text-sm text-gray-500">No pending payouts at this time.</p>
          </div>
        `}
      </div>
      
      <!-- Summary Stats -->
      <div class="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-xs">
        <div>
          <p class="text-gray-500">Total Pending</p>
          <p class="font-semibold">
            KSH ${pendingPayouts.reduce((sum, p) => sum + (p.payout_amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p class="text-gray-500">Artists to Pay</p>
          <p class="font-semibold">
            ${[...new Set(pendingPayouts.map(p => p.artist_id))].length}
          </p>
        </div>
        <div>
          <p class="text-gray-500">Platform Fee (20%)</p>
          <p class="font-semibold">
            KSH ${pendingPayouts.reduce((sum, p) => sum + (p.commission_amount || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  `;
  
  const container = document.getElementById("payout-management-section");
  if (container) {
    container.innerHTML = html;
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
          label: 'Sales',
          data: [12000, 19000, 15000, 25000, 22000, 30000],
          borderColor: 'rgb(79, 70, 229)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
  
  // Category Chart
  const categoryCtx = document.getElementById('category-chart')?.getContext('2d');
  if (categoryCtx && typeof Chart !== 'undefined') {
    new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: ['Landscape', 'Portrait', 'Abstract', 'Wildlife', 'Other'],
        datasets: [{
          data: [30, 25, 20, 15, 10],
          backgroundColor: [
            'rgb(79, 70, 229)',
            'rgb(34, 197, 94)',
            'rgb(234, 179, 8)',
            'rgb(239, 68, 68)',
            'rgb(107, 114, 128)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}

// ==================== HELPER FUNCTIONS ====================

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
    'shipping': '<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Shipping</span>',
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
  if (msg) {
    msg.classList.add("hidden");
  }
}

function refreshTabData(tab) {
  switch(tab) {
    case 'orders':
      renderOrders();
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

// ==================== FILTER FUNCTIONS ====================

function filterOrders() {
  const filter = document.getElementById("order-status-filter")?.value;
  console.log("Filter orders by:", filter);
  // Implement filtering logic
}

function filterUsers() {
  const search = document.getElementById("user-search")?.value.toLowerCase();
  const role = document.getElementById("user-role-filter")?.value;
  console.log("Filter users:", search, role);
  // Implement filtering logic
}

function filterPaintings() {
  const filter = document.getElementById("painting-filter")?.value;
  console.log("Filter paintings by:", filter);
  // Implement filtering logic
}

// ==================== GLOBAL FUNCTIONS FOR HTML ====================

window.initPayoutManagement = function() {
  loadPayoutManagement();
}

window.processAllPayouts = async function() {
  if (!confirm("Process all pending payouts? This will send money to all artists.")) return;
  
  const token = localStorage.getItem("auth_token");
  const button = event.target;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Processing...";
  
  try {
    const result = await processBulkPayouts(token);
    
    const message = `
      ✅ Bulk payout complete!
      - Processed: ${result.processed || 0} payouts
      - Failed: ${result.failed || 0} payouts
      - Total: ${result.total || 0} payouts
    `;
    alert(message);
    
    await loadPayoutManagement();
  } catch (error) {
    console.error("Failed to process payouts:", error);
    alert(`❌ Failed to process payouts: ${error.message || 'Unknown error'}`);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

window.processPayout = async function(payoutId) {
  if (!confirm(`Process payout #${payoutId}?`)) return;
  
  const token = localStorage.getItem("auth_token");
  const button = event.target;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Processing...";
  
  try {
    const result = await processPayoutAPI(payoutId, token);
    
    alert(`
      ✅ Payout processed successfully!
      Amount: KSH ${(result.payout_amount || 0).toLocaleString()}
      Status: ${result.status}
      Reference: ${result.payment_reference || 'Pending'}
    `);
    
    await loadPayoutManagement();
  } catch (error) {
    console.error("Failed to process payout:", error);
    alert(`❌ Failed to process payout: ${error.message || 'Unknown error'}`);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

window.viewOrder = function(orderId) {
  window.location.href = `./order-details.html?order_id=${orderId}`;
}

window.viewArtist = function(artistId) {
  window.open(`./artist-profile.html?id=${artistId}`, '_blank');
}

window.viewPainting = function(paintingId) {
  window.open(`./painting-details.html?id=${paintingId}`, '_blank');
}

window.openDeliveryModal = function(deliveryId, currentStatus) {
  document.getElementById("modal-delivery-id").value = deliveryId;
  document.getElementById("modal-delivery-status").value = currentStatus;
  const modal = document.getElementById("delivery-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

window.closeDeliveryModal = function() {
  const modal = document.getElementById("delivery-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

window.updateDelivery = async function() {
  const deliveryId = document.getElementById("modal-delivery-id").value;
  const status = document.getElementById("modal-delivery-status").value;
  const tracking = document.getElementById("modal-tracking").value;
  const carrier = document.getElementById("modal-carrier").value;
  
  const token = localStorage.getItem("auth_token");
  
  try {
    await updateDeliveryStatus(deliveryId, {
      status,
      tracking_number: tracking,
      carrier
    }, token);
    
    closeDeliveryModal();
    await loadDashboardData();
    showMessage("Delivery updated successfully", false);
  } catch (error) {
    console.error("Update delivery error:", error);
    showMessage("Failed to update delivery", true);
  }
}

window.openUserModal = function(userId) {
  const user = dashboardData.users.find(u => u.id === userId);
  if (user) {
    document.getElementById("modal-user-id").value = userId;
    document.getElementById("modal-user-name").value = user.name || user.username || '';
    document.getElementById("modal-user-role").value = user.role;
    document.getElementById("modal-user-status").value = user.is_active !== false ? 'active' : 'suspended';
    const modal = document.getElementById("user-modal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }
}

window.closeUserModal = function() {
  const modal = document.getElementById("user-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

window.toggleUserStatus = async function(userId) {
  const user = dashboardData.users.find(u => u.id === userId);
  if (!user) return;
  
  const action = user.is_active !== false ? 'suspend' : 'activate';
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;
  
  const token = localStorage.getItem("auth_token");
  
  try {
    if (action === 'suspend') {
      await suspendUser(userId, token);
    } else {
      // Note: activateUser might not be implemented in your backend
      // You might need to use updateUser instead
      await updateUser(userId, { is_active: true }, token);
    }
    
    await loadUsers();
    renderUsers();
    showMessage(`User ${action}ed successfully`, false);
  } catch (error) {
    console.error(`Failed to ${action} user:`, error);
    showMessage(`Failed to ${action} user`, true);
  }
}

window.exportOrders = function() {
  const csv = [
    ['Order ID', 'Customer', 'Amount', 'Status', 'Date'],
    ...dashboardData.orders.map(order => [
      order.id,
      order.buyer?.email || 'N/A',
      order.total || 0,
      order.status,
      new Date(order.created_at).toLocaleDateString()
    ])
  ].map(row => row.join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}