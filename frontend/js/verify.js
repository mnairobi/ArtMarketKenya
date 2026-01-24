// js/verify.js
import { verifyPaintingCertificate } from "./api.js";

const el = (id) => document.getElementById(id);

function showStatus(message, ok = true) {
  const box = el("verify-status");
  box.classList.remove("hidden");

  box.className =
    "mt-4 rounded-xl border p-4 text-sm " +
    (ok
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-red-50 border-red-200 text-red-800");

  box.innerHTML = message;
}

function getPaintingIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("painting_id");
  return id ? Number(id) : null;
}

function renderQrForThisPage() {
  const qrImg = el("qr-img");
  const qrDownload = el("qr-download");

  if (!qrImg) return; // if you didn't add the QR block in HTML, do nothing

  const verifyPageUrl = window.location.href;

  // Free QR code PNG (no libs)
  const qrPngUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
    encodeURIComponent(verifyPageUrl);

  qrImg.src = qrPngUrl;

  if (qrDownload) {
    qrDownload.href = qrPngUrl;
    qrDownload.setAttribute("download", `hakika_qr_painting_${getPaintingIdFromUrl() || ""}.png`);
    qrDownload.textContent = "Download QR PNG";
  }
}

async function load() {
  const paintingId = getPaintingIdFromUrl();

  if (!paintingId) {
    showStatus(
      "Missing <b>painting_id</b> in URL. Example: verify.html?painting_id=13",
      false
    );
    return;
  }

  // ✅ Show QR immediately (even before API loads)
  renderQrForThisPage();

  try {
    const data = await verifyPaintingCertificate(paintingId);

    el("art-title").textContent = data.title || `Painting #${paintingId}`;
    el("art-artist").textContent = `Artist: ${data.artist || "Unknown"}`;
    el("art-meta").textContent = `${data.materials || ""} • ${data.location || ""}`.trim();

    el("art-cid").textContent = data.ipfs_cid || "-";

    const ipfsUrl = data.ipfs_url || "-";
    el("ipfs-link").textContent = ipfsUrl;
    el("ipfs-link").href = ipfsUrl !== "-" ? ipfsUrl : "#";

    el("hash-stored").textContent = data.stored_hash || "-";
    el("hash-computed").textContent = data.computed_hash || "-";

    el("raw-json").textContent = JSON.stringify(data.certificate || data, null, 2);

    if (data.valid === true) {
      showStatus(
        "<b>Authentic ✅</b> Certificate hash matches and IPFS content is consistent.",
        true
      );
    } else if (data.valid === false) {
      showStatus(
        "<b>Not Authentic ❌</b> Certificate hash mismatch detected (tampered).",
        false
      );
    } else {
      showStatus("<b>Verified ✅</b> Certificate found on IPFS.", true);
    }
  } catch (err) {
    const msg =
      (err.data && (err.data.message || err.data.error)) ||
      err.message ||
      "Verification failed.";

    showStatus(msg, false);
    el("raw-json").textContent = JSON.stringify(err.data || { error: msg }, null, 2);
  }
}

load();