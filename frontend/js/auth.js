// js/auth.js
import { loginUser, registerUser } from "./api.js";

const BUYER_HOME_URL = "./index.html";
const ARTIST_DASHBOARD_URL = "./artist-dashboard.html"; // create later
const ADMIN_DASHBOARD_URL = "./admin-dashboard.html";   // optional

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    initLoginForm(loginForm);
  }

  if (registerForm) {
    initRegisterForm(registerForm);
  }
});

function initLoginForm(form) {
  const messageEl = document.getElementById("login-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage(messageEl);

    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!email || !password) {
      setMessage(messageEl, "Email and password are required.", true);
      return;
    }

    try {
      // Call backend
      const data = await loginUser({ email, password });

      // Expecting: { access_token, user: { ... } }
      if (!data.access_token || !data.user) {
        setMessage(messageEl, "Invalid login response from server.", true);
        return;
      }

      // Store auth info for later use
      saveAuth(data);

      // Redirect based on role
      const role = data.user.role || "buyer";
      if (role === "artist") {
        window.location.href = ARTIST_DASHBOARD_URL;
      } else if (role === "admin") {
        window.location.href = ADMIN_DASHBOARD_URL;
      } else {
        window.location.href = BUYER_HOME_URL;
      }
    } catch (err) {
      console.error(err);
      const msg =
        (err.data && (err.data.message || err.data.error)) ||
        err.message ||
        "Login failed.";
      setMessage(messageEl, msg, true);
    }
  });
}

function initRegisterForm(form) {
  const messageEl = document.getElementById("register-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage(messageEl);

    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const role = form.role.value || "buyer";

    if (!username || !email || !password) {
      setMessage(messageEl, "All fields are required.", true);
      return;
    }

    try {
      // Call backend
      const data = await registerUser({ username, email, password, role });

      // Your register endpoint returns whatever UserService.create_user returns.
      // Assume success if we reach here (apiRequest throws on non-2xx).
      setMessage(
        messageEl,
        "Registration successful. Redirecting to login...",
        false
      );

      // Small delay then redirect to login
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1200);
    } catch (err) {
      console.error(err);
      const msg =
        (err.data && (err.data.message || err.data.error)) ||
        err.message ||
        "Registration failed.";
      setMessage(messageEl, msg, true);
    }
  });
}

/* ===== Helpers ===== */

function setMessage(el, text, isError = false) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("text-red-600", "text-green-600");
  el.classList.add(isError ? "text-red-600" : "text-green-600");
}

function clearMessage(el) {
  if (!el) return;
  el.textContent = "";
}

function saveAuth(data) {
  try {
    // Example structure: { access_token, user }
    localStorage.setItem("auth_token", data.access_token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
  } catch (e) {
    console.warn("Could not save auth to localStorage", e);
  }
}

/* You can later add helpers like:
export function getCurrentUser() { ... }
export function getAuthToken() { ... }
*/