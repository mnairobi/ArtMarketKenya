// js/verify.js
import { verifyPaintingCertificate } from "./api.js";

// API base URL for images - UPDATE THIS TO MATCH YOUR BACKEND
const API_BASE_URL = "http://localhost:5000";

// ===== Helper Functions =====

// Get painting ID from URL
function getPaintingId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("painting_id");
}

// Safe element getter
function el(id) {
  return document.getElementById(id);
}

// Safe text setter
function setText(id, text) {
  const element = el(id);
  if (element) {
    element.textContent = text || "-";
  }
}

// Build full image URL
function buildImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  return API_BASE_URL + imageUrl;
}

// Format price
function formatPrice(price) {
  if (!price || price === 0) return "Contact artist";
  return `Ksh ${Number(price).toLocaleString()}`;
}

// Show status message
function showStatus(html, isOk) {
  const statusEl = el("verify-status");
  if (!statusEl) return;
  
  statusEl.innerHTML = html;
  statusEl.classList.remove(
    "hidden",
    "bg-green-50",
    "bg-red-50",
    "border-green-200",
    "border-red-200",
    "text-green-800",
    "text-red-800"
  );
  
  if (isOk) {
    statusEl.classList.add("bg-green-50", "border-green-200", "text-green-800");
  } else {
    statusEl.classList.add("bg-red-50", "border-red-200", "text-red-800");
  }
}

// Generate QR Code
function setupQR() {
  const qrImg = el("qr-img");
  const qrDownload = el("qr-download");
  const paintingId = getPaintingId();

  if (qrImg) {
    const url = window.location.href;
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  }

  if (qrDownload && qrImg) {
    qrDownload.href = qrImg.src;
    qrDownload.download = `hakika_certificate_${paintingId}.png`;
  }
}

// Update hash match status display
function updateHashStatus(storedHash, computedHash) {
  const hashStatus = el("hash-match-status");
  if (!hashStatus || !storedHash || !computedHash) return;

  if (storedHash === computedHash) {
    hashStatus.innerHTML = `
      <div class="flex items-center gap-2 text-green-700">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium">✓ Hashes match - Certificate integrity verified</span>
      </div>
    `;
  } else {
    hashStatus.innerHTML = `
      <div class="flex items-center gap-2 text-red-700">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <span class="font-medium">✗ Hash mismatch - Possible tampering detected</span>
      </div>
    `;
  }
}

// Show verification success status
function showSuccessStatus(isValid, message) {
  if (isValid === true) {
    showStatus(`
      <div class="flex items-center gap-3">
        <svg class="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <div>
          <strong>✅ Authentic & Verified</strong> - Certificate hash matches. This artwork is genuine and stored on the blockchain.
        </div>
      </div>
    `, true);
  } else if (isValid === false) {
    showStatus(`
      <div class="flex items-center gap-3">
        <svg class="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <div>
          <strong>❌ Warning: Hash Mismatch</strong> - Certificate may have been tampered with. Proceed with caution.
        </div>
      </div>
    `, false);
  } else {
    showStatus(`
      <div class="flex items-center gap-3">
        <svg class="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <div>
          <strong>✅ Certificate Found</strong> - Retrieved from IPFS blockchain storage.
        </div>
      </div>
    `, true);
  }
}

// Show error status
function showErrorStatus(message) {
  showStatus(`
    <div class="flex items-center gap-3">
      <svg class="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      <div>
        <strong>❌ Verification Failed</strong> - ${message}
      </div>
    </div>
  `, false);
}

// Hide loading spinner
function hideLoading() {
  const loadingEl = el("image-loading");
  if (loadingEl) {
    loadingEl.classList.add("hidden");
  }
}

// ===== Main Verification Function =====

async function verify() {
  const paintingId = getPaintingId();

  // Check if painting ID exists
  if (!paintingId) {
    showStatus(
      "⚠️ <strong>Missing painting ID</strong><br>URL should include ?painting_id=21",
      false
    );
    hideLoading();
    return;
  }

  console.log("🔄 Verifying painting:", paintingId);

  // Setup QR immediately
  setupQR();

  // Setup buy button
  const buyBtn = el("buy-artwork-btn");
  if (buyBtn) {
    buyBtn.href = `./index.html?highlight=${paintingId}`;
  }

  try {
    // Fetch certificate data from API
    const data = await verifyPaintingCertificate(paintingId);
    console.log("✅ Received data:", data);

    const cert = data.certificate || {};

    // Set artwork image
    const artImage = el("art-image");
    const imageUrl = cert.image_url || data.image_url;
    if (artImage && imageUrl) {
      artImage.src = buildImageUrl(imageUrl);
      artImage.alt = data.title || cert.title || "Artwork";
    } else {
      hideLoading();
    }

    // Set description if available
    const description = cert.description || data.description;
    if (description) {
      setText("art-description", `"${description}"`);
      el("art-description-wrap")?.classList.remove("hidden");
    }

    // Update main UI elements
    setText("art-title", data.title || cert.title || "Artwork");
    setText("art-artist", "Artist: " + (data.artist || cert.artist_name || "Unknown"));
    setText("art-materials", data.materials || cert.materials || "Not specified");
    setText("art-location", data.location || cert.location || "Kenya");
    setText("art-date", cert.created_date || "N/A");
    setText("art-price", formatPrice(cert.price));

    // Update technical details
    setText("art-cid", data.ipfs_cid || "-");
    setText("hash-stored", data.stored_hash || "-");
    setText("hash-computed", data.computed_hash || "-");

    // Update hash match status
    updateHashStatus(data.stored_hash, data.computed_hash);

    // IPFS link
    const ipfsLink = el("ipfs-link");
    if (ipfsLink && data.ipfs_url) {
      ipfsLink.href = data.ipfs_url;
      ipfsLink.textContent = data.ipfs_url;
    }

    // Raw JSON
    const rawJson = el("raw-json");
    if (rawJson) {
      rawJson.textContent = JSON.stringify(cert, null, 2);
    }

    // Show verification status
    showSuccessStatus(data.valid);

    console.log("✅ Verification complete!");

  } catch (err) {
    console.error("❌ Verification error:", err);
    hideLoading();
    
    const msg = err?.data?.message || err?.message || "Verification failed";
    showErrorStatus(msg);

    // Show error in raw JSON
    const rawJson = el("raw-json");
    if (rawJson) {
      rawJson.textContent = JSON.stringify({ error: msg }, null, 2);
    }
  }
}

// ===== Event Listeners =====

function initEventListeners() {
  // Toggle technical details
  const toggleBtn = el("toggle-tech-btn");
  const techDetails = el("tech-details");
  if (toggleBtn && techDetails) {
    toggleBtn.addEventListener("click", () => {
      techDetails.classList.toggle("hidden");
      toggleBtn.textContent = techDetails.classList.contains("hidden")
        ? "🔽 Show Technical Details"
        : "🔼 Hide Technical Details";
    });
  }

  // Copy CID button
  const copyCidBtn = el("copy-cid-btn");
  if (copyCidBtn) {
    copyCidBtn.addEventListener("click", () => {
      const cid = el("art-cid")?.textContent;
      if (cid && cid !== "-") {
        navigator.clipboard.writeText(cid).then(() => {
          alert("✅ CID copied to clipboard!");
        });
      }
    });
  }

  // Copy link button
  const copyLinkBtn = el("copy-link-btn");
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert("✅ Verification link copied!");
      });
    });
  }

  // Copy JSON button
  const copyJsonBtn = el("copy-json-btn");
  if (copyJsonBtn) {
    copyJsonBtn.addEventListener("click", () => {
      const json = el("raw-json")?.textContent;
      if (json) {
        navigator.clipboard.writeText(json).then(() => {
          alert("✅ Certificate JSON copied!");
        });
      }
    });
  }

  // Share on WhatsApp button
  const whatsappBtn = el("share-whatsapp-btn");
  if (whatsappBtn) {
    whatsappBtn.addEventListener("click", () => {
      const title = el("art-title")?.textContent || "Artwork";
      const url = window.location.href;
      const text = `Check out this verified artwork: "${title}" - ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    });
  }

  // Image load handler
  const artImage = el("art-image");
  if (artImage) {
    artImage.addEventListener("load", hideLoading);
    artImage.addEventListener("error", () => {
      artImage.src = "https://via.placeholder.com/400x300?text=Image+Not+Available";
      hideLoading();
    });
  }
}

// ===== Initialize on DOM Ready =====

document.addEventListener("DOMContentLoaded", () => {
  console.log("🎨 Hakika ya Kienyeji - Certificate Verification");
  initEventListeners();
  verify();
});