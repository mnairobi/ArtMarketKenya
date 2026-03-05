import { loginAdmin } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const messageEl = document.getElementById("login-message");
  const loginBtn = document.getElementById("loginBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg(messageEl);

    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!email || !password) {
      showMsg(messageEl, "Email and password are required.", true);
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
      const data = await loginAdmin({ email, password });
      saveAuth(data);
      showMsg(messageEl, `Welcome, Admin ${data.user.username}!`, false);

      setTimeout(() => {
        window.location.href = "./admin-dashboard.html";
      }, 800);
    } catch (err) {
      console.error(err);
      if (err.status === 403) {
        showMsg(messageEl, "This account does not have admin privileges.", true);
      } else if (err.status === 401) {
        showMsg(messageEl, "Invalid email or password.", true);
      } else {
        showMsg(messageEl, err.data?.message || "Login failed.", true);
      }
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login as Admin";
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

function saveAuth(data) {
  localStorage.setItem("auth_token", data.access_token);
  localStorage.setItem("auth_user", JSON.stringify(data.user));
}