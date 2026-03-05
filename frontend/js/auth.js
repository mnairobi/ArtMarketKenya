import { registerUser } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const messageEl = document.getElementById("register-message");
  
  if (!form) return; // Exit if not on registration page
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg(messageEl);
    
    // Get form values
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const role = form.role.value;
    
    // Validation
    if (!username || !email || !password) {
      showMsg(messageEl, "All fields are required.", true);
      return;
    }
    
    if (password.length < 6) {
      showMsg(messageEl, "Password must be at least 6 characters.", true);
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMsg(messageEl, "Please enter a valid email address.", true);
      return;
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";
    
    try {
      // Register the user
      const data = await registerUser({
        username,
        email,
        password,
        role
      });
      
      showMsg(messageEl, "Registration successful! Redirecting to login...", false);
      
      // Redirect based on role after 2 seconds
      setTimeout(() => {
        switch(role) {
          case 'artist':
            window.location.href = "./artist-login.html";
            break;
          case 'admin':
            window.location.href = "./admin-login.html";
            break;
          default: // buyer
            window.location.href = "./login.html";
        }
      }, 2000);
      
    } catch (err) {
      console.error("Registration error:", err);
      
      // Handle specific error messages
      if (err.status === 409) {
        showMsg(messageEl, "Email already exists. Please use a different email.", true);
      } else if (err.data && err.data.message) {
        showMsg(messageEl, err.data.message, true);
      } else if (err.data && err.data.error) {
        showMsg(messageEl, err.data.error, true);
      } else {
        showMsg(messageEl, "Registration failed. Please try again.", true);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Register";
    }
  });
  
  // Add password strength indicator
  const passwordInput = form.password;
  if (passwordInput) {
    passwordInput.addEventListener("input", (e) => {
      const strength = checkPasswordStrength(e.target.value);
      updatePasswordStrengthIndicator(strength);
    });
  }
});

function showMsg(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.className = `text-center mt-4 text-sm ${isError ? "text-red-600" : "text-green-600"}`;
}

function clearMsg(el) {
  if (el) {
    el.textContent = "";
  }
}

function checkPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;
  return strength;
}

function updatePasswordStrengthIndicator(strength) {
  const indicator = document.getElementById("password-strength");
  if (!indicator) {
    // Create indicator if it doesn't exist
    const passwordField = document.getElementById("password");
    if (passwordField && passwordField.parentElement) {
      const div = document.createElement("div");
      div.id = "password-strength";
      div.className = "text-xs mt-1";
      passwordField.parentElement.appendChild(div);
    }
  }
  
  const strengthIndicator = document.getElementById("password-strength");
  if (!strengthIndicator) return;
  
  const strengthLevels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["text-red-500", "text-orange-500", "text-yellow-500", "text-green-500"];
  
  if (strength > 0) {
    strengthIndicator.textContent = `Password strength: ${strengthLevels[strength - 1]}`;
    strengthIndicator.className = `text-xs mt-1 ${strengthColors[strength - 1]}`;
  } else {
    strengthIndicator.textContent = "";
  }
}