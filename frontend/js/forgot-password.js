import { forgotPassword } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgotForm");
  const messageEl = document.getElementById("forgot-message");
  const submitBtn = document.getElementById("submitBtn");
  const formState = document.getElementById("form-state");
  const successState = document.getElementById("success-state");
  const successEmailText = document.getElementById("success-email-text");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg(messageEl);

    const email = form.email.value.trim();

    if (!email) {
      showMsg(messageEl, "Please enter your email address.", true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      const data = await forgotPassword(email);

      // Show success state
      formState.classList.add("hidden");
      successState.classList.remove("hidden");
      successEmailText.innerHTML = `
        We've sent a password reset link to <strong>${email}</strong>.
        <br>Check your inbox (and spam folder).
      `;

    } catch (err) {
      console.error(err);
      showMsg(
        messageEl,
        err.data?.error || err.data?.message || err.message || "Failed to send reset link.",
        true
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Reset Link";
    }
  });
});

function showMsg(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.className = `text-center mt-4 text-sm ${isError ? "text-red-600" : "text-green-600"}`;
}

function clearMsg(el) {
  if (el) el.textContent = "";
}