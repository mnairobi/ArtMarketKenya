// js/checkout.js
import {
  getCart,
  getAllPaintings,
  getUserAddresses,
  createAddress,
  createOrder,
  createDelivery,
  initiateMpesaPayment,
} from "./api.js";

// ══════════════════════════════════════════════════════════════════
// LOCATION DATA - Kenya Counties
// ══════════════════════════════════════════════════════════════════
const LOCATION_DATA = {
  Nairobi: {
    CBD: ["Kenyatta Avenue", "Moi Avenue", "Tom Mboya Street", "Kimathi Street"],
    Westlands: ["Waiyaki Way", "Ring Road Westlands", "Parklands Road", "Mpaka Road"],
    Kilimani: ["Ngong Road", "Argwings Kodhek Road", "Lenana Road", "Dennis Pritt Road"],
    Kasarani: ["Thika Road", "Kasarani Mwiki Road", "Roysambu"],
    Embakasi: ["Airport North Road", "Outering Road", "Pipeline"],
    Karen: ["Karen Road", "Langata Road", "Ngong Road"],
    Lavington: ["James Gichuru Road", "Gitanga Road"],
  },
  Meru: {
    "Meru Town": ["Meru Central", "Makutano", "Gakoromone"],
    Nkubu: ["Nkubu Town", "Kianjai"],
    Maua: ["Maua Town", "Kangeta"],
    Chuka: ["Chuka Town", "Mariani"],
  },
  Mombasa: {
    "Mombasa Island": ["Moi Avenue", "Digo Road", "Nkrumah Road"],
    Nyali: ["Nyali Road", "Links Road"],
    Likoni: ["Likoni Ferry", "Mtongwe"],
    Bamburi: ["Bamburi Beach Road"],
  },
  Kisumu: {
    "Kisumu CBD": ["Oginga Odinga Street", "Jomo Kenyatta Highway"],
    Milimani: ["Milimani Estate", "Tom Mboya Estate"],
    Mamboleo: ["Mamboleo Junction"],
  },
  Nakuru: {
    "Nakuru Town": ["Kenyatta Avenue", "Moi Road", "Gusii Road"],
    Milimani: ["Milimani Estate"],
    "Section 58": ["Section 58 Estate"],
  },
  Eldoret: {
    "Eldoret CBD": ["Uganda Road", "Oloo Street", "Kenyatta Street"],
    Langas: ["Langas Estate"],
    Huruma: ["Huruma Estate"],
  },
  Nyeri: {
    "Nyeri Town": ["Kimathi Street", "Gakere Road"],
    Karatina: ["Karatina Town"],
  },
  Machakos: {
    "Machakos Town": ["Machakos CBD", "Mwatu Wa Ngoma Road"],
    "Athi River": ["Athi River Town", "EPZ"],
  },
  Kiambu: {
    Thika: ["Thika Town", "Makongeni"],
    Ruiru: ["Ruiru Town", "Kimbo"],
    Kikuyu: ["Kikuyu Town"],
    Juja: ["Juja Town", "JKUAT Area"],
  },
  Kajiado: {
    Kitengela: ["Kitengela Town", "Acacia"],
    "Ongata Rongai": ["Rongai Town", "Rimpa"],
    Ngong: ["Ngong Town", "Matasia"],
  },
};

// ══════════════════════════════════════════════════════════════════
// SHIPPING FEES BY COUNTY
// ══════════════════════════════════════════════════════════════════
const SHIPPING_FEES = {
  Nairobi: 200,    // KSH 200 for Nairobi
  Kiambu: 200,     // Near Nairobi
  Kajiado: 200,    // Near Nairobi (Kitengela, Rongai, Ngong)
  // All other counties get FREE shipping (promotional/testing)
};

const DEFAULT_SHIPPING = 0; // FREE for unlisted counties

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════
const state = {
  currentUser: null,
  authToken: null,
  cart: null,
  addresses: [],
  selectedAddressId: null,
  subtotal: 0,
  isPlacingOrder: false,
  paintingMap: new Map(),
  shippingFee: 0,
};

const els = {};

// ══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  cacheEls();
  initLocationSelectors();
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
  els.shippingBadge = document.getElementById("shipping-badge");
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

/* ========== Location selectors ========== */
function initLocationSelectors() {
  const countySelect = document.getElementById("county-select");
  const townSelect = document.getElementById("town-select");
  const streetSelect = document.getElementById("street-select");

  if (!countySelect || !townSelect || !streetSelect) return;

  els.countySelect = countySelect;
  els.townSelect = townSelect;
  els.streetSelect = streetSelect;

  // Clear and populate counties
  countySelect.innerHTML = '<option value="">Select county</option>';
  
  // Sort counties alphabetically
  const sortedCounties = Object.keys(LOCATION_DATA).sort();
  
  sortedCounties.forEach((county) => {
    const opt = document.createElement("option");
    opt.value = county;
    
    // Show shipping fee in dropdown
    const fee = SHIPPING_FEES[county] ?? DEFAULT_SHIPPING;
    const feeText = fee > 0 ? ` (KSH ${fee} shipping)` : ' (FREE shipping 🎉)';
    opt.textContent = county + feeText;
    
    countySelect.appendChild(opt);
  });

  countySelect.addEventListener("change", () => {
    const county = countySelect.value;
    populateTowns(county);
    
    // Update shipping preview when county changes (for new address form)
    const fee = SHIPPING_FEES[county] ?? DEFAULT_SHIPPING;
    state.shippingFee = fee;
    updateTotalsUI();
    updateShippingBadge();
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
      if (els.placeOrderBtn) els.placeOrderBtn.disabled = true;
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

    // Updated delivery note
    if (els.deliveryNote) {
      els.deliveryNote.innerHTML = `
        <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p class="font-medium mb-2 flex items-center gap-2">
            <span>🚚</span> Shipping Rates:
          </p>
          <ul class="space-y-1 text-xs">
            <li class="flex justify-between">
              <span>Nairobi, Kiambu, Kajiado:</span>
              <span class="font-semibold text-amber-600">KSH 200</span>
            </li>
            <li class="flex justify-between">
              <span>Other counties (Meru, Mombasa, Kisumu, etc.):</span>
              <span class="font-semibold text-green-600">FREE ✨</span>
            </li>
          </ul>
        </div>
      `;
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
async function loadCartWithPaintings() {
  const paintings = await getAllPaintings();
  const paintingList = Array.isArray(paintings) ? paintings : [];
  state.paintingMap = new Map(paintingList.map((p) => [p.id, p]));

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
    const labelText = `${addr.county || ""}, ${addr.town || ""}, ${addr.street || ""}`;
    
    // Show shipping fee for this address
    const fee = computeShippingForAddress(addr);
    const feeText = fee > 0 ? `KSH ${fee}` : 'FREE';
    const feeClass = fee > 0 ? 'text-amber-600' : 'text-green-600';

    const wrapper = document.createElement("label");
    wrapper.className =
      "flex items-start gap-2 text-sm border rounded-lg px-3 py-3 cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "address";
    radio.value = id;
    radio.className = "mt-1 text-amber-600 focus:ring-amber-500";

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

    const contentDiv = document.createElement("div");
    contentDiv.className = "flex-1";
    contentDiv.innerHTML = `
      <span class="block">${labelText}</span>
      <span class="text-xs ${feeClass} font-medium">Shipping: ${feeText}</span>
    `;

    wrapper.appendChild(radio);
    wrapper.appendChild(contentDiv);
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

/**
 * Calculate shipping fee based on county
 * - Nairobi, Kiambu, Kajiado: KSH 200
 * - All other counties: FREE
 */
function computeShippingForAddress(addr) {
  if (!addr || !addr.county) return 0;
  
  const county = String(addr.county).trim();
  
  // Check if county has a specific fee
  if (SHIPPING_FEES.hasOwnProperty(county)) {
    return SHIPPING_FEES[county];
  }
  
  // Default: FREE shipping
  return DEFAULT_SHIPPING;
}

function recalcShippingFromAddress() {
  const addr = getSelectedAddress();
  
  if (addr) {
    state.shippingFee = computeShippingForAddress(addr);
  } else {
    // Check new address form
    const countySelect = els.countySelect;
    if (countySelect && countySelect.value) {
      state.shippingFee = SHIPPING_FEES[countySelect.value] ?? DEFAULT_SHIPPING;
    } else {
      state.shippingFee = 0;
    }
  }
  
  updateTotalsUI();
  updateShippingBadge();
}

function updateShippingBadge() {
  const badge = els.shippingBadge || document.getElementById("shipping-badge");
  if (!badge) return;
  
  if (state.shippingFee === 0) {
    badge.innerHTML = `
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        ✨ FREE Shipping
      </span>
    `;
  } else {
    badge.innerHTML = `
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        🚚 KSH ${state.shippingFee} Shipping
      </span>
    `;
  }
}

function updateTotalsUI() {
  const shipping = Number(state.shippingFee) || 0;

  if (els.shippingFee) {
    els.shippingFee.textContent = shipping === 0 ? "FREE" : `Ksh ${shipping.toLocaleString()}`;
    els.shippingFee.className = shipping === 0 ? "text-green-600 font-semibold" : "text-gray-800";
  }
  if (els.shippingFeeSummary) {
    els.shippingFeeSummary.textContent = shipping === 0 ? "FREE" : `Ksh ${shipping.toLocaleString()}`;
    els.shippingFeeSummary.className = shipping === 0 ? "text-green-600 font-semibold" : "text-gray-800";
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
    showMessage("Address saved successfully!", false);
    setTimeout(() => showMessage("", false, true), 2000);
  } catch (err) {
    console.error("Address create error:", err);
    showMessage(
      (err.data && (err.data.message || err.data.error)) ||
        "Failed to save address.",
      true
    );
  }
}

/* ========== M-Pesa modal ========== */
function openMpesaModal() {
  if (!els.mpesaModal) return;
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

/* ========== Place order ========== */
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
    openMpesaModal();
  } else {
    submitOrderFlow({ paymentMethod: "cod", phone: null });
  }
}

function handleMpesaProceed() {
  if (!els.mpesaModalPhone) {
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
  }

  closeMpesaModal();
  submitOrderFlow({ paymentMethod: "mpesa", phone });
}

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
    const itemsPayload = items.map((item) => ({
      painting_id: item.painting_id || item.id,
      quantity: item.quantity || 1,
    }));

    const orderStatus = paymentMethod === "mpesa" ? "awaiting_payment" : "pending";

    const orderBody = {
      buyer_id: state.currentUser.id,
      items: itemsPayload,
      delivery_cost: state.shippingFee,
      status: orderStatus,
    };

    const order = await createOrder(orderBody, state.authToken);

    // Create delivery
    try {
      const initialDeliveryStatus = paymentMethod === "mpesa" ? "awaiting_payment" : "pending";
      await createDelivery(
        {
          order_id: order.id,
          address_id: state.selectedAddressId,
          status: initialDeliveryStatus,
        },
        state.authToken
      );
    } catch (err) {
      console.error("Delivery create error:", err);
    }

    // M-Pesa payment
    if (paymentMethod === "mpesa") {
      const paymentResp = await initiateMpesaPayment(
        { order_id: order.id, phone },
        state.authToken
      );

      showMessage(
        paymentResp.message ||
          "M-Pesa STK push initiated. Check your phone to complete payment.",
        false
      );
      window.location.href = `./order-details.html?order_id=${order.id}`;
    } else {
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