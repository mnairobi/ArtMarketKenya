// js/order-details.js
import { getOrder, getOrderDetails } from "./api.js";

const state = {
  currentUser: null,
  authToken: null,
  orderId: null,
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheEls();
  loadAuthFromStorage();
  parseOrderIdFromUrl();

  if (!state.currentUser || !state.authToken) {
    window.location.href = "./login.html";
    return;
  }

  if (!state.orderId) {
    showMessage("No order specified.", true);
    return;
  }

  loadOrder();
});

/* ========== DOM refs ========== */

function cacheEls() {
  els.header = document.getElementById("order-header");
  els.message = document.getElementById("order-message");
  els.content = document.getElementById("order-content");

  els.paymentStatus = document.getElementById("payment-status");
  els.deliveryStatus = document.getElementById("delivery-status");
  els.deliveryInfo = document.getElementById("delivery-info");

  els.items = document.getElementById("order-items");
  els.totals = document.getElementById("order-totals");
}

/* ========== Auth & URL ========== */

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

function parseOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("order_id");
  if (id) {
    state.orderId = Number(id);
  }
}

/* ========== Load & render ========== */

async function loadOrder() {
  showMessage("Loading order details...", false);

  try {
    // 1) Order summary (status, totals, delivery)
    const order = await getOrder(state.orderId, state.authToken);
    if (!order) {
      showMessage("Order not found.", true);
      return;
    }

    // 2) Line items (order details)
    let details = [];
    try {
      const res = await getOrderDetails(state.orderId, state.authToken);
      details = Array.isArray(res) ? res : [];
    } catch (e) {
      console.error("Failed to load order details:", e);
      // We'll still show summary even if this fails
    }

    hideMessage();
    renderOrder(order, details);
  } catch (err) {
    console.error("Load order error:", err);
    showMessage(
      (err.data && (err.data.message || err.data.error)) ||
        err.message ||
        "Failed to load order.",
      true
    );
  }
}

function renderOrder(order, details) {
  els.content.classList.remove("hidden");

  const orderId = order.id || order.order_id || state.orderId;
  const createdRaw = order.created_at || order.createdAt;
  const createdAt = createdRaw
    ? new Date(createdRaw).toLocaleString()
    : "Unknown date";

  els.header.innerHTML = `
    <h1 class="text-2xl font-bold mb-1">Order #${orderId}</h1>
    <p class="text-sm text-gray-500">
      Placed on ${createdAt}
    </p>
  `;

  // Payment / order status
  const status = order.status || "unknown";
  const statusInfo = getStatusBadge(status);
  els.paymentStatus.innerHTML = `
    <span class="text-xs font-medium text-gray-600 mr-1">Payment:</span>
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.classes}">
      ${statusInfo.label}
    </span>
  `;

  // Delivery
  const delivery = order.delivery || null;
  if (delivery) {
    const dStatus = delivery.status || null;
    const dInfo = dStatus ? getDeliveryBadge(dStatus) : null;

    els.deliveryStatus.innerHTML = dInfo
      ? `
        <span class="text-xs font-medium text-gray-600 mr-1">Delivery:</span>
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dInfo.classes}">
          ${dInfo.label}
        </span>
      `
      : "";

    const parts = [];
    if (delivery.address) {
      // If Delivery.to_dict() embeds address object
      const addr = delivery.address;
      parts.push(
        `${addr.county || ""} ${addr.town || ""} ${addr.street || ""}`.trim()
      );
    } else if (delivery.address_text) {
      parts.push(delivery.address_text);
    }
    parts.push(`Status: ${dStatus || "Unknown"}`);

    els.deliveryInfo.innerHTML = parts
      .filter(Boolean)
      .map(
        (line) => `<p><span class="text-gray-700">${line}</span></p>`
      )
      .join("");
  } else {
    els.deliveryStatus.innerHTML = `
      <span class="text-xs font-medium text-gray-600 mr-1">Delivery:</span>
      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-100">
        Not created yet
      </span>
    `;
    els.deliveryInfo.innerHTML =
      '<p class="text-xs text-gray-500">No delivery record found for this order.</p>';
  }

  // Items from details endpoint
  const items = Array.isArray(details) ? details : [];
  renderItems(items);

  // Totals
  const subtotal = Number(order.subtotal ?? order.paintings_subtotal ?? 0) || 0;
  const total = Number(order.total ?? order.total_price ?? 0) || subtotal;

  els.totals.innerHTML = `
    <p class="flex justify-between">
      <span class="text-gray-600">Subtotal</span>
      <span class="font-medium">Ksh ${subtotal.toLocaleString()}</span>
    </p>
    <p class="flex justify-between">
      <span class="text-gray-600">Total</span>
      <span class="font-semibold text-gray-900">Ksh ${total.toLocaleString()}</span>
    </p>
  `;
}

function renderItems(items) {
  els.items.innerHTML = "";

  if (!items || !items.length) {
    els.items.innerHTML =
      '<p class="text-xs text-gray-500">No items found for this order.</p>';
    return;
  }

  items.forEach((it) => {
    const qty = Number(it.quantity || 1);
    const price = Number(it.price || it.unit_price || 0);
    const lineTotal = price * qty;

    const title =
      (it.painting && it.painting.title) ||
      it.title ||
      `Painting #${it.painting_id || ""}`;

    const img =
      (it.painting && it.painting.image_url) ||
      it.image_url ||
      null;

    const row = document.createElement("div");
    row.className =
      "flex items-center justify-between gap-3 border-b last:border-b-0 pb-2";

    row.innerHTML = `
      <div class="flex items-center gap-2">
        ${
          img
            ? `<img src="${img}" alt="${title}" class="w-10 h-10 rounded object-cover border" />`
            : ""
        }
        <div class="text-xs">
          <p class="font-medium text-gray-800">${title}</p>
          <p class="text-gray-500">Qty: ${qty}</p>
        </div>
      </div>
      <div class="text-xs text-right">
        <p class="text-gray-500">Ksh ${price.toLocaleString()} each</p>
        <p class="font-semibold text-gray-900">
          Ksh ${lineTotal.toLocaleString()}
        </p>
      </div>
    `;
    els.items.appendChild(row);
  });
}

/* ========== Helpers ========== */

function getStatusBadge(status) {
  const s = String(status || "").toLowerCase();

  if (s === "awaiting_payment") {
    return {
      label: "Awaiting payment",
      classes: "bg-yellow-100 text-yellow-800",
    };
  }
  if (s === "paid") {
    return {
      label: "Paid",
      classes: "bg-green-100 text-green-800",
    };
  }
  if (s === "payment_failed") {
    return {
      label: "Payment failed",
      classes: "bg-red-100 text-red-800",
    };
  }
  if (s === "pending") {
    return {
      label: "Pending",
      classes: "bg-blue-100 text-blue-800",
    };
  }

  return {
    label: status || "Unknown",
    classes: "bg-gray-100 text-gray-700",
  };
}

function getDeliveryBadge(status) {
  const s = String(status || "").toLowerCase();

  if (s === "awaiting_payment") {
    return {
      label: "Awaiting payment",
      classes: "bg-yellow-50 text-yellow-800 border border-yellow-100",
    };
  }
  if (s === "pending") {
    return {
      label: "Pending dispatch",
      classes: "bg-blue-50 text-blue-800 border border-blue-100",
    };
  }
  if (s === "shipping") {
    return {
      label: "Shipping",
      classes: "bg-indigo-50 text-indigo-800 border border-indigo-100",
    };
  }
  if (s === "delivered") {
    return {
      label: "Delivered",
      classes: "bg-emerald-50 text-emerald-800 border border-emerald-100",
    };
  }
  if (s === "cancelled") {
    return {
      label: "Cancelled",
      classes: "bg-red-50 text-red-800 border border-red-100",
    };
  }

  return {
    label: status || "Unknown",
    classes: "bg-gray-50 text-gray-700 border border-gray-100",
  };
}

function showMessage(text, isError = false) {
  if (!els.message) return;
  els.message.textContent = text;
  els.message.classList.remove("hidden");
  els.message.className = `mb-4 text-sm ${
    isError ? "text-red-700" : "text-gray-700"
  }`;
  els.content.classList.add("hidden");
}

function hideMessage() {
  if (!els.message) return;
  els.message.classList.add("hidden");
  els.message.textContent = "";
}
// Add this function to order-details.js

function renderDeliveryInfo(delivery) {
  const container = document.getElementById('delivery-info');
  if (!container) return;

  if (!delivery) {
    container.innerHTML = `
      <div class="text-gray-500 text-sm">
        <p>Delivery information not available yet.</p>
      </div>
    `;
    return;
  }

  // Status badge colors
  const statusColors = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'shipping': 'bg-indigo-100 text-indigo-800',
    'delivered': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  };

  // Status icons
  const statusIcons = {
    'pending': '⏳',
    'processing': '📦',
    'shipping': '🚚',
    'delivered': '✅',
    'cancelled': '❌'
  };

  const statusColor = statusColors[delivery.status] || 'bg-gray-100 text-gray-800';
  const statusIcon = statusIcons[delivery.status] || '📋';

  let html = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Delivery Status -->
      <div>
        <label class="text-sm font-semibold text-gray-600">Status</label>
        <div class="mt-1">
          <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusColor}">
            <span>${statusIcon}</span>
            <span>${delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}</span>
          </span>
        </div>
      </div>

      <!-- Delivery Address -->
      ${delivery.address ? `
        <div>
          <label class="text-sm font-semibold text-gray-600">Delivery Address</label>
          <p class="text-sm text-gray-800 mt-1">
            ${delivery.address.street || ''}<br>
            ${delivery.address.town || ''}, ${delivery.address.county || ''}<br>
            ${delivery.address.postal_code || ''}
          </p>
        </div>
      ` : ''}
    </div>

    <!-- Tracking Information (if available) -->
    ${delivery.tracking_number ? `
      <div class="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-indigo-800">Tracking Number</label>
            <p class="text-sm text-indigo-900 font-mono mt-1">${delivery.tracking_number}</p>
          </div>
          ${delivery.carrier ? `
            <div>
              <label class="text-sm font-semibold text-indigo-800">Carrier</label>
              <p class="text-sm text-indigo-900 mt-1">${delivery.carrier}</p>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}

    <!-- Estimated Delivery Date -->
    ${delivery.estimated_delivery ? `
      <div class="mt-4 p-3 bg-blue-50 rounded-lg">
        <label class="text-sm font-semibold text-blue-800">Estimated Delivery</label>
        <p class="text-sm text-blue-900 mt-1">
          ${new Date(delivery.estimated_delivery).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>
    ` : ''}

    <!-- Actual Delivery Date (if delivered) -->
    ${delivery.actual_delivery ? `
      <div class="mt-4 p-3 bg-green-50 rounded-lg">
        <label class="text-sm font-semibold text-green-800">Delivered On</label>
        <p class="text-sm text-green-900 mt-1">
          ${new Date(delivery.actual_delivery).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    ` : ''}

    <!-- Delivery Notes -->
    ${delivery.notes ? `
      <div class="mt-4 p-3 bg-gray-50 rounded-lg">
        <label class="text-sm font-semibold text-gray-700">Delivery Notes</label>
        <p class="text-sm text-gray-800 mt-1">${delivery.notes}</p>
      </div>
    ` : ''}

    <!-- Delivery Timeline -->
    <div class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Delivery Timeline</h3>
      <div class="space-y-3">
        ${renderDeliveryTimeline(delivery)}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderDeliveryTimeline(delivery) {
  const steps = [
    { status: 'pending', label: 'Order Confirmed', icon: '✓', active: true },
    { status: 'processing', label: 'Processing', icon: '📦', active: ['processing', 'shipping', 'delivered'].includes(delivery.status) },
    { status: 'shipping', label: 'Shipped', icon: '🚚', active: ['shipping', 'delivered'].includes(delivery.status) },
    { status: 'delivered', label: 'Delivered', icon: '✅', active: delivery.status === 'delivered' }
  ];

  return steps.map((step, index) => {
    const isActive = step.active;
    const isCurrent = delivery.status === step.status;

    return `
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
        }">
          ${step.icon}
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}">
            ${step.label}
            ${isCurrent ? '<span class="ml-2 text-xs text-indigo-600">(Current)</span>' : ''}
          </p>
        </div>
        ${index < steps.length - 1 ? `
          <div class="h-px flex-1 ${isActive ? 'bg-indigo-300' : 'bg-gray-200'}"></div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Update your loadOrderDetails function to fetch and display delivery
async function loadOrderDetails() {
  const orderId = getOrderIdFromUrl();
  if (!orderId) {
    showMessage("Order ID not found", true);
    return;
  }

  try {
    const token = localStorage.getItem("auth_token");
    
    // Fetch order
    const orderResponse = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const order = await orderResponse.json();

    // Fetch order details
    const detailsResponse = await fetch(`${API_BASE_URL}/orders/${orderId}/details`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const details = await detailsResponse.json();

    // Fetch delivery info
    let delivery = null;
    try {
      const deliveryResponse = await fetch(`${API_BASE_URL}/deliveries/${orderId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (deliveryResponse.ok) {
        delivery = await deliveryResponse.json();
      }
    } catch (err) {
      console.log("No delivery info yet");
    }

    // Render everything
    renderOrderHeader(order);
    renderOrderItems(details);
    renderPaymentSummary(order);
    renderDeliveryInfo(delivery);  // Add this line

  } catch (err) {
    console.error("Failed to load order:", err);
    showMessage("Failed to load order details", true);
  }
}