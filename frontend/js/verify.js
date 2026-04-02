// js/verify.js
import { API_BASE_URL, verifyPaintingCertificate } from "./api.js";

// ============================================
// STATE
// ============================================
const state = {
  paintingId: null,
  certificateData: null,
  paintingData: null,
  isLoading: true,
};

// ============================================
// ELEMENTS CACHE
// ============================================
const els = {};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🎨 SANAA - Hakika ya Kienyeji Certificate Verification");
  cacheElements();
  initEventListeners();
  initVerification();
});

// ============================================
// CACHE DOM ELEMENTS
// ============================================
function cacheElements() {
  // Status
  els.verifyStatus = document.getElementById("verify-status");

  // Artwork details
  els.artTitle = document.getElementById("art-title");
  els.artArtist = document.getElementById("art-artist");
  els.artImage = document.getElementById("art-image");
  els.imageLoading = document.getElementById("image-loading");
  els.artDescription = document.getElementById("art-description");
  els.artDescriptionWrap = document.getElementById("art-description-wrap");
  els.artMaterials = document.getElementById("art-materials");
  els.artLocation = document.getElementById("art-location");
  els.artDate = document.getElementById("art-date");
  els.artPrice = document.getElementById("art-price");

  // Technical details
  els.artCid = document.getElementById("art-cid");
  els.ipfsLink = document.getElementById("ipfs-link");
  els.hashStored = document.getElementById("hash-stored");
  els.hashComputed = document.getElementById("hash-computed");
  els.hashMatchStatus = document.getElementById("hash-match-status");
  els.rawJson = document.getElementById("raw-json");

  // Toggle
  els.toggleTechBtn = document.getElementById("toggle-tech-btn");
  els.toggleIcon = document.getElementById("toggle-icon");
  els.techDetails = document.getElementById("tech-details");

  // QR Code
  els.qrImg = document.getElementById("qr-img");
  els.qrDownload = document.getElementById("qr-download");

  // Buttons
  els.copyCidBtn = document.getElementById("copy-cid-btn");
  els.copyJsonBtn = document.getElementById("copy-json-btn");
  els.copyLinkBtn = document.getElementById("copy-link-btn");
  els.shareWhatsappBtn = document.getElementById("share-whatsapp-btn");
  els.shareTwitterBtn = document.getElementById("share-twitter-btn");
  els.buyArtworkBtn = document.getElementById("buy-artwork-btn");

  // Toast container
  els.toastContainer = document.getElementById("toast-container");
}

// ============================================
// EVENT LISTENERS
// ============================================
function initEventListeners() {
  // Toggle technical details
  if (els.toggleTechBtn) {
    els.toggleTechBtn.addEventListener("click", toggleTechnicalDetails);
  }

  // Copy CID button
  if (els.copyCidBtn) {
    els.copyCidBtn.addEventListener("click", () => {
      const cid = els.artCid?.textContent;
      if (cid && cid !== "-" && cid !== "Loading...") {
        copyToClipboard(cid, "Certificate ID copied!");
      } else {
        showToast("No certificate ID available", "error");
      }
    });
  }

  // Copy JSON button
  if (els.copyJsonBtn) {
    els.copyJsonBtn.addEventListener("click", () => {
      const json = els.rawJson?.textContent;
      if (json && json !== "{}") {
        copyToClipboard(json, "Certificate data copied!");
      } else {
        showToast("No certificate data available", "error");
      }
    });
  }

  // Copy link button
  if (els.copyLinkBtn) {
    els.copyLinkBtn.addEventListener("click", () => {
      copyToClipboard(window.location.href, "Verification link copied!");
    });
  }

  // Share on WhatsApp
  if (els.shareWhatsappBtn) {
    els.shareWhatsappBtn.addEventListener("click", shareOnWhatsApp);
  }

  // Share on Twitter
  if (els.shareTwitterBtn) {
    els.shareTwitterBtn.addEventListener("click", shareOnTwitter);
  }

  // Image load/error handlers
  if (els.artImage) {
    els.artImage.addEventListener("load", () => {
      hideImageLoading();
      els.artImage.classList.remove("opacity-0");
      els.artImage.classList.add("opacity-100");
    });

    els.artImage.addEventListener("error", () => {
      handleImageError();
    });
  }
}

// ============================================
// MAIN VERIFICATION FLOW
// ============================================
async function initVerification() {
  // Get painting ID from URL
  const params = new URLSearchParams(window.location.search);
  const paintingId = params.get("painting_id");

  if (!paintingId) {
    showErrorStatus("No painting ID provided. Please use a valid verification link or scan a QR code.");
    hideImageLoading();
    setLoadingState(false);
    return;
  }

  state.paintingId = paintingId;

  // Setup QR code immediately
  setupQRCode();

  // Setup buy button
  if (els.buyArtworkBtn) {
    els.buyArtworkBtn.href = `./index.html?highlight=${paintingId}`;
  }

  // Show loading status
  showLoadingStatus();

  try {
    // Fetch certificate data from API
    console.log("🔄 Verifying painting:", paintingId);
    const data = await verifyPaintingCertificate(paintingId);
    console.log("✅ Received data:", data);

    // Store data in state
    state.certificateData = data.certificate || data;
    state.paintingData = data;

    // Render certificate
    renderCertificate(data);

    // Show success status
    showVerificationResult(data);

    console.log("✅ Verification complete!");

  } catch (error) {
    console.error("❌ Verification error:", error);
    hideImageLoading();

    const message = error?.data?.message || error?.message || "Failed to verify certificate";
    showErrorStatus(message);

    // Show error in raw JSON
    if (els.rawJson) {
      els.rawJson.textContent = JSON.stringify({ error: message }, null, 2);
    }
  } finally {
    setLoadingState(false);
  }
}

// ============================================
// RENDER CERTIFICATE
// ============================================
function renderCertificate(data) {
  const cert = data.certificate || data;

  // Artwork Title
  if (els.artTitle) {
    els.artTitle.textContent = data.title || cert.title || "Untitled Artwork";
  }

  // Artist
  if (els.artArtist) {
    const artistName = data.artist || cert.artist_name || cert.artist || "Unknown Artist";
    els.artArtist.textContent = `Artist: ${artistName}`;
  }

  // Image
  if (els.artImage) {
    const imageUrl = cert.image_url || data.image_url;
    if (imageUrl) {
      els.artImage.src = buildImageUrl(imageUrl);
      els.artImage.alt = data.title || cert.title || "Artwork";
    } else {
      handleImageError();
    }
  }

  // Description
  const description = cert.description || data.description;
  if (description && els.artDescription && els.artDescriptionWrap) {
    els.artDescription.textContent = description;
    els.artDescriptionWrap.classList.remove("hidden");
  }

  // Materials
  if (els.artMaterials) {
    els.artMaterials.textContent = data.materials || cert.materials || "Not specified";
  }

  // Location
  if (els.artLocation) {
    els.artLocation.textContent = data.location || cert.location || "Kenya";
  }

  // Date
  if (els.artDate) {
    const dateStr = cert.created_date || cert.timestamp || data.created_at;
    els.artDate.textContent = dateStr ? formatDate(dateStr) : "N/A";
  }

  // Price
  if (els.artPrice) {
    els.artPrice.textContent = formatPrice(cert.price || data.price);
  }

  // Technical Details
  renderTechnicalDetails(data);
}

function renderTechnicalDetails(data) {
  const cert = data.certificate || data;

  // IPFS CID
  if (els.artCid) {
    els.artCid.textContent = data.ipfs_cid || cert.ipfs_cid || "-";
  }

  // IPFS Link
  if (els.ipfsLink) {
    const ipfsUrl = data.ipfs_url || (data.ipfs_cid ? `https://gateway.pinata.cloud/ipfs/${data.ipfs_cid}` : null);
    if (ipfsUrl) {
      els.ipfsLink.href = ipfsUrl;
      els.ipfsLink.textContent = ipfsUrl;
    } else {
      els.ipfsLink.textContent = "Not available";
      els.ipfsLink.removeAttribute("href");
    }
  }

  // Hash values
  const storedHash = data.stored_hash || cert.certificate_hash || "-";
  const computedHash = data.computed_hash || "-";

  if (els.hashStored) {
    els.hashStored.textContent = storedHash;
  }

  if (els.hashComputed) {
    els.hashComputed.textContent = computedHash;
  }

  // Hash match status
  updateHashMatchStatus(storedHash, computedHash, data.valid);

  // Raw JSON
  if (els.rawJson) {
    els.rawJson.textContent = JSON.stringify(cert, null, 2);
  }
}

function updateHashMatchStatus(storedHash, computedHash, isValid) {
  if (!els.hashMatchStatus) return;

  // Determine if hashes match
  const hashesMatch = storedHash && computedHash && storedHash !== "-" && computedHash !== "-" && storedHash === computedHash;
  const isVerified = isValid === true || hashesMatch;

  if (isVerified) {
    els.hashMatchStatus.innerHTML = `
      <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-green-800">Integrity Verified</p>
          <p class="text-sm text-green-700">Hashes match - Certificate has not been tampered with</p>
        </div>
      </div>
    `;
  } else if (storedHash === "-" || computedHash === "-") {
    els.hashMatchStatus.innerHTML = `
      <div class="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
        <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-yellow-800">Hash Data Unavailable</p>
          <p class="text-sm text-yellow-700">Unable to compare hashes - Partial verification only</p>
        </div>
      </div>
    `;
  } else {
    els.hashMatchStatus.innerHTML = `
      <div class="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
        <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-red-800">Hash Mismatch Detected</p>
          <p class="text-sm text-red-700">Warning: Certificate may have been tampered with</p>
        </div>
      </div>
    `;
  }
}

// ============================================
// STATUS MESSAGES
// ============================================
function showLoadingStatus() {
  if (!els.verifyStatus) return;

  els.verifyStatus.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-6 h-6 flex-shrink-0">
        <svg class="animate-spin text-accent" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <div>
        <p class="font-medium text-gallery-700">Verifying certificate on blockchain...</p>
        <p class="text-sm text-gallery-500">Fetching data from IPFS</p>
      </div>
    </div>
  `;

  els.verifyStatus.classList.remove("hidden", "bg-green-50", "bg-red-50", "border-green-200", "border-red-200");
  els.verifyStatus.classList.add("bg-accent/10", "border", "border-accent/20");
}

function showVerificationResult(data) {
  if (!els.verifyStatus) return;

  const isValid = data.valid;
  const hasHash = data.stored_hash && data.computed_hash;
  const hashesMatch = hasHash && data.stored_hash === data.computed_hash;

  let statusHtml, bgClass, borderClass;

  if (isValid === true || hashesMatch) {
    bgClass = "bg-green-50";
    borderClass = "border-green-200";
    statusHtml = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-green-800">✅ Authentic & Verified</p>
          <p class="text-sm text-green-700">This artwork is genuine and its certificate is stored on the IPFS blockchain.</p>
        </div>
      </div>
    `;
  } else if (isValid === false) {
    bgClass = "bg-red-50";
    borderClass = "border-red-200";
    statusHtml = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-red-800">⚠️ Verification Warning</p>
          <p class="text-sm text-red-700">Certificate hash mismatch detected. This artwork may have been tampered with.</p>
        </div>
      </div>
    `;
  } else {
    // Certificate found but no explicit valid flag
    bgClass = "bg-green-50";
    borderClass = "border-green-200";
    statusHtml = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div>
          <p class="font-semibold text-green-800">✅ Certificate Found</p>
          <p class="text-sm text-green-700">This artwork has a valid certificate stored on the IPFS blockchain.</p>
        </div>
      </div>
    `;
  }

  els.verifyStatus.innerHTML = statusHtml;
  els.verifyStatus.classList.remove("hidden", "bg-accent/10", "border-accent/20", "bg-green-50", "bg-red-50", "border-green-200", "border-red-200");
  els.verifyStatus.classList.add(bgClass, "border", borderClass);
}

function showErrorStatus(message) {
  if (!els.verifyStatus) return;

  els.verifyStatus.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div>
        <p class="font-semibold text-red-800">❌ Verification Failed</p>
        <p class="text-sm text-red-700">${escapeHtml(message)}</p>
      </div>
    </div>
  `;

  els.verifyStatus.classList.remove("hidden", "bg-accent/10", "border-accent/20", "bg-green-50", "border-green-200");
  els.verifyStatus.classList.add("bg-red-50", "border", "border-red-200");
}

// ============================================
// QR CODE
// ============================================
function setupQRCode() {
  const verifyUrl = window.location.href;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}&bgcolor=ffffff&color=171717`;

  if (els.qrImg) {
    els.qrImg.src = qrUrl;
    els.qrImg.alt = `QR Code for artwork verification`;
  }

  if (els.qrDownload) {
    els.qrDownload.href = qrUrl;
    els.qrDownload.download = `sanaa-certificate-${state.paintingId || "artwork"}.png`;
  }
}

// ============================================
// TOGGLE TECHNICAL DETAILS
// ============================================
function toggleTechnicalDetails() {
  if (!els.techDetails || !els.toggleTechBtn) return;

  const isHidden = els.techDetails.classList.contains("hidden");

  if (isHidden) {
    // Show details
    els.techDetails.classList.remove("hidden");
    els.techDetails.style.opacity = "0";
    els.techDetails.style.transform = "translateY(-10px)";

    requestAnimationFrame(() => {
      els.techDetails.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      els.techDetails.style.opacity = "1";
      els.techDetails.style.transform = "translateY(0)";
    });

    // Update button text
    els.toggleTechBtn.innerHTML = `
      <svg id="toggle-icon" class="w-4 h-4 transition-transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
      Hide Technical Details
    `;

    // Scroll to technical details
    setTimeout(() => {
      els.techDetails.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

  } else {
    // Hide details
    els.techDetails.style.opacity = "0";
    els.techDetails.style.transform = "translateY(-10px)";

    setTimeout(() => {
      els.techDetails.classList.add("hidden");
    }, 300);

    // Update button text
    els.toggleTechBtn.innerHTML = `
      <svg id="toggle-icon" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
      Show Technical Details
    `;
  }
}

// ============================================
// SHARING FUNCTIONS
// ============================================
function shareOnWhatsApp() {
  const title = els.artTitle?.textContent || "Artwork";
  const artist = els.artArtist?.textContent?.replace("Artist: ", "") || "Unknown Artist";
  const verifyUrl = window.location.href;

  const message = `🎨 Check out this verified artwork!

*${title}*
By: ${artist}

✅ Blockchain-certified authentic with Hakika ya Kienyeji

Verify here: ${verifyUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}

function shareOnTwitter() {
  const title = els.artTitle?.textContent || "Artwork";
  const verifyUrl = window.location.href;

  const tweet = `🎨 Check out this blockchain-verified artwork: "${title}"

✅ Authenticated with Hakika ya Kienyeji certificate!

Verify here: ${verifyUrl}

#NFT #Art #Blockchain #Kenya #SANAA #AfricanArt`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
  window.open(twitterUrl, "_blank", "width=550,height=420");
}

// ============================================
// CLIPBOARD & TOAST
// ============================================
function copyToClipboard(text, successMessage = "Copied!") {
  if (!text) return;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast(successMessage, "success");
    })
    .catch((err) => {
      console.error("Copy failed:", err);
      showToast("Failed to copy", "error");

      // Fallback for older browsers
      fallbackCopy(text, successMessage);
    });
}

function fallbackCopy(text, successMessage) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    document.execCommand("copy");
    showToast(successMessage, "success");
  } catch (err) {
    showToast("Failed to copy", "error");
  }

  document.body.removeChild(textArea);
}

function showToast(message, type = "info") {
  // Create toast container if it doesn't exist
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-6 right-6 z-50 space-y-3";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");

  const bgColor = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-gallery-900",
  }[type] || "bg-gallery-900";

  const icon = {
    success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
    info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  }[type] || `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-xs transform translate-y-4 opacity-0 transition-all duration-300`;
  toast.innerHTML = `
    ${icon}
    <span class="text-sm font-medium">${message}</span>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-4", "opacity-0");
  });

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add("translate-y-4", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// IMAGE HANDLING
// ============================================
function hideImageLoading() {
  if (els.imageLoading) {
    els.imageLoading.classList.add("hidden");
  }
}

function handleImageError() {
  if (els.imageLoading) {
    els.imageLoading.innerHTML = `
      <div class="text-center py-12">
        <div class="w-16 h-16 bg-gallery-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gallery-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <p class="text-sm text-gallery-500">Image not available</p>
      </div>
    `;
    els.imageLoading.classList.remove("hidden");
  }

  if (els.artImage) {
    els.artImage.classList.add("hidden");
  }
}

function setLoadingState(isLoading) {
  state.isLoading = isLoading;

  // Update loading text values
  if (isLoading) {
    const loadingText = "Loading...";
    if (els.artTitle) els.artTitle.textContent = loadingText;
    if (els.artArtist) els.artArtist.textContent = "Artist: " + loadingText;
    if (els.artMaterials) els.artMaterials.textContent = loadingText;
    if (els.artLocation) els.artLocation.textContent = loadingText;
    if (els.artDate) els.artDate.textContent = loadingText;
    if (els.artPrice) els.artPrice.textContent = loadingText;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function buildImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  return API_BASE_URL + imageUrl;
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatPrice(price) {
  if (!price || price === 0) return "Contact artist";
  return `Ksh ${Number(price).toLocaleString()}`;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}