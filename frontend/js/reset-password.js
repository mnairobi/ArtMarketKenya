import { validateResetToken, resetPassword } from "./api.js";

let resetToken = null;

document.addEventListener("DOMContentLoaded", async () => {
  const loadingEl = document.getElementById("loading-state");
  const invalidEl = document.getElementById("invalid-state");
  const invalidReason = document.getElementById("invalid-reason");
  const formEl = document.getElementById("form-state");
  const successEl = document.getElementById("success-state");
  const messageEl = document.getElementById("reset-message");
  const emailEl = document.getElementById("reset-email");
  const form = document.getElementById("resetForm");
  const resetBtn = document.getElementById("resetBtn");
  const passwordInput = document.getElementById("new_password");
  const confirmInput = document.getElementById("confirm_password");

  // Get token from URL: reset-password.html?token=xxxxx
  const params = new URLSearchParams(window.location.search);
  resetToken = params.get("token");

  if (!resetToken) {
    showState("invalid");
    invalidReason.textContent = "No reset token found in the URL.";
    return;
  }

  // Validate token with backend
  try {
    const data = await validateResetToken(resetToken);

    if (data.valid) {
      showState("form");
      emailEl.textContent = `Reset password for ${data.email}`;
    } else {
      showState("invalid");
      invalidReason.textContent = data.error || "This reset link is no longer valid.";
    }
  } catch (err) {
    console.error(err);
    showState("invalid");
    invalidReason.textContent =
      err.data?.error || "This reset link is invalid or has expired.";
  }

  // Password strength checker
  passwordInput.addEventListener("input", () => {
    updatePasswordStrength(passwordInput.value);
  });

  // Handle form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg(messageEl);

    const newPassword = passwordInput.value.trim();
    const confirmPassword = confirmInput.value.trim();

    // Validation
    if (!newPassword || !confirmPassword) {
      showMsg(messageEl, "Both fields are required.", true);
      return;
    }

    if (newPassword.length < 6) {
      showMsg(messageEl, "Password must be at least 6 characters.", true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showMsg(messageEl, "Passwords do not match.", true);
      confirmInput.focus();
      return;
    }

    resetBtn.disabled = true;
    resetBtn.textContent = "Resetting...";

    try {
      const data = await resetPassword(resetToken, newPassword);
      showState("success");
    } catch (err) {
      console.error(err);
      const msg =
        err.data?.error || err.data?.message || err.message || "Failed to reset password.";
      showMsg(messageEl, msg, true);
    } finally {
      resetBtn.disabled = false;
      resetBtn.textContent = "Reset Password";
    }
  });

  // Helper: show/hide states
  function showState(state) {
    loadingEl.classList.add("hidden");
    invalidEl.classList.add("hidden");
    formEl.classList.add("hidden");
    successEl.classList.add("hidden");

    switch (state) {
      case "loading":
        loadingEl.classList.remove("hidden");
        break;
      case "invalid":
        invalidEl.classList.remove("hidden");
        break;
      case "form":
        formEl.classList.remove("hidden");
        break;
      case "success":
        successEl.classList.remove("hidden");
        break;
    }
  }
});

// Password strength indicator
function updatePasswordStrength(password) {
  const strengthDiv = document.getElementById("password-strength");
  const bars = [
    document.getElementById("str-bar-1"),
    document.getElementById("str-bar-2"),
    document.getElementById("str-bar-3"),
    document.getElementById("str-bar-4"),
  ];
  const textEl = document.getElementById("str-text");

  if (!strengthDiv || !textEl) return;

  if (!password) {
    strengthDiv.classList.add("hidden");
    return;
  }

  strengthDiv.classList.remove("hidden");

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  bars.forEach((bar, i) => {
    bar.className = "h-1 flex-1 rounded ";
    if (i < score) {
      bar.className += colors[score - 1];
    } else {
      bar.className += "bg-gray-200";
    }
  });

  textEl.textContent = labels[score - 1] || "";
  textEl.className = "text-xs mt-1 ";
  if (score <= 1) textEl.className += "text-red-500";
  else if (score === 2) textEl.className += "text-orange-500";
  else if (score === 3) textEl.className += "text-yellow-600";
  else textEl.className += "text-green-600";
}

function showMsg(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.className = `text-center mt-4 text-sm ${isError ? "text-red-600" : "text-green-600"}`;
}

function clearMsg(el) {
  if (el) el.textContent = "";
}