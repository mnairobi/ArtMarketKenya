// js/checkout.js
import {
  getCart,
  getAllPaintings,
  getUserAddresses,
  createAddress,
  createOrder,
  createDelivery,
  initiateMpesaPayment, // <-- make sure this exists in api.js
} from "./api.js";

// Predefined locations around Nairobi
const LOCATION_DATA = {
  Nairobi: {
    CBD: ["Kenyatta Avenue", "Moi Avenue", "Tom Mboya Street"],
    Westlands: ["Waiyaki Way", "Ring Road Westlands", "Parklands Road"],
    Kilimani: ["Ngong Road", "Argwings Kodhek Road", "Lenana Road"],
    Kasarani: ["Thika Road", "Kasarani Mwiki Road"],
    Embakasi: ["Airport North Road", "Outering Road"],
  },
};

const state = {
  currentUser: null,
  authToken: null,
  cart: null,
  addresses: [],
  selectedAddressId: null,
  subtotal: 0,
  isPlacingOrder: false,
  paintingMap: new Map(), // painting_id -> painting (for price/title)
  shippingFee: 0, // computed from address (200 for Nairobi)
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheEls();
  initLocationSelectors(); // fill county/town/street
  loadAuthFromStorage();

  if (!state.currentUser || !state.authToken) {
    window.location.href = "./login.html";
    return;
  }

  initEvents();
  initCheckout();
});

/* ========== DOM refs ========== */

function cacheEls() {
  els.message = document.getElementById("checkout-message");
  els.addressList = document.getElementById("address-list");
  els.toggleNewAddress = document.getElementById("toggle-new-address");
  els.newAddressForm = document.getElementById("new-address-form");
  els.cancelNewAddress = document.getElementById("cancel-new-address");

  els.countySelect = document.getElementById("county-select");
  els.townSelect = document.getElementById("town-select");
  els.streetSelect = document.getElementById("street-select");

  els.shippingFee = document.getElementById("shipping-fee");
  els.shippingFeeSummary = document.getElementById("shipping-fee-summary");
  els.deliveryNote = document.getElementById("delivery-note");

  els.cartItemsList = document.getElementById("cart-items-list");
  els.subtotal = document.getElementById("subtotal");
  els.total = document.getElementById("total");

  els.paymentMethod = document.getElementById("payment-method");
  els.placeOrderBtn = document.getElementById("place-order-btn");

  // M-Pesa modal elements
  els.mpesaModal = document.getElementById("mpesa-modal");
  els.mpesaModalPhone = document.getElementById("mpesa-modal-phone");
  els.mpesaModalError = document.getElementById("mpesa-modal-error");
  els.mpesaModalCancel = document.getElementById("mpesa-modal-cancel");
  els.mpesaModalProceed = document.getElementById("mpesa-modal-proceed");
}

/* ========== Location selectors (Nairobi) ========== */

function initLocationSelectors() {
  const countySelect = document.getElementById("county-select");
  const townSelect = document.getElementById("town-select");
  const streetSelect = document.getElementById("street-select");

  if (!countySelect || !townSelect || !streetSelect) return;

  els.countySelect = countySelect;
  els.townSelect = townSelect;
  els.streetSelect = streetSelect;

  countySelect.innerHTML = '<option value="">Select county</option>';
  Object.keys(LOCATION_DATA).forEach((county) => {
    const opt = document.createElement("option");
    opt.value = county;
    opt.textContent = county;
    countySelect.appendChild(opt);
  });

  countySelect.addEventListener("change", () => {
    const county = countySelect.value;
    populateTowns(county);
  });

  townSelect.addEventListener("change", () => {
    const county = countySelect.value;
    const town = townSelect.value;
    populateStreets(county, town);
  });

  // Default to Nairobi
  if (LOCATION_DATA["Nairobi"]) {
    countySelect.value = "Nairobi";
    populateTowns("Nairobi");
  }
}

function populateTowns(county) {
  const townSelect = els.townSelect;
  const streetSelect = els.streetSelect;
  if (!townSelect || !streetSelect) return;

  townSelect.innerHTML = '<option value="">Select town / area</option>';
  streetSelect.innerHTML = '<option value="">Select street / estate</option>';

  if (!county || !LOCATION_DATA[county]) return;

  const towns = Object.keys(LOCATION_DATA[county]);
  towns.forEach((town) => {
    const opt = document.createElement("option");
    opt.value = town;
    opt.textContent = town;
    townSelect.appendChild(opt);
  });

  if (towns.length) {
    townSelect.value = towns[0];
    populateStreets(county, towns[0]);
  }
}

function populateStreets(county, town) {
  const streetSelect = els.streetSelect;
  if (!streetSelect) return;

  streetSelect.innerHTML = '<option value="">Select street / estate</option>';

  if (!county || !town || !LOCATION_DATA[county] || !LOCATION_DATA[county][town])
    return;

  const streets = LOCATION_DATA[county][town];
  streets.forEach((street) => {
    const opt = document.createElement("option");
    opt.value = street;
    opt.textContent = street;
    streetSelect.appendChild(opt);
  });

  if (streets.length) {
    streetSelect.value = streets[0];
  }
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

/* ========== Init ========== */

function initEvents() {
  if (els.toggleNewAddress) {
    els.toggleNewAddress.addEventListener("click", () => {
      const hidden = els.newAddressForm.classList.contains("hidden");
      els.newAddressForm.classList.toggle("hidden", !hidden);
    });
  }

  if (els.cancelNewAddress) {
    els.cancelNewAddress.addEventListener("click", () => {
      els.newAddressForm.reset();
      els.newAddressForm.classList.add("hidden");
    });
  }

  if (els.newAddressForm) {
    els.newAddressForm.addEventListener("submit", handleNewAddressSubmit);
  }

  if (els.placeOrderBtn) {
    els.placeOrderBtn.addEventListener("click", handlePlaceOrder);
  }

  // M-Pesa modal events
  if (els.mpesaModalCancel) {
    els.mpesaModalCancel.addEventListener("click", () => {
      closeMpesaModal();
    });
  }

  if (els.mpesaModal) {
    // click outside to close
    els.mpesaModal.addEventListener("click", (e) => {
      if (e.target === els.mpesaModal) {
        closeMpesaModal();
      }
    });
  }

  if (els.mpesaModalProceed) {
    els.mpesaModalProceed.addEventListener("click", handleMpesaProceed);
  }
}

async function initCheckout() {
  showMessage("Loading your cart...", false);
  try {
    await loadCartWithPaintings();
    await loadAddresses();

    if (
      !state.cart ||
      !Array.isArray(state.cart.items) ||
      state.cart.items.length === 0
    ) {
      showMessage(
        "Your cart is empty. Add some paintings before checkout.",
        true
      );
      els.placeOrderBtn.disabled = true;
      return;
    }

    renderCartSummary();
    renderAddresses();

    if (state.addresses.length > 0) {
      state.selectedAddressId = state.addresses[0].id;
      recalcShippingFromAddress();
    } else {
      state.shippingFee = 0;
      updateTotalsUI();
    }

    if (els.deliveryNote) {
      els.deliveryNote.textContent =
        "Flat shipping fee: Ksh 200 for all Nairobi locations.";
    }

    showMessage("", false, true);
  } catch (err) {
    console.error(err);
    showMessage(
      (err.data && (err.data.message || err.data.error)) ||
        err.message ||
        "Failed to load checkout data.",
      true
    );
  }
}

/* ========== API loaders ========== */

// Load paintings for prices + cart items
async function loadCartWithPaintings() {
  // 1) paintings
  const paintings = await getAllPaintings();
  const paintingList = Array.isArray(paintings) ? paintings : [];
  state.paintingMap = new Map(paintingList.map((p) => [p.id, p]));

  // 2) cart
  try {
    const cart = await getCart(state.currentUser.id, state.authToken);
    state.cart = cart || { items: [] };
  } catch (err) {
    if (err.status === 404) {
      state.cart = { items: [] };
    } else {
      throw err;
    }
  }
}

async function loadAddresses() {
  try {
    const res = await getUserAddresses(state.currentUser.id, state.authToken);
    state.addresses = Array.isArray(res) ? res : [];
  } catch (err) {
    if (err.status === 404) {
      state.addresses = [];
    } else {
      throw err;
    }
  }
}

/* ========== Rendering ========== */

function renderCartSummary() {
  const container = els.cartItemsList;
  container.innerHTML = "";

  const items = state.cart?.items || [];
  if (!items.length) {
    container.innerHTML =
      '<p class="text-sm text-gray-500 text-center">No items in cart.</p>';
    state.subtotal = 0;
    updateTotalsUI();
    return;
  }

  let subtotal = 0;

  items.forEach((item) => {
    const qty = item.quantity || 1;

    // Use paintingMap for price/title; fallback to "Painting #id"
    const painting =
      (item.painting_id && state.paintingMap.get(item.painting_id)) || {};
    const title = painting.title || `Painting #${item.painting_id}`;
    const unitPrice = Number(painting.price || 0);

    const linePrice = unitPrice * qty;
    subtotal += linePrice;

    const row = document.createElement("div");
    row.className =
      "flex justify-between items-center py-2 border-b last:border-b-0";
    row.innerHTML = `
      <div class="text-xs">
        <p class="font-medium text-gray-800">${title}</p>
        <p class="text-gray-500">Qty: ${qty}</p>
      </div>
      <div class="text-xs font-semibold">
        Ksh ${linePrice.toLocaleString()}
      </div>
    `;
    container.appendChild(row);
  });

  state.subtotal = subtotal;
  updateTotalsUI();
}

function renderAddresses() {
  const container = els.addressList;
  container.innerHTML = "";

  if (!state.addresses.length) {
    container.innerHTML =
      '<p class="text-sm text-gray-500">You have no saved addresses. Add one below.</p>';
    return;
  }

  state.addresses.forEach((addr) => {
    const id = addr.id;
    const labelText = `${addr.county || ""}, ${addr.town || ""}, ${
      addr.street || ""
    }`;

    const wrapper = document.createElement("label");
    wrapper.className =
      "flex items-start gap-2 text-sm border rounded px-3 py-2 cursor-pointer hover:border-indigo-500";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "address";
    radio.value = id;
    radio.className = "mt-1";

    if (
      String(id) === String(state.selectedAddressId) ||
      !state.selectedAddressId
    ) {
      radio.checked = true;
      state.selectedAddressId = id;
    }

    radio.addEventListener("change", () => {
      state.selectedAddressId = id;
      recalcShippingFromAddress();
    });

    const span = document.createElement("span");
    span.textContent = labelText;

    wrapper.appendChild(radio);
    wrapper.appendChild(span);
    container.appendChild(wrapper);
  });
}

/* ========== Shipping / Totals ========== */

function getSelectedAddress() {
  if (!state.selectedAddressId) return null;
  return (
    state.addresses.find(
      (a) => String(a.id) === String(state.selectedAddressId)
    ) || null
  );
}

// Flat 200 for all Nairobi addresses, 0 otherwise
function computeShippingForAddress(addr) {
  if (!addr || !addr.county) return 0;
  const countyLower = String(addr.county).toLowerCase();
  if (countyLower === "nairobi") return 200;
  return 0;
}

function recalcShippingFromAddress() {
  const addr = getSelectedAddress();
  state.shippingFee = computeShippingForAddress(addr);
  updateTotalsUI();
}

function updateTotalsUI() {
  const shipping = Number(state.shippingFee) || 0;

  if (els.shippingFee) {
    els.shippingFee.textContent = `Ksh ${shipping.toLocaleString()}`;
  }
  if (els.shippingFeeSummary) {
    els.shippingFeeSummary.textContent = `Ksh ${shipping.toLocaleString()}`;
  }

  const subtotal = state.subtotal || 0;
  const total = subtotal + shipping;

  if (els.subtotal) {
    els.subtotal.textContent = `Ksh ${subtotal.toLocaleString()}`;
  }
  if (els.total) {
    els.total.textContent = `Ksh ${total.toLocaleString()}`;
  }
}

/* ========== Address creation ========== */

async function handleNewAddressSubmit(e) {
  e.preventDefault();
  const form = e.target;

  const data = {
    user_id: state.currentUser.id,
    county: form.county.value.trim(),
    town: form.town.value.trim(),
    street: form.street.value.trim(),
  };

  if (!data.county || !data.town || !data.street) {
    showMessage("County, town, and street are required.", true);
    return;
  }

  try {
    const created = await createAddress(data, state.authToken);
    const address =
      created.address && created.address.id ? created.address : created;

    state.addresses.push(address);
    state.selectedAddressId = address.id;
    renderAddresses();
    recalcShippingFromAddress();

    form.reset();
    form.classList.add("hidden");
    showMessage("", false, true);
  } catch (err) {
    console.error("Address create error:", err);
    showMessage(
      (err.data && (err.data.message || err.data.error)) ||
        "Failed to save address.",
      true
    );
  }
}

/* ========== M-Pesa modal helpers ========== */

function openMpesaModal() {
  if (!els.mpesaModal) return; // fallback if modal not in DOM
  els.mpesaModal.classList.remove("hidden");
  if (els.mpesaModalError) {
    els.mpesaModalError.classList.add("hidden");
    els.mpesaModalError.textContent = "";
  }
  if (els.mpesaModalPhone) {
    els.mpesaModalPhone.value = "";
    els.mpesaModalPhone.focus();
  }
}

function closeMpesaModal() {
  if (!els.mpesaModal) return;
  els.mpesaModal.classList.add("hidden");
}

/* ========== Place order (entry point) ========== */

function handlePlaceOrder() {
  if (state.isPlacingOrder) return;

  const items = state.cart?.items || [];
  if (!items.length) {
    alert("Your cart is empty.");
    return;
  }

  if (!state.selectedAddressId) {
    alert("Please select or add a delivery address.");
    return;
  }

  const paymentMethod = els.paymentMethod?.value || "mpesa";

  if (paymentMethod === "mpesa") {
    // Show Killimall-style card for phone entry
    openMpesaModal();
  } else {
    // Cash on delivery: go straight to order + delivery
    submitOrderFlow({ paymentMethod: "cod", phone: null });
  }
}

/* ========== M-Pesa Proceed button handler ========== */

function handleMpesaProceed() {
  if (!els.mpesaModalPhone) {
    // No modal in DOM, fallback: simple prompt
    const phone = window.prompt("Enter your M-Pesa phone number (e.g. 2547...):");
    if (!phone) return;
    submitOrderFlow({ paymentMethod: "mpesa", phone: phone.trim() });
    return;
  }

  const phone = els.mpesaModalPhone.value.trim();
  if (!phone) {
    if (els.mpesaModalError) {
      els.mpesaModalError.textContent = "Please enter a valid M-Pesa phone number.";
      els.mpesaModalError.classList.remove("hidden");
    }
    return;
  }

  if (els.mpesaModalError) {
    els.mpesaModalError.classList.add("hidden");
    els.mpesaModalError.textContent = "";
  }

  // Close modal and proceed with order + payment
  closeMpesaModal();
  submitOrderFlow({ paymentMethod: "mpesa", phone });
}

/* ========== Core flow: order + delivery + (optional) M-Pesa ========== */

async function submitOrderFlow({ paymentMethod, phone }) {
  if (state.isPlacingOrder) return;

  const items = state.cart?.items || [];
  if (!items.length) {
    showMessage("Your cart is empty.", true);
    return;
  }

  if (!state.selectedAddressId) {
    showMessage("Please select or add a delivery address.", true);
    return;
  }

  state.isPlacingOrder = true;
  if (els.placeOrderBtn) {
    els.placeOrderBtn.disabled = true;
    els.placeOrderBtn.textContent = "Placing order...";
  }
  if (els.mpesaModalProceed) {
    els.mpesaModalProceed.disabled = true;
  }

  try {
    // Build paintings payload as expected by OrderListResource
    // Build items payload as expected by OrderService.create_order
      const itemsPayload = items.map((item) => ({
        painting_id: item.painting_id || item.id,
        quantity: item.quantity || 1,
      }));

    const orderStatus =
      paymentMethod === "mpesa" ? "awaiting_payment" : "pending";

    const orderBody = {
      buyer_id: state.currentUser.id,
      items: itemsPayload,           // <-- key name must be "items"
      delivery_cost: state.shippingFee,
      status: orderStatus,
    };

    const order = await createOrder(orderBody, state.authToken);

    // 1) Create order
    // const order = await createOrder(orderBody, state.authToken);

    // 2) Create delivery record
    try {
      const initialDeliveryStatus =
  paymentMethod === "mpesa" ? "awaiting_payment" : "pending";

  await createDelivery(
    {
      order_id: order.id,
      address_id: state.selectedAddressId,
      status: initialDeliveryStatus,   // <-- pass status
    },
    state.authToken
  );
    } catch (err) {
      console.error("Delivery create error:", err);
      alert(
        (err.data && (err.data.message || err.data.error)) ||
          "Order placed, but failed to create delivery record."
      );
    }

    // 3) If M-Pesa: initiate payment
    if (paymentMethod === "mpesa") {
      const paymentResp = await initiateMpesaPayment(
        {
          order_id: order.id,
          phone,
        },
        state.authToken
      );

      showMessage(
        paymentResp.message ||
          "M-Pesa STK push initiated. Please check your phone to complete payment.",
        false
      );
      window.location.href = `./order-details.html?order_id=${order.id}`;
      // Optional: redirect or show an "Awaiting payment" screen instead of home
      // window.location.href = "./orders.html";
    } else {
      // COD
      // showMessage(
      //   `Order placed successfully! Order #${order.id || ""}. You will pay on delivery.`,
      //   false
      // );
      // Optional: redirect to confirmation
      // window.location.href = "./orders.html";
          // COD
    // showMessage(`Order placed successfully! Order #${order.id}.`, false);
      window.location.href = `./order-details.html?order_id=${order.id}`;
      }
  } catch (err) {
    console.error("Order error:", err);
    showMessage(
      (err.data && (err.data.message || err.data.error)) ||
        "Failed to place order.",
      true
    );
  } finally {
    state.isPlacingOrder = false;
    if (els.placeOrderBtn) {
      els.placeOrderBtn.disabled = false;
      els.placeOrderBtn.textContent = "Place order";
    }
    if (els.mpesaModalProceed) {
      els.mpesaModalProceed.disabled = false;
    }
  }
}

/* ========== Helpers ========== */

function showMessage(text, isError = false, hide = false) {
  if (!els.message) return;
  if (hide || !text) {
    els.message.classList.add("hidden");
    els.message.textContent = "";
    return;
  }
  els.message.textContent = text;
  els.message.classList.remove("hidden");
  els.message.classList.toggle("text-red-600", isError);
  els.message.classList.toggle("text-gray-700", !isError);
}