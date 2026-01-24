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
  showMessage("Loading your orders...", false);

  try {
    const orders = await getUserOrders(state.currentUser.id, state.authToken);
    const list = Array.isArray(orders) ? orders : [];

    if (!list.length) {
      showMessage("You have not placed any orders yet.", false);
      els.container.innerHTML = "";
      return;
    }

    hideMessage();
    renderOrders(list);
  } catch (err) {
    console.error("Load orders error:", err);
    showMessage(
      (err.data && (err.data.message || err.data.error)) ||
        err.message ||
        "Failed to load orders.",
      true
    );
  }
}

function renderOrders(orders) {
  els.container.innerHTML = "";

  orders.forEach((order) => {
    const orderId = order.id || order.order_id || null;
    const createdRaw = order.created_at || order.createdAt;
    const createdAt = createdRaw
      ? new Date(createdRaw).toLocaleString()
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

    card.className =
      "block bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md cursor-pointer transition";

    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-gray-900">Order #${orderId ?? "?"}</p>
          <p class="text-xs text-gray-500">Placed on ${createdAt}</p>
          ${
            itemCount
              ? `<p class="text-xs text-gray-500 mt-1">${itemCount} item${
                  itemCount > 1 ? "s" : ""
                }</p>`
              : ""
          }
        </div>
        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusInfo.classes}">
          ${statusInfo.label}
        </span>
      </div>

      <div class="mt-3 flex justify-between items-end text-sm">
        <div class="text-xs text-gray-500">
          <!-- extra info later if needed -->
        </div>
        <div class="text-right">
          <p class="text-gray-600">
            Subtotal:
            <span class="font-medium">Ksh ${subtotal.toLocaleString()}</span>
          </p>
          <p class="text-gray-900 font-semibold">
            Total: Ksh ${total.toLocaleString()}
          </p>
        </div>
      </div>
    `;

    els.container.appendChild(card);
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
  if (s === "shipped" || s === "shipping") {
    return {
      label: "Shipping",
      classes: "bg-indigo-100 text-indigo-800",
    };
  }
  if (s === "delivered") {
    return {
      label: "Delivered",
      classes: "bg-emerald-100 text-emerald-800",
    };
  }

  return {
    label: status || "Unknown",
    classes: "bg-gray-100 text-gray-700",
  };
}

function showMessage(text, isError = false) {
  if (!els.message) return;
  els.message.textContent = text;
  els.message.classList.remove("hidden");
  els.message.className = `mb-4 text-sm ${
    isError ? "text-red-700" : "text-gray-700"
  }`;
}

function hideMessage() {
  if (!els.message) return;
  els.message.classList.add("hidden");
  els.message.textContent = "";
}