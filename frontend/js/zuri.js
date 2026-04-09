// js/zuri.js
// Zuri — SANAA's AI Art Assistant Chat Widget v2.0
// Features: Cart Integration + Certificate Verification

import { API_BASE_URL } from "./api.js";

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════
const zuriState = {
  isOpen: false,
  isLoading: false,
  messages: [],
  isMinimized: false,
};

// ══════════════════════════════════════════════════════════════════
// CREATE CHAT WIDGET
// ══════════════════════════════════════════════════════════════════
function createZuriWidget() {
  if (document.getElementById("zuri-widget")) return;

  const widget = document.createElement("div");
  widget.id = "zuri-widget";
  widget.innerHTML = `
    <!-- Floating Button -->
    <button 
      id="zuri-toggle" 
      class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 group hover:scale-110"
      title="Chat with Zuri"
    >
      <svg id="zuri-icon-chat" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      <svg id="zuri-icon-close" class="w-7 h-7 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
      <span class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
    </button>

    <!-- Chat Window -->
    <div 
      id="zuri-chat" 
      class="hidden fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
      style="height: 550px; max-height: calc(100vh - 8rem);"
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span class="text-xl">🎨</span>
          </div>
          <div>
            <h3 class="text-white font-semibold text-sm flex items-center gap-2">
              Zuri
              <span class="text-[10px] bg-green-500/80 text-white px-2 py-0.5 rounded-full">v2.0</span>
            </h3>
            <p class="text-white/80 text-xs">SANAA Art Assistant</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span class="text-white/80 text-xs">Online</span>
        </div>
      </div>

      <!-- Messages -->
      <div id="zuri-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <!-- Welcome message -->
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-sm">🎨</span>
          </div>
          <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
            <p class="text-sm text-gray-700">
              Habari! 👋 I'm <strong>Zuri</strong>, your art assistant at SANAA.
            </p>
            <p class="text-sm text-gray-700 mt-2">
              I can help you discover paintings, verify certificates, or even add art to your cart! What are you looking for today?
            </p>
            <!-- Quick actions -->
            <div class="flex flex-wrap gap-2 mt-3">
              <button onclick="zuriQuickMessage('Show me landscape paintings')" class="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs hover:bg-amber-100 transition">
                🏞️ Landscapes
              </button>
              <button onclick="zuriQuickMessage('Recommend something under 20000')" class="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs hover:bg-amber-100 transition">
                💰 Under 20K
              </button>
              <button onclick="zuriQuickMessage('How do I buy art here?')" class="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs hover:bg-amber-100 transition">
                🛒 How to buy
              </button>
              <button onclick="zuriQuickMessage('What is Hakika ya Kienyeji?')" class="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs hover:bg-amber-100 transition">
                📜 Certificates
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="p-3 bg-white border-t border-gray-100 flex-shrink-0">
        <form id="zuri-form" class="flex items-center gap-2">
          <input 
            type="text" 
            id="zuri-input"
            placeholder="Try: 'Add Sunset to cart' or 'Verify Maasai'"
            class="flex-1 px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
            autocomplete="off"
          >
          <button 
            type="submit"
            id="zuri-send"
            class="w-10 h-10 bg-amber-600 hover:bg-amber-700 rounded-full flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </form>
        <p class="text-center text-xs text-gray-400 mt-2">🛒 Cart + 📜 Certificates · SANAA Kenya</p>
      </div>
    </div>
  `;

  document.body.appendChild(widget);
  initZuriEvents();
}

// ══════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════════════════════════
function initZuriEvents() {
  const toggleBtn = document.getElementById("zuri-toggle");
  const form = document.getElementById("zuri-form");
  const input = document.getElementById("zuri-input");

  toggleBtn?.addEventListener("click", toggleZuriChat);
  
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = input?.value.trim();
    if (message) {
      sendMessage(message);
      input.value = "";
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// TOGGLE CHAT
// ══════════════════════════════════════════════════════════════════
function toggleZuriChat() {
  const chat = document.getElementById("zuri-chat");
  const iconChat = document.getElementById("zuri-icon-chat");
  const iconClose = document.getElementById("zuri-icon-close");

  zuriState.isOpen = !zuriState.isOpen;

  if (zuriState.isOpen) {
    chat?.classList.remove("hidden");
    chat?.classList.add("flex");
    iconChat?.classList.add("hidden");
    iconClose?.classList.remove("hidden");
    
    setTimeout(() => {
      document.getElementById("zuri-input")?.focus();
    }, 100);
  } else {
    chat?.classList.add("hidden");
    chat?.classList.remove("flex");
    iconChat?.classList.remove("hidden");
    iconClose?.classList.add("hidden");
  }
}

// ══════════════════════════════════════════════════════════════════
// SEND MESSAGE
// ══════════════════════════════════════════════════════════════════
async function sendMessage(message) {
  if (zuriState.isLoading) return;

  // Add user message to UI
  addMessageToUI("user", message);
  zuriState.messages.push({ role: "user", content: message });

  // Show typing indicator
  zuriState.isLoading = true;
  const typingId = showTypingIndicator();
  
  const sendBtn = document.getElementById("zuri-send");
  if (sendBtn) sendBtn.disabled = true;

  try {
    // Get auth token if logged in
    const token = localStorage.getItem("auth_token");

    const headers = {
      "Content-Type": "application/json",
    };
    
    // Add auth header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/zuri/chat`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        message: message,
        history: zuriState.messages.slice(-10),
      }),
    });

    const data = await response.json();
    removeTypingIndicator(typingId);

    const reply = data.reply || "I couldn't process that. Please try again! 🎨";
    
    // Add assistant reply to UI with action data
    addMessageToUI("assistant", reply, data);
    zuriState.messages.push({ role: "assistant", content: reply });

    // If item was added to cart, dispatch event to update cart UI
    if (data.cart_action && data.action === "added_to_cart") {
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    }

  } catch (err) {
    console.error("Zuri error:", err);
    removeTypingIndicator(typingId);
    addMessageToUI("assistant", "I'm having trouble connecting. Please try again in a moment! 🎨");
  } finally {
    zuriState.isLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    document.getElementById("zuri-input")?.focus();
  }
}

// ══════════════════════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════════════════════
function addMessageToUI(role, content, data = {}) {
  const messagesContainer = document.getElementById("zuri-messages");
  if (!messagesContainer) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = "flex items-start gap-3 animate-fade-in";

  if (role === "user") {
    messageDiv.innerHTML = `
      <div class="ml-auto max-w-[85%]">
        <div class="bg-amber-600 text-white rounded-2xl rounded-tr-sm px-4 py-3">
          <p class="text-sm">${escapeHtml(content)}</p>
        </div>
      </div>
    `;
  } else {
    const formatted = formatZuriMessage(content);
    
    // Build action buttons based on response type
    let actionButtons = "";
    
    // Cart action buttons
    if (data.cart_action) {
      if (data.action === "added_to_cart" || data.action === "already_in_cart") {
        actionButtons = `
          <div class="flex flex-wrap gap-2 mt-3">
            <a href="/cart.html" class="px-4 py-2 bg-amber-600 text-white rounded-full text-xs hover:bg-amber-700 transition flex items-center gap-1">
              🛒 View Cart
            </a>
            <a href="/checkout.html" class="px-4 py-2 bg-green-600 text-white rounded-full text-xs hover:bg-green-700 transition flex items-center gap-1">
              ✅ Checkout
            </a>
            <button onclick="zuriQuickMessage('Show me more paintings')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-xs hover:bg-gray-300 transition">
              Keep Browsing
            </button>
          </div>
        `;
      } else if (data.action === "login_required") {
        actionButtons = `
          <div class="flex flex-wrap gap-2 mt-3">
            <a href="/login.html" class="px-4 py-2 bg-amber-600 text-white rounded-full text-xs hover:bg-amber-700 transition flex items-center gap-1">
              🔐 Log In
            </a>
            <a href="/register.html" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-xs hover:bg-gray-300 transition">
              Create Account
            </a>
          </div>
        `;
      }
    }
    
    // Certificate action buttons
    if (data.certificate_action && data.painting) {
      const painting = data.painting;
      const ipfsCid = painting.ipfs_cid || "";
      
      actionButtons = `
        <div class="flex flex-wrap gap-2 mt-3">
          <a href="/paintings/${painting.id}.html" class="px-4 py-2 bg-amber-600 text-white rounded-full text-xs hover:bg-amber-700 transition flex items-center gap-1">
            🎨 View Painting
          </a>
          ${ipfsCid ? `
            <a href="https://ipfs.io/ipfs/${ipfsCid}" target="_blank" class="px-4 py-2 bg-purple-600 text-white rounded-full text-xs hover:bg-purple-700 transition flex items-center gap-1">
              🔗 View Certificate
            </a>
          ` : ''}
          <button onclick="zuriQuickMessage('Add ${painting.title} to cart')" class="px-4 py-2 bg-green-600 text-white rounded-full text-xs hover:bg-green-700 transition">
            🛒 Add to Cart
          </button>
        </div>
      `;
    }
    
    messageDiv.innerHTML = `
      <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span class="text-sm">🎨</span>
      </div>
      <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
        <div class="text-sm text-gray-700 zuri-message">${formatted}</div>
        ${actionButtons}
      </div>
    `;
  }

  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

function formatZuriMessage(text) {
  if (!text) return "";
  
  let html = escapeHtml(text);
  
  // Bold: **text** → <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text* → <em>text</em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Code: `text` → <code>text</code>
  html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs">$1</code>');
  
  // Bullet points: • item or - item
  html = html.replace(/^[•\-] (.+)$/gm, '<span class="block ml-2">• $1</span>');
  
  // Numbered lists: 1. item
  html = html.replace(/^(\d+)\. (.+)$/gm, '<span class="block ml-2">$1. $2</span>');
  
  // Horizontal lines: ━━━ or ---
  html = html.replace(/[━\-]{3,}/g, '<hr class="my-2 border-gray-200">');
  
  // Double line breaks → paragraphs
  html = html.replace(/\n\n/g, '</p><p class="mt-2">');
  
  // Single line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph
  html = `<p>${html}</p>`;
  
  return html;
}

function showTypingIndicator() {
  const messagesContainer = document.getElementById("zuri-messages");
  if (!messagesContainer) return null;

  const id = `typing-${Date.now()}`;
  const typingDiv = document.createElement("div");
  typingDiv.id = id;
  typingDiv.className = "flex items-start gap-3";
  typingDiv.innerHTML = `
    <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
      <span class="text-sm">🎨</span>
    </div>
    <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
      <div class="flex items-center gap-1">
        <div class="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
        <div class="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
        <div class="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
      </div>
    </div>
  `;

  messagesContainer.appendChild(typingDiv);
  scrollToBottom();
  return id;
}

function removeTypingIndicator(id) {
  if (id) {
    document.getElementById(id)?.remove();
  }
}

function scrollToBottom() {
  const container = document.getElementById("zuri-messages");
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ══════════════════════════════════════════════════════════════════
// QUICK MESSAGES (Global function)
// ══════════════════════════════════════════════════════════════════
window.zuriQuickMessage = function(message) {
  const input = document.getElementById("zuri-input");
  if (input) input.value = "";
  sendMessage(message);
};

// ══════════════════════════════════════════════════════════════════
// INITIALIZE
// ══════════════════════════════════════════════════════════════════
function initZuri() {
  createZuriWidget();
  console.log("🎨 Zuri AI Assistant v2.0 initialized (Cart + Certificates)");
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initZuri);
} else {
  initZuri();
}

// Add CSS for animations
const style = document.createElement("style");
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
  .zuri-message p {
    margin-bottom: 0.25rem;
  }
  .zuri-message p:last-child {
    margin-bottom: 0;
  }
  .zuri-message hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 8px 0;
  }
  #zuri-chat {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
`;
document.head.appendChild(style);

// Export for module usage
export { initZuri, sendMessage, toggleZuriChat };