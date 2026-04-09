// js/zuri.js
// Zuri — SANAA's AI Art Assistant Chat Widget

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
  // Don't create if already exists
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
      <!-- Chat icon -->
      <svg id="zuri-icon-chat" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      <!-- Close icon -->
      <svg id="zuri-icon-close" class="w-7 h-7 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
      
      <!-- Pulse animation -->
      <span class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
    </button>

    <!-- Chat Window -->
    <div 
      id="zuri-chat" 
      class="hidden fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
      style="height: 520px; max-height: calc(100vh - 8rem);"
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span class="text-xl">🎨</span>
          </div>
          <div>
            <h3 class="text-white font-semibold text-sm">Zuri</h3>
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
              I can help you discover paintings, understand our blockchain certificates, or guide you through buying. What are you looking for today?
            </p>
            <!-- Quick actions -->
            <div class="flex flex-wrap gap-2 mt-3">
              <button onclick="zuriQuickMessage('Show me landscape paintings')" class="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs hover:bg-amber-100 transition">
                🏞️ Landscapes
              </button>
              <button onclick="zuriQuickMessage('What is Hakika ya Kienyeji?')" class="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs hover:bg-amber-100 transition">
                📜 Certificates
              </button>
              <button onclick="zuriQuickMessage('How do I buy art here?')" class="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs hover:bg-amber-100 transition">
                🛒 How to buy
              </button>
              <button onclick="zuriQuickMessage('Recommend something under 20000')" class="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs hover:bg-amber-100 transition">
                💰 Budget picks
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
            placeholder="Ask Zuri about art..."
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
        <p class="text-center text-xs text-gray-400 mt-2">AI-Powered · SANAA Kenya</p>
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
    
    // Focus input
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
  
  // Add to history
  zuriState.messages.push({ role: "user", content: message });

  // Show typing indicator
  zuriState.isLoading = true;
  const typingId = showTypingIndicator();
  
  // Disable send button
  const sendBtn = document.getElementById("zuri-send");
  if (sendBtn) sendBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/zuri/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        history: zuriState.messages.slice(-10), // Last 10 messages
      }),
    });

    const data = await response.json();
    
    // Remove typing indicator
    removeTypingIndicator(typingId);

    const reply = data.reply || "I couldn't process that. Please try again! 🎨";
    
    // Add assistant reply to UI
    addMessageToUI("assistant", reply);
    
    // Add to history
    zuriState.messages.push({ role: "assistant", content: reply });

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
function addMessageToUI(role, content) {
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
    // Format assistant message with markdown-like formatting
    const formatted = formatZuriMessage(content);
    
    messageDiv.innerHTML = `
      <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span class="text-sm">🎨</span>
      </div>
      <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
        <div class="text-sm text-gray-700 zuri-message">${formatted}</div>
      </div>
    `;
  }

  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

function formatZuriMessage(text) {
  // Convert markdown-like formatting to HTML
  let html = escapeHtml(text);
  
  // Bold: **text** → <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text* → <em>text</em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Bullet points: - item → • item
  html = html.replace(/^- (.+)$/gm, '<span class="block ml-2">• $1</span>');
  
  // Numbered lists: 1. item
  html = html.replace(/^(\d+)\. (.+)$/gm, '<span class="block ml-2">$1. $2</span>');
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="mt-2">');
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
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
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
// QUICK MESSAGES
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
  console.log("🎨 Zuri AI Assistant initialized");
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
`;
document.head.appendChild(style);