
// js/admin-users.js
import { 
  API_BASE_URL,
  getAllUsers,
  updateUser,
  suspendUser,
  activateUser,
  deleteUser,
  createAdminUser,
  promoteToAdmin,
} from "./api.js";

let currentUser = null;
let users = [];
let activityLogs = [];
let currentTab = 'all-users';

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  setupEventListeners();
  loadUsers();
  loadActivityLogs();
});

// Authentication & Authorization
function initAuth() {
  try {
    const rawUser = localStorage.getItem("auth_user");
    const token = localStorage.getItem("auth_token");
    
    if (!rawUser || !token) {
      window.location.href = "./admin-login.html";
      return;
    }
    
    currentUser = JSON.parse(rawUser);
    
    // Double-check admin role
    if (currentUser.role !== "admin") {
      alert("⛔ Access Denied: Admin privileges required");
      window.location.href = "./index.html";
      return;
    }
    
    document.getElementById("admin-username").textContent = 
      currentUser.username || currentUser.email || "Admin";
      
    // Log admin access
    logActivity("Admin panel accessed", "LOGIN");
    
  } catch (e) {
    console.error("Auth error:", e);
    window.location.href = "./admin-login.html";
  }
}

// Event Listeners
function setupEventListeners() {
  // Logout
  document.getElementById("logout-btn").addEventListener("click", () => {
    logActivity("Admin logged out", "LOGOUT");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    window.location.href = "./admin-login.html";
  });

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Search and filters
  document.getElementById("user-search")?.addEventListener("input", filterUsers);
  document.getElementById("role-filter")?.addEventListener("change", filterUsers);

  // Create admin form
  document.getElementById("create-admin-form")?.addEventListener("submit", createAdmin);
}

// Tab Management
function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.className = "tab-btn px-6 py-3 text-sm font-medium border-b-2 border-indigo-500 text-indigo-600";
    } else {
      btn.className = "tab-btn px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700";
    }
  });
  
  // Show/hide content
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.add("hidden");
  });
  document.getElementById(`${tabName}-tab`)?.classList.remove("hidden");
  
  // Load specific data if needed
  if (tabName === 'admin-accounts') {
    loadAdminAccounts();
  }
}

// Data Loading
async function loadUsers() {
  const token = localStorage.getItem("auth_token");
  
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error("Failed to load users");
    
    users = await response.json();
    renderUsersTable();
    
  } catch (error) {
    console.error("Load users error:", error);
    showMessage("Failed to load users", true);
  }
}

async function loadAdminAccounts() {
  const admins = users.filter(u => u.role === 'admin');
  const container = document.getElementById("admin-list");
  
  if (!container) return;
  
  container.innerHTML = admins.map(admin => `
    <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <div>
          <h4 class="font-semibold text-gray-900">${admin.name || admin.username}</h4>
          <p class="text-sm text-gray-500">${admin.email}</p>
          <div class="mt-2 space-y-1">
            <p class="text-xs text-gray-600">ID: #${admin.id}</p>
            <p class="text-xs text-gray-600">Created: ${new Date(admin.created_at).toLocaleDateString()}</p>
            ${admin.last_login ? 
              `<p class="text-xs text-gray-600">Last login: ${new Date(admin.last_login).toLocaleString()}</p>` 
              : ''}
          </div>
        </div>
        <div class="flex flex-col gap-2">
          ${admin.id !== currentUser.id ? `
            <button onclick="editUser(${admin.id})" 
                    class="text-xs text-indigo-600 hover:text-indigo-900">
              Edit
            </button>
            <button onclick="confirmRemoveAdmin(${admin.id})" 
                    class="text-xs text-red-600 hover:text-red-900">
              Remove Admin
            </button>
          ` : `
            <span class="text-xs text-gray-400">Current User</span>
          `}
        </div>
      </div>
      <div class="mt-3 pt-3 border-t">
        <div class="flex flex-wrap gap-1">
          <span class="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">Admin</span>
          ${admin.is_active !== false ? 
            '<span class="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">Active</span>' :
            '<span class="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">Inactive</span>'
          }
        </div>
      </div>
    </div>
  `).join('');
}

// Render Functions
function renderUsersTable() {
  const tbody = document.getElementById("users-table");
  if (!tbody) return;
  
  const filteredUsers = getFilteredUsers();
  
  tbody.innerHTML = filteredUsers.map(user => {
    const roleColor = {
      admin: 'bg-purple-100 text-purple-800',
      artist: 'bg-green-100 text-green-800',
      buyer: 'bg-blue-100 text-blue-800'
    }[user.role] || 'bg-gray-100 text-gray-800';
    
    const statusColor = user.is_active !== false ? 
      'bg-green-100 text-green-800' : 
      'bg-red-100 text-red-800';
    
    return `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.id}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          ${user.username}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-1 text-xs font-medium rounded-full ${roleColor}">
            ${user.role}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColor}">
            ${user.is_active !== false ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${new Date(user.created_at).toLocaleDateString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button onclick="editUser(${user.id})" 
                  class="text-indigo-600 hover:text-indigo-900 mr-3">
            Edit
          </button>
          ${user.id !== currentUser.id ? `
            ${user.is_active !== false ? `
              <button onclick="suspendUser(${user.id})" 
                      class="text-yellow-600 hover:text-yellow-900 mr-3">
                Suspend
              </button>
            ` : `
              <button onclick="activateUser(${user.id})" 
                      class="text-green-600 hover:text-green-900 mr-3">
                Activate
              </button>
            `}
            <button onclick="confirmDeleteUser(${user.id})" 
                    class="text-red-600 hover:text-red-900">
              Delete
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

// Filter Functions
function getFilteredUsers() {
  const search = document.getElementById("user-search")?.value.toLowerCase() || '';
  const roleFilter = document.getElementById("role-filter")?.value || '';
  
  return users.filter(user => {
    const matchesSearch = !search || 
      user.username.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      (user.name && user.name.toLowerCase().includes(search));
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
}

function filterUsers() {
  renderUsersTable();
}

// Admin Creation
async function createAdmin(e) {
  e.preventDefault();
  
  const username = document.getElementById("admin-username").value.trim();
  const email = document.getElementById("admin-email").value.trim();
  const name = document.getElementById("admin-name").value.trim();
  const password = document.getElementById("admin-password").value;
  
  if (!username || !email || !name || !password) {
    showMessage("All fields are required", true);
    return;
  }
  
  if (password.length < 8) {
    showMessage("Password must be at least 8 characters", true);
    return;
  }
  
  const token = localStorage.getItem("auth_token");
  
  try {
    showMessage("Creating admin account...", false);
    
    const response = await fetch(`${API_BASE_URL}/users/create-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        username,
        email,
        name,
        password,
        role: "admin",
        permissions: {
          users: document.getElementById("perm-users").checked,
          orders: document.getElementById("perm-orders").checked,
          payments: document.getElementById("perm-payments").checked,
          content: document.getElementById("perm-content").checked
        },
        require_2fa: document.getElementById("require-2fa").checked,
        send_credentials: document.getElementById("send-credentials").checked
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create admin");
    }
    
    const result = await response.json();
    
    // Log activity
    logActivity(`Created admin account: ${email}`, "CREATE_ADMIN");
    
    // Clear form
    e.target.reset();
    
    // Show success
    showMessage(`Admin account created successfully for ${email}`, false);
    
    // Reload users
    await loadUsers();
    
    // Switch to admin accounts tab
    switchTab('admin-accounts');
    
  } catch (error) {
    console.error("Create admin error:", error);
    showMessage(error.message || "Failed to create admin account", true);
  }
}

// User Actions
window.editUser = function(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  document.getElementById("edit-user-id").value = userId;
  document.getElementById("edit-username").value = user.username;
  document.getElementById("edit-email").value = user.email;
  document.getElementById("edit-role").value = user.role;
  document.getElementById("edit-status").value = user.is_active !== false ? 'active' : 'suspended';
  
  document.getElementById("edit-user-modal").classList.remove("hidden");
}

window.closeEditModal = function() {
  document.getElementById("edit-user-modal").classList.add("hidden");
}

window.saveUserChanges = async function() {
  const userId = document.getElementById("edit-user-id").value;
  const username = document.getElementById("edit-username").value;
  const role = document.getElementById("edit-role").value;
  const status = document.getElementById("edit-status").value;
  
  const token = localStorage.getItem("auth_token");
  
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        username,
        role,
        is_active: status === 'active'
      })
    });
    
    if (!response.ok) throw new Error("Failed to update user");
    
    logActivity(`Updated user #${userId}`, "UPDATE_USER");
    
    closeEditModal();
    await loadUsers();
    showMessage("User updated successfully", false);
    
  } catch (error) {
    console.error("Update user error:", error);
    showMessage("Failed to update user", true);
  }
}

window.suspendUser = async function(userId) {
  if (!confirm("Are you sure you want to suspend this user?")) return;
  
  const token = localStorage.getItem("auth_token");
  
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/suspend`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error("Failed to suspend user");
    
    logActivity(`Suspended user #${userId}`, "SUSPEND_USER");
    
    await loadUsers();
    showMessage("User suspended", false);
    
  } catch (error) {
    console.error("Suspend user error:", error);
    showMessage("Failed to suspend user", true);
  }
}

window.activateUser = async function(userId) {
  const token = localStorage.getItem("auth_token");
  
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/activate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error("Failed to activate user");
    
    logActivity(`Activated user #${userId}`, "ACTIVATE_USER");
    
    await loadUsers();
    showMessage("User activated", false);
    
  } catch (error) {
    console.error("Activate user error:", error);
    showMessage("Failed to activate user", true);
  }
}

window.confirmDeleteUser = function(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  document.getElementById("confirm-message").textContent = 
    `Are you sure you want to permanently delete ${user.email}? This action cannot be undone.`;
  
  document.getElementById("confirm-action-btn").onclick = () => deleteUser(userId);
  document.getElementById("confirm-modal").classList.remove("hidden");
}

window.closeConfirmModal = function() {
  document.getElementById("confirm-modal").classList.add("hidden");
}

async function deleteUser(userId) {
  const token = localStorage.getItem("auth_token");
  
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error("Failed to delete user");
    
    logActivity(`Deleted user #${userId}`, "DELETE_USER");
    
    closeConfirmModal();
    await loadUsers();
    showMessage("User deleted", false);
    
  } catch (error) {
    console.error("Delete user error:", error);
    showMessage("Failed to delete user", true);
  }
}

window.promoteToAdmin = async function() {
  const email = document.getElementById("promote-email").value.trim();
  if (!email) {
    showMessage("Please enter an email address", true);
    return;
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    showMessage("User not found with this email", true);
    return;
  }
  
  if (user.role === 'admin') {
    showMessage("User is already an admin", true);
    return;
  }
  
  if (!confirm(`Promote ${user.email} to admin?`)) return;
  
  const token = localStorage.getItem("auth_token");
  
  try {
    const response = await fetch(`${API_BASE_URL}/users/${user.id}/promote-admin`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error("Failed to promote user");
    
    logActivity(`Promoted ${email} to admin`, "PROMOTE_ADMIN");
    
    document.getElementById("promote-email").value = '';
    await loadUsers();
    showMessage(`${email} has been promoted to admin`, false);
    switchTab('admin-accounts');
    
  } catch (error) {
    console.error("Promote error:", error);
    showMessage("Failed to promote user", true);
  }
}

window.confirmRemoveAdmin = function(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  if (!confirm(`Remove admin privileges from ${user.email}?`)) return;
  
  // Change role to buyer
  document.getElementById("edit-user-id").value = userId;
  document.getElementById("edit-role").value = 'buyer';
  saveUserChanges();
}

// Password Generator
window.generatePassword = function() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById("admin-password").value = password;
}

// Activity Logging
function logActivity(action, type) {
  const log = {
    timestamp: new Date().toISOString(),
    admin: currentUser.email,
    action: action,
    type: type,
    ip: "127.0.0.1" // In production, get real IP from backend
  };
  
  // Store locally for now (in production, send to backend)
  activityLogs.push(log);
  
  // Keep only last 100 logs
  if (activityLogs.length > 100) {
    activityLogs = activityLogs.slice(-100);
  }
  
  // Save to localStorage
  localStorage.setItem("admin_activity_logs", JSON.stringify(activityLogs));
}

function loadActivityLogs() {
  try {
    const stored = localStorage.getItem("admin_activity_logs");
    if (stored) {
      activityLogs = JSON.parse(stored);
    }
  } catch (e) {
    activityLogs = [];
  }
  
  renderActivityLog();
}

function renderActivityLog() {
  const tbody = document.getElementById("activity-log-table");
  if (!tbody) return;
  
  const recentLogs = activityLogs.slice(-50).reverse();
  
  tbody.innerHTML = recentLogs.map(log => `
    <tr class="hover:bg-gray-50">
      <td class="px-4 py-3 text-xs text-gray-500">
        ${new Date(log.timestamp).toLocaleString()}
      </td>
      <td class="px-4 py-3 text-xs font-medium text-gray-900">
        ${log.admin}
      </td>
      <td class="px-4 py-3 text-xs text-gray-700">
        ${log.action}
      </td>
      <td class="px-4 py-3 text-xs text-gray-500">
        ${log.type}
      </td>
      <td class="px-4 py-3 text-xs text-gray-400 font-mono">
        ${log.ip}
      </td>
    </tr>
  `).join('');
}

window.exportActivityLog = function() {
  const csv = [
    ['Timestamp', 'Admin', 'Action', 'Type', 'IP Address'],
    ...activityLogs.map(log => [
      log.timestamp,
      log.admin,
      log.action,
      log.type,
      log.ip
    ])
  ].map(row => row.join(',')).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin_activity_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// Messages
function showMessage(text, isError = false) {
  const msg = document.getElementById("status-message");
  if (!msg) return;
  
  msg.textContent = text;
  msg.classList.remove("hidden");
  msg.className = `mb-4 p-3 rounded-lg text-sm ${
    isError 
      ? 'bg-red-100 text-red-700 border border-red-200' 
      : 'bg-green-100 text-green-700 border border-green-200'
  }`;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    msg.classList.add("hidden");
  }, 5000);
}