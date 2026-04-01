// js/auth.js - Unified Authentication Handler
import { loginBuyer, loginArtist, loginAdmin, registerUser } from "./api.js";

/* ========== INITIALIZATION ========== */
document.addEventListener("DOMContentLoaded", () => {
  console.log("Auth.js loaded"); // Debug
  
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  
  if (loginForm) {
    console.log("Login form found"); // Debug
    loginForm.addEventListener("submit", handleLogin);
  }
  
  if (registerForm) {
    console.log("Register form found"); // Debug
    registerForm.addEventListener("submit", handleRegister);
  }
  
  // Initialize password toggle
  initPasswordToggle();
  
  // Initialize password strength indicator
  initPasswordStrength();
});

/* ========== LOGIN HANDLER ========== */
async function handleLogin(e) {
  e.preventDefault();
  console.log("Login form submitted"); // Debug
  
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  
  const messageEl = document.getElementById("login-message");
  const loginBtn = document.getElementById("loginBtn");
  
  // Clear previous messages
  clearMessage(messageEl);
  
  // Validation
  if (!email || !password) {
    showMessage(messageEl, "Email and password are required.", true);
    return;
  }
  
  // Determine which role we're logging in as
  const role = detectRole();
  console.log("Detected role:", role); // Debug
  
  // Disable button and show loading
  setButtonLoading(loginBtn, true, "Signing in...");
  
  try {
    let data;
    
    // Call the appropriate login function based on role
    switch (role) {
      case 'artist':
        data = await loginArtist({ email, password });
        break;
      case 'admin':
        data = await loginAdmin({ email, password });
        break;
      default: // buyer
        data = await loginBuyer({ email, password });
    }
    
    console.log("Login successful:", data); // Debug
    
    // Save auth data
    localStorage.setItem("auth_token", data.access_token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    
    // Show success message
    showMessage(messageEl, `Welcome, ${data.user.username}!`, false);
    
    // Redirect based on role
    setTimeout(() => {
      redirectByRole(data.user.role || role);
    }, 800);
    
  } catch (err) {
    console.error("Login error:", err);
    
    let errorMsg = "Login failed. Please try again.";
    
    if (err.status === 403) {
      errorMsg = `This account is not a ${role} account. Please use the correct login page.`;
    } else if (err.status === 401) {
      errorMsg = "Invalid email or password.";
    } else if (err.data?.message) {
      errorMsg = err.data.message;
    } else if (err.data?.error) {
      errorMsg = err.data.error;
    }
    
    showMessage(messageEl, errorMsg, true);
  } finally {
    setButtonLoading(loginBtn, false, getButtonText(role));
  }
}

/* ========== REGISTER HANDLER ========== */
async function handleRegister(e) {
  e.preventDefault();
  console.log("Register form submitted"); // Debug
  
  const form = e.target;
  const username = form.username.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  
  // Get role - check both radio buttons and select
  let role = 'buyer';
  const roleRadio = form.querySelector('input[name="role"]:checked');
  const roleSelect = form.querySelector('select[name="role"]');
  if (roleRadio) {
    role = roleRadio.value;
  } else if (roleSelect) {
    role = roleSelect.value;
  }
  
  const termsCheckbox = form.terms;
  
  const messageEl = document.getElementById("register-message");
  const submitBtn = form.querySelector('button[type="submit"]');
  
  // Clear previous messages
  clearMessage(messageEl);
  
  // Validation
  if (!username || !email || !password) {
    showMessage(messageEl, "All fields are required.", true);
    return;
  }
  
  if (password.length < 6) {
    showMessage(messageEl, "Password must be at least 6 characters.", true);
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage(messageEl, "Please enter a valid email address.", true);
    return;
  }
  
  if (termsCheckbox && !termsCheckbox.checked) {
    showMessage(messageEl, "Please accept the terms and conditions.", true);
    return;
  }
  
  // Disable button and show loading
  setButtonLoading(submitBtn, true, "Creating account...");
  
  try {
    const data = await registerUser({ username, email, password, role });
    
    console.log("Registration successful:", data); // Debug
    
    showMessage(messageEl, "Registration successful! Redirecting to login...", false);
    
    // Redirect to appropriate login page
    setTimeout(() => {
      switch (role) {
        case 'artist':
          window.location.href = "./artist-login.html";
          break;
        case 'admin':
          window.location.href = "./admin-login.html";
          break;
        default:
          window.location.href = "./login.html";
      }
    }, 2000);
    
  } catch (err) {
    console.error("Registration error:", err);
    
    let errorMsg = "Registration failed. Please try again.";
    
    if (err.status === 409) {
      errorMsg = "Email already exists. Please use a different email.";
    } else if (err.data?.message) {
      errorMsg = err.data.message;
    } else if (err.data?.error) {
      errorMsg = err.data.error;
    }
    
    showMessage(messageEl, errorMsg, true);
  } finally {
    setButtonLoading(submitBtn, false, "Create Account");
  }
}

/* ========== HELPER FUNCTIONS ========== */

// Detect which role based on page or global variable
function detectRole() {
  // Check if role is set globally (in HTML script)
  if (window.authRole) {
    return window.authRole;
  }
  
  // Check URL
  const path = window.location.pathname.toLowerCase();
  if (path.includes('artist')) return 'artist';
  if (path.includes('admin')) return 'admin';
  
  return 'buyer';
}

// Get button text based on role
function getButtonText(role) {
  switch (role) {
    case 'artist':
      return 'Sign In as Artist';
    case 'admin':
      return 'Secure Sign In';
    default:
      return 'Sign In';
  }
}

// Redirect based on user role
function redirectByRole(role) {
  switch (role) {
    case 'artist':
      window.location.href = "./artist-dashboard.html";
      break;
    case 'admin':
      window.location.href = "./admin-dashboard.html";
      break;
    default:
      window.location.href = "./index.html";
  }
}

// Show message
function showMessage(el, text, isError) {
  if (!el) return;
  
  el.innerHTML = `
    <div class="flex items-center justify-center gap-2 ${isError ? 'text-red-600' : 'text-green-600'}">
      <span>${text}</span>
    </div>
  `;
  el.classList.remove("hidden");
}

// Clear message
function clearMessage(el) {
  if (!el) return;
  el.innerHTML = "";
}

// Set button loading state
function setButtonLoading(btn, loading, text) {
  if (!btn) return;
  
  btn.disabled = loading;
  
  if (loading) {
    btn.innerHTML = `
      <svg class="w-5 h-5 animate-spin inline-block mr-2" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${text}
    `;
  } else {
    btn.textContent = text;
  }
}

/* ========== PASSWORD TOGGLE ========== */
function initPasswordToggle() {
  const toggleBtn = document.getElementById("toggle-password");
  const passwordInput = document.getElementById("password");
  
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", () => {
      const type = passwordInput.type === "password" ? "text" : "password";
      passwordInput.type = type;
    });
  }
}

/* ========== PASSWORD STRENGTH ========== */
function initPasswordStrength() {
  const passwordInput = document.getElementById("password");
  const strengthContainer = document.getElementById("password-strength");
  
  if (passwordInput && strengthContainer) {
    passwordInput.addEventListener("input", (e) => {
      const password = e.target.value;
      const strength = checkPasswordStrength(password);
      updatePasswordStrengthUI(strengthContainer, strength, password.length);
    });
  }
}

function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) score++;
  if (password.match(/[0-9]/)) score++;
  if (password.match(/[^a-zA-Z0-9]/)) score++;
  return score;
}

function updatePasswordStrengthUI(container, strength, length) {
  if (length === 0) {
    container.innerHTML = "";
    return;
  }
  
  const levels = [
    { label: "Weak", color: "bg-red-500", textColor: "text-red-600" },
    { label: "Fair", color: "bg-orange-500", textColor: "text-orange-600" },
    { label: "Good", color: "bg-yellow-500", textColor: "text-yellow-600" },
    { label: "Strong", color: "bg-green-500", textColor: "text-green-600" },
  ];
  
  const level = levels[Math.min(strength, 3)];
  const percent = ((strength + 1) / 4) * 100;
  
  container.innerHTML = `
    <div class="flex items-center gap-2 mt-1">
      <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div class="h-full ${level.color} transition-all duration-300" style="width: ${percent}%"></div>
      </div>
      <span class="text-xs ${level.textColor} font-medium">${level.label}</span>
    </div>
  `;
}

/* ========== GOOGLE SIGN-IN (Optional) ========== */
window.handleGoogleSignIn = async function(credential, role = 'buyer') {
  const messageEl = document.getElementById("login-message") || document.getElementById("register-message");
  
  try {
    showMessage(messageEl, "Signing in with Google...", false);
    
    // You'll need to add googleSignIn to your api.js
    const { googleSignIn } = await import("./api.js");
    const data = await googleSignIn({ credential, role });
    
    localStorage.setItem("auth_token", data.access_token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    
    showMessage(messageEl, "Success! Redirecting...", false);
    
    setTimeout(() => {
      redirectByRole(data.user.role);
    }, 1000);
    
  } catch (err) {
    console.error("Google sign-in error:", err);
    showMessage(messageEl, err.data?.message || "Google sign-in failed.", true);
  }
};