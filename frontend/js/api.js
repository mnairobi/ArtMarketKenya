

// js/api.js

// ──────────────────────────────────────────────
// ENVIRONMENT DETECTION
// ──────────────────────────────────────────────
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';

export const API_BASE_URL = isProduction 
    ? 'https://artmarketkenya.onrender.com'  // Production backend
    : 'http://localhost:5000';                // Local development

// Log current environment (helpful for debugging)
console.log('🌐 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('🔗 API Base URL:', API_BASE_URL);

// ──────────────────────────────────────────────
// CORE REQUEST HELPER
// Handles both JSON objects and FormData bodies
// ──────────────────────────────────────────────
async function apiRequest(url, options = {}) {
  const token = options.token || localStorage.getItem("auth_token");
  const body = options.body;

  // If body is FormData, do NOT set Content-Type (browser sets boundary)
  // If body is plain object, JSON.stringify it
  const isFormData = body instanceof FormData;

  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...options.headers,
  };

  const fetchOptions = {
    method: options.method || "GET",
    headers,
  };

  if (body) {
    fetchOptions.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${url}`, fetchOptions);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || data.error || "Request failed");
    error.data = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

// ──────────────────────────────────────────────
// AUTH — each role hits its own endpoint
// ──────────────────────────────────────────────
export function loginBuyer({ email, password }) {
  return apiRequest("/auth/login/buyer", {
    method: "POST",
    body: { email, password },
  });
}

export function loginArtist({ email, password }) {
  return apiRequest("/auth/login/artist", {
    method: "POST",
    body: { email, password },
  });
}

export function loginAdmin({ email, password }) {
  return apiRequest("/auth/login/admin", {
    method: "POST",
    body: { email, password },
  });
}

export function registerUser({ username, email, password, role }) {
  return apiRequest("/users/register", {
    method: "POST",
    body: { username, email, password, role },
  });
}

// ──────────────────────────────────────────────
// PAINTINGS
// ──────────────────────────────────────────────
export function getAllPaintings() {
  return apiRequest("/paintings/all");
}

export function getPainting(paintingId) {
  return apiRequest(`/paintings/${paintingId}`);
}

export function createPainting(formData) {
  return apiRequest("/paintings", {
    method: "POST",
    body: formData,
  });
}

export function updatePainting(paintingId, formData) {
  return apiRequest(`/paintings/${paintingId}`, {
    method: "PUT",
    body: formData,
  });
}

export function deletePainting(paintingId) {
  return apiRequest(`/paintings/${paintingId}`, {
    method: "DELETE",
  });
}

// ──────────────────────────────────────────────
// CATEGORIES
// ──────────────────────────────────────────────
export function getAllCategories() {
  return apiRequest("/categories");
}

export function getCategory(categoryId) {
  return apiRequest(`/categories/${categoryId}`);
}

export function createCategory(data, token) {
  return apiRequest("/categories", {
    method: "POST",
    token,
    body: data,
  });
}

export function updateCategory(categoryId, data, token) {
  return apiRequest(`/categories/${categoryId}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export function deleteCategory(categoryId, token) {
  return apiRequest(`/categories/${categoryId}`, {
    method: "DELETE",
    token,
  });
}

// ──────────────────────────────────────────────
// ARTIST PROFILES
// ──────────────────────────────────────────────
export function getArtists() {
  return apiRequest("/artists");
}

export function getArtist(artistId) {
  return apiRequest(`/artists/${artistId}`);
}

export function createArtistProfile(formData) {
  return apiRequest("/artists", {
    method: "POST",
    body: formData,
  });
}

export function updateArtistProfile(artistId, formData) {
  return apiRequest(`/artists/${artistId}`, {
    method: "PUT",
    body: formData,
  });
}

export function deleteArtistProfile(artistId, userId) {
  return apiRequest(`/artists/${artistId}`, {
    method: "DELETE",
    body: { user_id: userId },
  });
}

// ──────────────────────────────────────────────
// CART
// ──────────────────────────────────────────────
export function getCart(userId, token) {
  return apiRequest(`/carts/${userId}`, { token });
}

export function addCartItem(userId, paintingId, quantity = 1, token) {
  return apiRequest(`/carts/${userId}`, {
    method: "POST",
    token,
    body: { painting_id: paintingId, quantity },
  });
}

export function updateCartItem(itemId, quantity, token) {
  return apiRequest(`/cart-items/${itemId}`, {
    method: "PUT",
    token,
    body: { quantity },
  });
}

export function removeCartItem(itemId, token) {
  return apiRequest(`/cart-items/${itemId}`, {
    method: "DELETE",
    token,
  });
}

export function clearCart(userId, token) {
  return apiRequest(`/carts/${userId}/clear`, {
    method: "POST",
    token,
  });
}

// ──────────────────────────────────────────────
// WISHLIST
// ──────────────────────────────────────────────
export function getWishlist(userId, token) {
  return apiRequest(`/wishlists/${userId}`, { token });
}

export function addWishlistItem(userId, paintingId, token) {
  return apiRequest(`/wishlists/${userId}`, {
    method: "POST",
    token,
    body: { painting_id: paintingId },
  });
}

export function removeWishlistItem(userId, paintingId, token) {
  return apiRequest(`/wishlists/${userId}`, {
    method: "DELETE",
    token,
    body: { painting_id: paintingId },
  });
}

export function clearWishlist(userId, token) {
  return apiRequest(`/wishlists/${userId}/clear`, {
    method: "POST",
    token,
  });
}

// ──────────────────────────────────────────────
// ADDRESSES
// ──────────────────────────────────────────────
export function getUserAddresses(userId, token) {
  return apiRequest(`/addresses/user/${userId}`, { token });
}

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

// ──────────────────────────────────────────────
// PAYMENTS (M-Pesa)
// ──────────────────────────────────────────────
export function initiateMpesaPayment({ order_id, phone }, token) {
  return apiRequest("/payments", {
    method: "POST",
    token,
    body: { order_id, phone },
  });
}

// ──────────────────────────────────────────────
// ORDERS
// ──────────────────────────────────────────────
export function createOrder(data, token) {
  return apiRequest("/orders", {
    method: "POST",
    token,
    body: data,
  });
}

export function getOrder(orderId, token) {
  return apiRequest(`/orders/${orderId}`, { token });
}

export function getUserOrders(userId, token) {
  return apiRequest(`/orders/user/${userId}`, { token });
}

// ──────────────────────────────────────────────
// ORDER DETAILS
// ──────────────────────────────────────────────
export function getOrderDetails(orderId, token) {
  return apiRequest(`/orders/${orderId}/details`, { token });
}

// ──────────────────────────────────────────────
// REVIEWS
// ──────────────────────────────────────────────

/**
 * Get reviews for a specific painting
 * GET /reviews?painting_id=X
 */
export function getPaintingReviews(paintingId) {
  return apiRequest(`/reviews?painting_id=${paintingId}`);
}

/**
 * Get reviews by a specific user
 * GET /reviews?user_id=X
 */
export function getUserReviews(userId, token) {
  return apiRequest(`/reviews?user_id=${userId}`, { token });
}

/**
 * Create a new review (buyers only)
 * POST /reviews
 */
export function createReview(reviewData, token) {
  return apiRequest("/reviews", {
    method: "POST",
    token,
    body: reviewData,
  });
}

/**
 * Update an existing review
 * PUT /reviews/:review_id
 */
export function updateReview(reviewId, data, token) {
  return apiRequest(`/reviews/${reviewId}`, {
    method: "PUT",
    token,
    body: data,
  });
}

/**
 * Delete a review
 * DELETE /reviews/:review_id
 */
export function deleteReview(reviewId, token) {
  return apiRequest(`/reviews/${reviewId}`, {
    method: "DELETE",
    token,
  });
}

/**
 * Calculate average rating for a painting
 */
export function calculateAverageRating(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
  return (sum / reviews.length).toFixed(1);
}

// ──────────────────────────────────────────────
// UPLOAD (image)
// ──────────────────────────────────────────────
export function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest("/upload", {
    method: "POST",
    body: formData,
  });
}

// ──────────────────────────────────────────────
// ARTIST PAYOUTS
// ──────────────────────────────────────────────
// export function getArtistPayouts(artistId, token) {
//   return apiRequest(`/artists/${artistId}/payouts`, { token });
// }

// export function createArtistPayout(payoutData, token) {
//   return apiRequest("/artist-payouts", {
//     method: "POST",
//     token,
//     body: payoutData,
//   });
// }

// ──────────────────────────────────────────────
// CERTIFICATES (Hakika ya Kienyeji)
// ──────────────────────────────────────────────
export function verifyPaintingCertificate(paintingId) {
  return apiRequest(`/certificates/verify/${paintingId}`);
}

export function issuePaintingCertificate({ painting_id, force = false }, token = null) {
  return apiRequest("/certificates/issue", {
    method: "POST",
    token,
    body: { painting_id, force },
  });
}

/* ========= PASSWORD RESET ========= */

export function forgotPassword(email) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function validateResetToken(token) {
  return apiRequest(`/auth/validate-reset-token?token=${token}`);
}

export function resetPassword(token, new_password) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: { token, new_password },
  });
}

// js/api.js

// ... [ALL YOUR EXISTING CODE REMAINS UNCHANGED] ...

// ──────────────────────────────────────────────
// ARTIST PAYOUTS (ENHANCED)
// ──────────────────────────────────────────────
export function getArtistPayouts(artistId, token) {
  return apiRequest(`/artists/${artistId}/payouts`, { token });
}

export function createArtistPayout(payoutData, token) {
  return apiRequest("/artist-payouts", {
    method: "POST",
    token,
    body: payoutData,
  });
}

// New payout endpoints
export function getArtistBalance(artistId, token) {
  return apiRequest(`/artists/${artistId}/balance`, { token });
}

export function processPayout(payoutId, token) {
  return apiRequest(`/payouts/${payoutId}/process`, {
    method: "POST",
    token,
  });
}

export function processBulkPayouts(token) {
  return apiRequest("/payouts/process-bulk", {
    method: "POST",
    token,
  });
}

export function getPlatformEarnings(token) {
  return apiRequest("/platform/earnings", { token });
}

export function getAllPayouts(token) {
  return apiRequest("/artist-payouts", { token });
}

export function getPayoutById(payoutId, token) {
  return apiRequest(`/artist-payouts/${payoutId}`, { token });
}

export function updatePayoutStatus(payoutId, status, token) {
  return apiRequest(`/artist-payouts/${payoutId}`, {
    method: "PUT",
    token,
    body: { status },
  });
}

// ──────────────────────────────────────────────
// ADMIN SPECIFIC ENDPOINTS
// ──────────────────────────────────────────────
export function getAllOrders(token) {
  return apiRequest("/orders", { token });
}

export function getAllUsers(token) {
  return apiRequest("/users", { token });
}

export function updateUser(userId, data, token) {
  return apiRequest(`/users/${userId}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export function suspendUser(userId, token) {
  return apiRequest(`/users/${userId}/suspend`, {
    method: "POST",
    token,
  });
}

export function activateUser(userId, token) {
  return apiRequest(`/users/${userId}/activate`, {
    method: "POST",
    token,
  });
}

export function deleteUser(userId, token) {
  return apiRequest(`/users/${userId}`, {
    method: "DELETE",
    token,
  });
}

export function createAdminUser(userData, token) {
  return apiRequest("/users/create-admin", {
    method: "POST",
    token,
    body: userData,
  });
}

export function promoteToAdmin(userId, token) {
  return apiRequest(`/users/${userId}/promote-admin`, {
    method: "POST",
    token,
  });
}

export function getAllPayments(token) {
  return apiRequest("/payments", { token });
}

// ===== DELIVERIES =====

/**
 * Create a new delivery record
 * POST /deliveries
 */
export function createDelivery(data, token) {
  return apiRequest("/deliveries", {
    method: "POST",
    token,
    body: data,
  });
}

/**
 * Get delivery by ID
 * GET /deliveries/:delivery_id
 */
export function getDelivery(deliveryId, token) {
  return apiRequest(`/deliveries/${deliveryId}`, { token });
}

/**
 * Update delivery status and details
 * PUT /deliveries/:delivery_id
 */
export function updateDelivery(deliveryId, data, token) {
  return apiRequest(`/deliveries/${deliveryId}`, {
    method: "PUT",
    token,
    body: data,
  });
}

/**
 * Delete delivery record
 * DELETE /deliveries/:delivery_id
 */
export function deleteDelivery(deliveryId, token) {
  return apiRequest(`/deliveries/${deliveryId}`, {
    method: "DELETE",
    token,
  });
}

/**
 * Ship order with tracking info
 * POST /deliveries/:delivery_id/ship
 */
export function shipDelivery(deliveryId, data, token) {
  return apiRequest(`/deliveries/${deliveryId}/ship`, {
    method: "POST",
    token,
    body: data,
  });
}

/**
 * Get all deliveries (admin)
 * GET /deliveries/all
 */
export function getAllDeliveries(token, statusFilter = null) {
  const url = statusFilter && statusFilter !== "all" 
    ? `/deliveries/all?status=${statusFilter}` 
    : "/deliveries/all";
  return apiRequest(url, { token });
}

/**
 * Mark delivery as delivered
 */
export function markAsDelivered(deliveryId, notes = "", token) {
  return apiRequest(`/deliveries/${deliveryId}`, {
    method: "PUT",
    token,
    body: { status: "delivered", notes },
  });
}

/**
 * Mark delivery as processing
 */
export function markAsProcessing(deliveryId, notes = "", token) {
  return apiRequest(`/deliveries/${deliveryId}`, {
    method: "PUT",
    token,
    body: { status: "processing", notes },
  });
}

/**
 * Cancel delivery
 */
export function cancelDelivery(deliveryId, reason = "", token) {
  return apiRequest(`/deliveries/${deliveryId}`, {
    method: "PUT",
    token,
    body: { status: "cancelled", notes: reason },
  });
}

/**
 * Update tracking information
 */
export function updateTrackingInfo(deliveryId, trackingNumber, carrier, estimatedDelivery = null, token) {
  const data = {
    tracking_number: trackingNumber,
    carrier: carrier,
  };
  if (estimatedDelivery) {
    data.estimated_delivery = estimatedDelivery;
  }
  return apiRequest(`/deliveries/${deliveryId}`, {
    method: "PUT",
    token,
    body: data,
  });
}
//paystack

// Initiate Paystack payment
export function initiatePaystackPayment(paymentData, token) {
  return apiRequest("/payments", {
    method: "POST",
    token,
    body: {
      ...paymentData,
      payment_method: "paystack",
    },
  });
}

// Verify Paystack payment
export function verifyPaystackPayment(reference, token) {
  return apiRequest(`/payments/paystack/verify/${reference}`, { token });
}

// Get payment methods
export function getPaymentMethods() {
  return apiRequest("/payment-methods");
}