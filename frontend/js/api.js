// js/api.js

// Adjust if backend uses another host/port
export const API_BASE_URL = "http://127.0.0.1:5000";

/**
 * Generic API request helper.
 * - Prefixes with API_BASE_URL
 * - Sends/reads JSON
 * - Throws on non-2xx with error.data
 */
export async function apiRequest(path, options = {}) {
  const url = API_BASE_URL + path;
  const {
    method = "GET",
    body = null,
    token = null,
    headers = {},
  } = options;

  const finalHeaders = { ...headers };

  if (body && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
    credentials: "include", // OK with your CORS config
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const err = new Error(
      (data && (data.message || data.error)) || "Request failed"
    );
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/* ========= AUTH ========= */

export function registerUser({ username, email, password, role = "buyer" }) {
  return apiRequest("/users/register", {
    method: "POST",
    body: { username, email, password, role },
  });
}

export function loginUser({ email, password }) {
  return apiRequest("/users/login", {
    method: "POST",
    body: { email, password },
  });
}

/* ========= DOMAIN: PAINTINGS & CATEGORIES ========= */

export function getAllPaintings() {
  // Matches: api.add_resource(PaintingListResource, '/paintings/all')
  return apiRequest("/paintings/all");
}

export function getAllCategories() {
  // Matches: api.add_resource(CategoryListResource, '/categories')
  return apiRequest("/categories");
}

/* ========= ARTIST PROFILES ========= */

export function getArtists() {
  // /artists -> { artists: [...] }
  return apiRequest("/artists");
}

export function createArtistProfile(formData) {
  // formData must include: user_id, bio, [social_links], [profile_picture]
  return apiRequest("/artists", {
    method: "POST",
    body: formData, // FormData
  });
}

export function updateArtistProfile(artistId, formData) {
  // formData must include: user_id, and any fields to update
  return apiRequest(`/artists/${artistId}`, {
    method: "PUT",
    body: formData,
  });
}

/* ========= ARTIST PAINTING CREATION ========= */

export function createPainting(formData) {
  // /paintings POST with multipart/form-data
  // required: artist_id, title, price, image (file) or image_url
  return apiRequest("/paintings", {
    method: "POST",
    body: formData,
  });
}

// Update an existing painting
export function updatePainting(paintingId, formData) {
  return apiRequest(`/paintings/${paintingId}`, {
    method: "PUT",
    body: formData, // FormData, may or may not contain image
  });
}

// Delete a painting
export function deletePainting(paintingId) {
  return apiRequest(`/paintings/${paintingId}`, {
    method: "DELETE",
  });
}

/* ========= CART ========= */

/**
 * Get cart for a user.
 * GET /carts/<user_id>
 */
export function getCart(userId, token) {
  return apiRequest(`/carts/${userId}`, {
    token,
  });
}

/**
 * Add item to cart (or increase quantity).
 * POST /carts/<user_id>  { painting_id, quantity }
 */
export function addCartItem(userId, paintingId, quantity = 1, token) {
  return apiRequest(`/carts/${userId}`, {
    method: "POST",
    token,
    body: { painting_id: paintingId, quantity },
  });
}

/**
 * Update a specific cart item’s quantity.
 * PUT /cart-items/<item_id>  { quantity }
 */
export function updateCartItem(itemId, quantity, token) {
  return apiRequest(`/cart-items/${itemId}`, {
    method: "PUT",
    token,
    body: { quantity },
  });
}

/**
 * Remove a specific cart item.
 * DELETE /cart-items/<item_id>
 */
export function removeCartItem(itemId, token) {
  return apiRequest(`/cart-items/${itemId}`, {
    method: "DELETE",
    token,
  });
}

/**
 * Clear the whole cart.
 * POST /carts/<user_id>/clear
 */
export function clearCart(userId, token) {
  return apiRequest(`/carts/${userId}/clear`, {
    method: "POST",
    token,
  });
}

/* ========= WISHLIST ========= */

/**
 * Get wishlist for a user.
 * GET /wishlists/<user_id>
 */
export function getWishlist(userId, token) {
  return apiRequest(`/wishlists/${userId}`, {
    token,
  });
}

/**
 * Add painting to wishlist.
 * POST /wishlists/<user_id>  { painting_id }
 */
export function addWishlistItem(userId, paintingId, token) {
  return apiRequest(`/wishlists/${userId}`, {
    method: "POST",
    token,
    body: { painting_id: paintingId },
  });
}

/**
 * Remove painting from wishlist.
 * DELETE /wishlists/<user_id>  { painting_id }
 */
export function removeWishlistItem(userId, paintingId, token) {
  return apiRequest(`/wishlists/${userId}`, {
    method: "DELETE",
    token,
    body: { painting_id },
  });
}

/**
 * Clear wishlist.
 * POST /wishlists/<user_id>/clear
 */
export function clearWishlist(userId, token) {
  return apiRequest(`/wishlists/${userId}/clear`, {
    method: "POST",
    token,
  });
}

/* ========= ADDRESSES ========= */

/**
 * Get all addresses for a user
 * GET /addresses/user/<user_id>
 */
export function getUserAddresses(userId, token) {
  return apiRequest(`/addresses/user/${userId}`, {
    token,
  });
}

/**
 * Create a new address for a user
 * POST /addresses/user/<user_id>
 * Body: { county, town, street }
 */
export function createAddress(data, token) {
  const { user_id, county, town, street } = data;

  if (!user_id) {
    throw new Error("createAddress: user_id is required");
  }

  return apiRequest(`/addresses/user/${user_id}`, {
    method: "POST",
    token,
    body: { county, town, street },
  });
}

/* ========= DELIVERY / SHIPPING ========= */

/**
 * Create delivery & calculate shipping fee
 * POST /deliveries
 *
 * Typical body:
 * {
 *   order_id,
 *   address_id
 * }
 */
export function createDelivery(data, token) {
  return apiRequest("/deliveries", {
    method: "POST",
    token,
    body: data,
  });
}


/* ========= PAYMENTS ========= */

/**
 * Initiate M‑Pesa STK push for an order.
 * POST /payments
 * Body: { order_id, phone }
 */
export function initiateMpesaPayment({ order_id, phone }, token) {
  return apiRequest("/payments", {
    method: "POST",
    token,
    body: { order_id, phone },
  });
}

/* ========= ORDERS ========= */

/**
 * Create order.
 * POST /orders
 *
 * Backend uses current_user from the session (Flask-Login),
 * so you do NOT send user_id in the body.
 *
 * Expected body (matches OrderListResource.post):
 * {
 *   paintings_subtotal,
 *   paintings,       // array like [{ painting_id, quantity }, ...]
 *   delivery_cost,
 *   status           // e.g. "pending" | "awaiting_payment"
 * }
 */
export function createOrder(data, token) {
  return apiRequest("/orders", {
    method: "POST",
    token,
    body: data,
  });
}

/**
 * Get a single order
 * GET /orders/<order_id>
 */
export function getOrder(orderId, token) {
  return apiRequest(`/orders/${orderId}`, {
    token,
  });
}
/**
 * Get all orders for a user
 * GET /orders/user/<user_id>
 */
export function getUserOrders(userId, token) {
  return apiRequest(`/orders/user/${userId}`, {
    token,
  });
}
/* ========= ORDER DETAILS ========= */

/**
 * Get line items (order details) for an order
 * GET /orders/<order_id>/details
 */
export function getOrderDetails(orderId, token) {
  return apiRequest(`/orders/${orderId}/details`, {
    token,
  });
}
/* ========= CERTIFICATES (Hakika ya Kienyeji) ========= */

// Verify certificate for a painting
// GET /certificates/verify/<painting_id>
export function verifyPaintingCertificate(paintingId) {
  return apiRequest(`/certificates/verify/${paintingId}`);
}

// (Optional) Issue / re-issue certificate
// POST /certificates/issue  { painting_id, force }
export function issuePaintingCertificate({ painting_id, force = false }, token = null) {
  return apiRequest("/certificates/issue", {
    method: "POST",
    token,
    body: { painting_id, force },
  });
}

