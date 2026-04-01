// js/my-orders.js
import { getUserOrders } from "./api.js";

const state = {
  currentUser: null,
  authToken: null,
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheEls();
  loadAuthFromStorage();

  if (!state.currentUser || !state.authToken) {
    window.location.href = "./login.html";
    return;
  }

  loadOrders();
});

/* ========== DOM refs ========== */

function cacheEls() {
  els.message = document.getElementById("orders-message");
  els.container = document.getElementById("orders-container");
  els.emptyState = document.getElementById("empty-state");
  els.orderStats = document.getElementById("order-stats");
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

/* ========== Load & render orders ========== */

async function loadOrders() {
  showLoading(true);

  try {
    const orders = await getUserOrders(state.currentUser.id, state.authToken);
    const list = Array.isArray(orders) ? orders : [];

    showLoading(false);

    if (!list.length) {
      showEmptyState();
      return;
    }

    hideMessage();
    renderOrderStats(list);
    renderOrders(list);
  } catch (err) {
    console.error("Load orders error:", err);
    showLoading(false);
    showMessage(
      (err.data && (err.data.message || err.data.error)) ||
        err.message ||
        "Failed to load orders.",
      true
    );
  }
}

function showLoading(show) {
  const skeleton = els.container?.querySelector('.order-skeleton');
  if (skeleton) {
    skeleton.classList.toggle('hidden', !show);
  }
}

function showEmptyState() {
  els.container.innerHTML = "";
  els.emptyState?.classList.remove("hidden");
  els.orderStats?.classList.add("hidden");
}

function renderOrderStats(orders) {
  if (!els.orderStats) return;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => 
    ['pending', 'awaiting_payment'].includes((o.status || '').toLowerCase())
  ).length;
  const shippedOrders = orders.filter(o => 
    ['shipping', 'shipped'].includes((o.status || '').toLowerCase())
  ).length;
  const deliveredOrders = orders.filter(o => 
    (o.status || '').toLowerCase() === 'delivered'
  ).length;

  els.orderStats.innerHTML = `
    <div class="bg-white rounded-xl p-4 border border-gallery-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gallery-100 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-gallery-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <div>
          <p class="text-2xl font-display text-gallery-900">${totalOrders}</p>
          <p class="text-xs text-gallery-500">Total Orders</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl p-4 border border-gallery-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <p class="text-2xl font-display text-gallery-900">${pendingOrders}</p>
          <p class="text-xs text-gallery-500">Pending</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl p-4 border border-gallery-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
          </svg>
        </div>
        <div>
          <p class="text-2xl font-display text-gallery-900">${shippedOrders}</p>
          <p class="text-xs text-gallery-500">Shipping</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-xl p-4 border border-gallery-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <p class="text-2xl font-display text-gallery-900">${deliveredOrders}</p>
          <p class="text-xs text-gallery-500">Delivered</p>
        </div>
      </div>
    </div>
  `;
  
  els.orderStats.classList.remove("hidden");
}

function renderOrders(orders) {
  els.container.innerHTML = "";

  orders.forEach((order, index) => {
    const orderId = order.id || order.order_id || null;
    const createdRaw = order.created_at || order.createdAt;
    const createdAt = createdRaw
      ? new Date(createdRaw).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Unknown date";

    const status = order.status || "unknown";
    const statusInfo = getStatusBadge(status);

    // Try to read subtotal & total
    const subtotal =
      Number(order.subtotal ?? order.paintings_subtotal ?? 0) || 0;
    const total = Number(order.total ?? order.total_price ?? 0) || subtotal;

    // Approximate item count
    const rawItems =
      order.items || order.details || order.paintings || order.order_items || [];
    let itemCount = 0;
    if (Array.isArray(rawItems) && rawItems.length) {
      itemCount = rawItems.reduce(
        (sum, it) => sum + (Number(it.quantity) || 1),
        0
      );
    }

    // If we don't have a valid id, just render a non-clickable div
    const wrapperTag = orderId != null ? "a" : "div";
    const card = document.createElement(wrapperTag);

    if (orderId != null) {
      card.href = `./order-details.html?order_id=${orderId}`;
    }

    card.className = "block bg-white rounded-2xl shadow-sm border border-gallery-100 hover:shadow-lg hover:border-accent/30 transition-all duration-300 overflow-hidden animate-fade-in";
    card.style.animationDelay = `${index * 100}ms`;

    card.innerHTML = `
      <div class="p-5 sm:p-6">
        <!-- Header Row -->
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div class="flex items-start gap-4">
            <!-- Order Icon -->
            <div class="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            
            <div>
              <h3 class="font-semibold text-gallery-900 text-lg">Order #${orderId ?? "?"}</h3>
              <p class="text-sm text-gallery-500 mt-0.5">${createdAt}</p>
              ${itemCount ? `
                <p class="text-sm text-gallery-600 mt-1 flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  ${itemCount} artwork${itemCount > 1 ? "s" : ""}
                </p>
              ` : ""}
            </div>
          </div>
          
          <!-- Status Badge -->
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.classes} self-start">
            ${statusInfo.icon}
            ${statusInfo.label}
          </span>
        </div>

        <!-- Footer Row -->
        <div class="mt-5 pt-5 border-t border-gallery-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <!-- View Details Link -->
          <div class="flex items-center gap-2 text-sm text-accent font-medium group-hover:text-accent-dark">
            <span>View Details</span>
            <svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
          </div>
          
          <!-- Price -->
          <div class="text-right">
            <p class="text-sm text-gallery-500">
              Subtotal: <span class="text-gallery-700">Ksh ${subtotal.toLocaleString()}</span>
            </p>
            <p class="font-display text-xl text-gallery-900 mt-0.5">
              Ksh ${total.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Progress Bar for Active Orders -->
      ${getProgressBar(status)}
    `;

    card.classList.add("group");
    els.container.appendChild(card);
  });
}

/* ========== Helpers ========== */

function getProgressBar(status) {
  const s = String(status || "").toLowerCase();
  
  // Only show for active orders
  if (s === "delivered" || s === "cancelled" || s === "payment_failed") {
    return "";
  }

  let progress = 0;
  if (s === "awaiting_payment" || s === "pending") progress = 25;
  else if (s === "paid" || s === "processing") progress = 50;
  else if (s === "shipped" || s === "shipping") progress = 75;
  
  if (progress === 0) return "";

  return `
    <div class="px-5 pb-4 sm:px-6 sm:pb-5">
      <div class="flex items-center justify-between text-xs text-gallery-500 mb-2">
        <span>Order Progress</span>
        <span>${progress}%</span>
      </div>
      <div class="h-1.5 bg-gallery-100 rounded-full overflow-hidden">
        <div class="h-full bg-accent rounded-full transition-all duration-500" style="width: ${progress}%"></div>
      </div>
    </div>
  `;
}

function getStatusBadge(status) {
  const s = String(status || "").toLowerCase();

  if (s === "awaiting_payment") {
    return {
      label: "Awaiting payment",
      classes: "bg-yellow-100 text-yellow-800",
      icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
    };
  }
  if (s === "paid") {
    return {
      label: "Paid",
      classes: "bg-green-100 text-green-800",
      icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    };
  }
  if (s === "payment_failed") {
    return {
      label: "Payment failed",
      classes: "bg-red-100 text-red-800",
      icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
    };
  }
  if (s === "pending") {
    return {
      label: "Pending",
      classes: "bg-blue-100 text-blue-800",
      icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
    };
  }
  if (s === "processing") {
    return {
      label: "Processing",
      classes: "bg-purple-100 text-purple-800",
      icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>',
    };
  }
  if (s === "shipped" || s === "shipping") {
    return {
      label: "Shipping",
      classes: "bg-indigo-100 text-indigo-800",
      icon: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>',
    };
  }
  if (s === "delivered") {
    return {
      label: "Delivered",
      classes: "bg-emerald-100 text-emerald-800",
      icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    };
  }
  if (s === "cancelled") {
    return {
      label: "Cancelled",
      classes: "bg-red-100 text-red-800",
      icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
    };
  }

  return {
    label: status || "Unknown",
    classes: "bg-gallery-100 text-gallery-700",
    icon: '',
  };
}

function showMessage(text, isError = false) {
  if (!els.message) return;
  
  const bgColor = isError 
    ? "bg-red-50 border-red-200 text-red-700" 
    : "bg-blue-50 border-blue-200 text-blue-700";
  
  const icon = isError
    ? `<svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    : `<svg class="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  
  els.message.innerHTML = `
    <div class="${bgColor} border rounded-xl p-4 flex items-center gap-3 animate-fade-in">
      ${icon}
      <p class="text-sm font-medium">${text}</p>
    </div>
  `;
  els.message.classList.remove("hidden");
}

function hideMessage() {
  if (!els.message) return;
  els.message.classList.add("hidden");
  els.message.innerHTML = "";
}