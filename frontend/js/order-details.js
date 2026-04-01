// js/order-details.js
import { getOrder, getOrderDetails, getDelivery } from "./api.js";

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
    // 1) Order summary
    const order = await getOrder(state.orderId, state.authToken);
    if (!order) {
      showMessage("Order not found.", true);
      return;
    }

    // 2) Line items
    let details = [];
    try {
      const res = await getOrderDetails(state.orderId, state.authToken);
      details = Array.isArray(res) ? res : [];
    } catch (e) {
      console.error("Failed to load order details:", e);
    }

    // 3) Delivery info - fetch separately for full details
    let delivery = order.delivery || null;
    try {
      const deliveryRes = await getDelivery(state.orderId, state.authToken);
      if (deliveryRes && !deliveryRes.message) {
        delivery = deliveryRes;
      }
    } catch (e) {
      console.log("No separate delivery info, using order.delivery");
    }

    hideMessage();
    renderOrder(order, details, delivery);
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

/* ========== Render Order ========== */

function renderOrder(order, details, delivery) {
  els.content.classList.remove("hidden");

  const orderId = order.id || order.order_id || state.orderId;
  const createdRaw = order.created_at || order.createdAt;
  const createdAt = createdRaw
    ? new Date(createdRaw).toLocaleString()
    : "Unknown date";

  // Header with actions
  els.header.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="font-display text-3xl lg:text-4xl text-gallery-900 mb-2">Order #${orderId}</h1>
        <p class="text-gallery-500">Placed on ${createdAt}</p>
      </div>
      <div class="flex gap-3">
        <button onclick="window.print()" class="inline-flex items-center gap-2 px-4 py-2 border border-gallery-200 rounded-lg text-sm text-gallery-700 hover:bg-gallery-50 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Print
        </button>
        <a href="mailto:support@sanaa.com?subject=Order%20${orderId}" class="inline-flex items-center gap-2 px-4 py-2 border border-gallery-200 rounded-lg text-sm text-gallery-700 hover:bg-gallery-50 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Get Help
        </a>
      </div>
    </div>
  `;

  // Payment status
  const status = order.status || "unknown";
  const statusInfo = getStatusBadge(status);
  els.paymentStatus.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gallery-700">Payment</span>
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.classes}">
        ${getStatusIcon(status)}
        ${statusInfo.label}
      </span>
    </div>
  `;

  // Delivery status badge
  if (delivery) {
    const dStatus = delivery.status || "pending";
    const dInfo = getDeliveryBadge(dStatus);
    els.deliveryStatus.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gallery-700">Delivery</span>
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${dInfo.classes}">
          ${getDeliveryIcon(dStatus)}
          ${dInfo.label}
        </span>
      </div>
    `;
  } else {
    els.deliveryStatus.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gallery-700">Delivery</span>
        <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gallery-100 text-gallery-600">
          Not created yet
        </span>
      </div>
    `;
  }

  // Render delivery info section
  renderDeliveryInfo(delivery);

  // Items
  renderItems(details);

  // Totals with better styling
  const subtotal = Number(order.subtotal ?? 0);
  const total = Number(order.total ?? subtotal);
  els.totals.innerHTML = `
    <div class="space-y-3 py-4 border-b border-gallery-100">
      <div class="flex justify-between text-sm">
        <span class="text-gallery-600">Subtotal</span>
        <span class="font-medium text-gallery-900">Ksh ${subtotal.toLocaleString()}</span>
      </div>
    </div>
    <div class="pt-4">
      <div class="flex justify-between items-center">
        <span class="font-display text-lg text-gallery-900">Total</span>
        <span class="font-display text-2xl text-gallery-900">Ksh ${total.toLocaleString()}</span>
      </div>
    </div>
  `;
}

/* ========== Delivery Info ========== */

function renderDeliveryInfo(delivery) {
  const container = els.deliveryInfo;
  if (!container) return;

  if (!delivery) {
    container.innerHTML = `
      <div class="text-gallery-500 text-sm py-8 text-center">
        <svg class="w-12 h-12 mx-auto mb-3 text-gallery-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <p>Delivery information not available yet.</p>
      </div>
    `;
    return;
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    processing: "bg-blue-100 text-blue-800 border-blue-200",
    shipping: "bg-indigo-100 text-indigo-800 border-indigo-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };

  const statusColor = statusColors[delivery.status] || "bg-gallery-100 text-gallery-800 border-gallery-200";

  container.innerHTML = `
    <!-- Status & Address -->
    <div class="space-y-4">
      <div>
        <label class="text-xs font-semibold text-gallery-500 uppercase tracking-wider">Status</label>
        <div class="mt-2">
          <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${statusColor}">
            ${getStatusEmoji(delivery.status)} ${capitalize(delivery.status)}
          </span>
        </div>
      </div>

      ${delivery.address ? `
        <div>
          <label class="text-xs font-semibold text-gallery-500 uppercase tracking-wider">Delivery Address</label>
          <div class="mt-2 text-sm text-gallery-800 bg-gallery-50 rounded-xl p-4 border border-gallery-100">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-gallery-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <div>
                <p class="font-medium">${delivery.address.street || ""}</p>
                <p class="text-gallery-600">${delivery.address.town || ""}${delivery.address.town && delivery.address.county ? ", " : ""}${delivery.address.county || ""}</p>
              </div>
            </div>
          </div>
        </div>
      ` : ""}
    </div>

    <!-- Tracking Info -->
    ${delivery.tracking_number ? `
      <div class="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h3 class="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          Tracking Information
        </h3>
        <div class="space-y-3">
          <div>
            <label class="text-xs font-medium text-blue-700">Tracking Number</label>
            <p class="text-sm text-blue-900 font-mono mt-1 bg-white px-3 py-2 rounded-lg border border-blue-200 select-all">
              ${delivery.tracking_number}
            </p>
          </div>
          ${delivery.carrier ? `
            <div>
              <label class="text-xs font-medium text-blue-700">Carrier</label>
              <p class="text-sm text-blue-900 mt-1">${delivery.carrier}</p>
            </div>
          ` : ""}
        </div>
      </div>
    ` : ""}

    <!-- Estimated Delivery -->
    ${delivery.estimated_delivery ? `
      <div class="mt-4 p-4 bg-accent/10 rounded-xl border border-accent/20 flex items-center gap-3">
        <div class="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-accent-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <div>
          <label class="text-xs font-semibold text-accent-dark">Estimated Delivery</label>
          <p class="text-sm text-gallery-900 font-medium">
            ${formatDate(delivery.estimated_delivery)}
          </p>
        </div>
      </div>
    ` : ""}

    <!-- Actual Delivery -->
    ${delivery.actual_delivery ? `
      <div class="mt-4 p-4 bg-green-50 rounded-xl border border-green-200 flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <label class="text-xs font-semibold text-green-800">Delivered On</label>
          <p class="text-sm text-green-900 font-medium">
            ${formatDateTime(delivery.actual_delivery)}
          </p>
        </div>
      </div>
    ` : ""}

    <!-- Notes -->
    ${delivery.notes ? `
      <div class="mt-4 p-4 bg-gallery-50 rounded-xl border border-gallery-200">
        <label class="text-xs font-semibold text-gallery-600">Delivery Notes</label>
        <p class="text-sm text-gallery-800 mt-1">${delivery.notes}</p>
      </div>
    ` : ""}

    <!-- Timeline -->
    <div class="mt-6 pt-6 border-t border-gallery-100">
      <h3 class="text-sm font-semibold text-gallery-700 mb-4">Delivery Progress</h3>
      ${renderTimeline(delivery)}
    </div>
  `;
}

function renderTimeline(delivery) {
  const currentStatus = delivery.status || "pending";

  const steps = [
    {
      key: "pending",
      label: "Order Confirmed",
      desc: "Your order has been received",
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    },
    {
      key: "processing",
      label: "Processing",
      desc: "Your order is being prepared",
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
    },
    {
      key: "shipping",
      label: "Shipped",
      desc: delivery.tracking_number
        ? `Tracking: ${delivery.tracking_number}`
        : "Your order is on its way",
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>`,
    },
    {
      key: "delivered",
      label: "Delivered",
      desc: delivery.actual_delivery
        ? `Delivered on ${formatDateTime(delivery.actual_delivery)}`
        : "Package delivered to your address",
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
    },
  ];

  // Handle cancelled
  if (currentStatus === "cancelled") {
    return `
      <div class="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-200">
        <div class="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-red-800">Delivery Cancelled</p>
          <p class="text-sm text-red-600 mt-0.5">${delivery.notes || "This delivery has been cancelled."}</p>
        </div>
      </div>
    `;
  }

  const statusOrder = ["pending", "processing", "shipping", "delivered"];
  const currentIndex = statusOrder.indexOf(currentStatus);

  return `
    <div class="relative">
      ${steps
        .map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          let dotClasses, lineClasses, textClasses, descClasses;

          if (isCompleted) {
            dotClasses = "bg-accent text-white";
            lineClasses = "bg-accent";
            textClasses = "text-gallery-900 font-medium";
            descClasses = "text-gallery-600";
          } else if (isCurrent) {
            dotClasses = "bg-accent text-white ring-4 ring-accent/20";
            lineClasses = "bg-gallery-200";
            textClasses = "text-accent-dark font-semibold";
            descClasses = "text-accent";
          } else {
            dotClasses = "bg-gallery-200 text-gallery-400";
            lineClasses = "bg-gallery-200";
            textClasses = "text-gallery-400";
            descClasses = "text-gallery-300";
          }

          return `
            <div class="flex gap-4 ${i < steps.length - 1 ? "pb-6" : ""}">
              <!-- Line + Dot -->
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${dotClasses} transition-all duration-300">
                  ${isCompleted ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : step.icon}
                </div>
                ${i < steps.length - 1 ? `<div class="w-0.5 flex-1 mt-1 ${isCompleted ? lineClasses : "bg-gallery-200"} transition-all duration-300"></div>` : ""}
              </div>

              <!-- Text -->
              <div class="pt-1 pb-2">
                <p class="text-sm ${textClasses} transition-all duration-300">
                  ${step.label}
                  ${isCurrent ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-accent/10 text-accent-dark font-medium">Current</span>' : ""}
                </p>
                <p class="text-xs ${descClasses} mt-0.5">${step.desc}</p>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

/* ========== Render Items ========== */

function renderItems(items) {
  els.items.innerHTML = "";

  if (!items || !items.length) {
    els.items.innerHTML = `
      <div class="text-center py-8 text-gallery-500">
        <svg class="w-12 h-12 mx-auto mb-3 text-gallery-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
        </svg>
        <p class="text-sm">No items found for this order</p>
      </div>
    `;
    return;
  }

  items.forEach((it) => {
    const qty = Number(it.quantity || 1);
    const price = Number(it.price || it.unit_price || 0);
    const lineTotal = price * qty;
    const title = (it.painting && it.painting.title) || it.title || `Painting #${it.painting_id || ""}`;
    const img = (it.painting && it.painting.image_url) || it.image_url || null;

    const row = document.createElement("div");
    row.className = "flex items-center gap-4 p-4 border border-gallery-100 rounded-xl hover:border-accent/30 hover:shadow-sm transition";
    row.innerHTML = `
      <div class="flex-shrink-0">
        ${img 
          ? `<img src="${img}" alt="${title}" class="w-16 h-16 rounded-xl object-cover border border-gallery-200" />` 
          : `<div class="w-16 h-16 rounded-xl bg-gallery-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-gallery-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>`
        }
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-medium text-gallery-900 truncate">${title}</h4>
        <p class="text-sm text-gallery-500 mt-0.5">Quantity: ${qty}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-gallery-500">Ksh ${price.toLocaleString()} each</p>
        <p class="font-semibold text-gallery-900 mt-0.5">Ksh ${lineTotal.toLocaleString()}</p>
      </div>
    `;
    els.items.appendChild(row);
  });
}

/* ========== Helpers ========== */

function getStatusEmoji(status) {
  const map = { pending: "⏳", processing: "📦", shipping: "🚚", delivered: "✅", cancelled: "❌" };
  return map[status] || "📋";
}

function getStatusIcon(status) {
  const icons = {
    awaiting_payment: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
    paid: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    completed: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    payment_failed: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
    pending: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
  };
  return icons[status] || '';
}

function getDeliveryIcon(status) {
  const icons = {
    pending: '⏳',
    processing: '📦',
    shipping: '🚚',
    delivered: '✅',
    cancelled: '❌',
  };
  return icons[status] || '📋';
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "awaiting_payment") return { label: "Awaiting payment", classes: "bg-yellow-100 text-yellow-800" };
  if (s === "paid") return { label: "Paid", classes: "bg-green-100 text-green-800" };
  if (s === "completed") return { label: "Completed", classes: "bg-emerald-100 text-emerald-800" };
  if (s === "payment_failed") return { label: "Payment failed", classes: "bg-red-100 text-red-800" };
  if (s === "pending") return { label: "Pending", classes: "bg-blue-100 text-blue-800" };
  return { label: status || "Unknown", classes: "bg-gallery-100 text-gallery-700" };
}

function getDeliveryBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return { label: "Pending dispatch", classes: "bg-yellow-50 text-yellow-800 border border-yellow-200" };
  if (s === "processing") return { label: "Processing", classes: "bg-blue-50 text-blue-800 border border-blue-200" };
  if (s === "shipping") return { label: "Shipping", classes: "bg-indigo-50 text-indigo-800 border border-indigo-200" };
  if (s === "delivered") return { label: "Delivered", classes: "bg-emerald-50 text-emerald-800 border border-emerald-200" };
  if (s === "cancelled") return { label: "Cancelled", classes: "bg-red-50 text-red-800 border border-red-200" };
  return { label: status || "Unknown", classes: "bg-gallery-50 text-gallery-700 border border-gallery-200" };
}

function showMessage(text, isError = false) {
  if (!els.message) return;
  
  const bgColor = isError 
    ? "bg-red-50 border-red-200 text-red-700" 
    : "bg-blue-50 border-blue-200 text-blue-700";
  
  const icon = isError
    ? `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    : `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  
  els.message.innerHTML = `
    <div class="${bgColor} border rounded-xl p-4 flex items-center gap-3 animate-fade-in">
      ${icon}
      <p class="text-sm font-medium">${text}</p>
    </div>
  `;
  els.message.classList.remove("hidden");
  
  if (els.content) els.content.classList.add("hidden");
}

function hideMessage() {
  if (!els.message) return;
  els.message.classList.add("hidden");
  els.message.innerHTML = "";
}