// js/admin-categories.js
// Category Management for Admin Dashboard

import { getAllCategories, createCategory, API_BASE_URL } from "./api.js";

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════
let categories = [];
let editingCategoryId = null;

// ══════════════════════════════════════════════════════════════════
// ELEMENTS
// ══════════════════════════════════════════════════════════════════
const categoryTableBody = document.getElementById("categories-table-body");
const categoryEmpty = document.getElementById("categories-empty");
const totalCategoriesEl = document.getElementById("total-categories");
const categoryModal = document.getElementById("category-modal");
const categoryForm = document.getElementById("category-form");
const categoryModalTitle = document.getElementById("category-modal-title");
const categoryIdInput = document.getElementById("category-id");
const categoryNameInput = document.getElementById("category-name");
const categoryDescInput = document.getElementById("category-description");
const categoryError = document.getElementById("category-error");
const categorySuccess = document.getElementById("category-success");
const saveCategoryBtn = document.getElementById("save-category-btn");
const saveCategoryText = document.getElementById("save-category-text");
const saveCategorySpinner = document.getElementById("save-category-spinner");
const bulkModal = document.getElementById("bulk-category-modal");

// ══════════════════════════════════════════════════════════════════
// LOAD CATEGORIES
// ══════════════════════════════════════════════════════════════════
async function loadCategories() {
  try {
    categories = await getAllCategories();
    renderCategories();
    updateStats();
  } catch (err) {
    console.error("Failed to load categories:", err);
    showCategoryError("Failed to load categories. Please refresh the page.");
  }
}

// ══════════════════════════════════════════════════════════════════
// RENDER CATEGORIES TABLE
// ══════════════════════════════════════════════════════════════════
function renderCategories() {
  if (!categoryTableBody) return;

  if (categories.length === 0) {
    categoryTableBody.innerHTML = "";
    if (categoryEmpty) categoryEmpty.classList.remove("hidden");
    return;
  }

  if (categoryEmpty) categoryEmpty.classList.add("hidden");

  categoryTableBody.innerHTML = categories.map(cat => `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="text-sm font-medium text-gray-900">#${cat.id}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="text-sm font-medium text-gray-900">${escapeHtml(cat.name)}</span>
        </div>
      </td>
      <td class="px-6 py-4">
        <span class="text-sm text-gray-600 line-clamp-2">${escapeHtml(cat.description || "No description")}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          ${cat.painting_count || 0} paintings
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center gap-2">
          <button 
            onclick="editCategory(${cat.id})" 
            class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button 
            onclick="deleteCategory(${cat.id}, '${escapeHtml(cat.name)}')" 
            class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ══════════════════════════════════════════════════════════════════
// UPDATE STATS
// ══════════════════════════════════════════════════════════════════
function updateStats() {
  if (totalCategoriesEl) {
    totalCategoriesEl.textContent = categories.length;
  }
}

// ══════════════════════════════════════════════════════════════════
// MODAL FUNCTIONS
// ══════════════════════════════════════════════════════════════════
window.openCategoryModal = function(categoryId = null) {
  editingCategoryId = categoryId;
  
  // Reset form
  categoryForm.reset();
  hideCategoryMessages();
  
  if (categoryId) {
    // Edit mode
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
      categoryModalTitle.textContent = "Edit Category";
      categoryIdInput.value = cat.id;
      categoryNameInput.value = cat.name;
      categoryDescInput.value = cat.description || "";
      saveCategoryText.textContent = "Update Category";
    }
  } else {
    // Create mode
    categoryModalTitle.textContent = "Add New Category";
    categoryIdInput.value = "";
    saveCategoryText.textContent = "Save Category";
  }
  
  categoryModal.classList.remove("hidden");
  categoryNameInput.focus();
};

window.closeCategoryModal = function() {
  categoryModal.classList.add("hidden");
  editingCategoryId = null;
  categoryForm.reset();
  hideCategoryMessages();
};

window.editCategory = function(categoryId) {
  openCategoryModal(categoryId);
};

// ══════════════════════════════════════════════════════════════════
// SAVE CATEGORY
// ══════════════════════════════════════════════════════════════════
window.saveCategory = async function() {
  const name = categoryNameInput.value.trim();
  const description = categoryDescInput.value.trim();
  
  if (!name) {
    showCategoryError("Category name is required.");
    return;
  }
  
  // Check for duplicate name
  const duplicate = categories.find(c => 
    c.name.toLowerCase() === name.toLowerCase() && c.id !== editingCategoryId
  );
  if (duplicate) {
    showCategoryError(`Category "${name}" already exists.`);
    return;
  }
  
  setLoading(true);
  hideCategoryMessages();
  
  const token = localStorage.getItem("auth_token");
  
  try {
    if (editingCategoryId) {
      // Update existing category
      const response = await fetch(`${API_BASE_URL}/categories/${editingCategoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, description })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || "Failed to update category");
      }
      
      showCategorySuccess("Category updated successfully!");
    } else {
      // Create new category
      await createCategory({ name, description }, token);
      showCategorySuccess("Category created successfully!");
    }
    
    // Reload categories and close modal
    await loadCategories();
    
    setTimeout(() => {
      closeCategoryModal();
    }, 1500);
    
  } catch (err) {
    console.error("Save category error:", err);
    showCategoryError(err.message || "Failed to save category.");
  } finally {
    setLoading(false);
  }
};

// ══════════════════════════════════════════════════════════════════
// DELETE CATEGORY
// ══════════════════════════════════════════════════════════════════
window.deleteCategory = async function(categoryId, categoryName) {
  const confirmed = confirm(`Are you sure you want to delete "${categoryName}"?\n\nThis action cannot be undone.`);
  
  if (!confirmed) return;
  
  const token = localStorage.getItem("auth_token");
  
  try {
    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.error || "Failed to delete category");
    }
    
    // Reload categories
    await loadCategories();
    
    // Show toast notification
    showToast(`Category "${categoryName}" deleted successfully.`, "success");
    
  } catch (err) {
    console.error("Delete category error:", err);
    showToast(err.message || "Failed to delete category.", "error");
  }
};

// ══════════════════════════════════════════════════════════════════
// QUICK TEMPLATE FILL
// ══════════════════════════════════════════════════════════════════
window.fillTemplate = function(name, description) {
  categoryNameInput.value = name;
  categoryDescInput.value = description;
};

// ══════════════════════════════════════════════════════════════════
// BULK CREATE CATEGORIES
// ══════════════════════════════════════════════════════════════════
window.openBulkModal = function() {
  bulkModal.classList.remove("hidden");
  document.getElementById("bulk-progress").classList.add("hidden");
  document.getElementById("bulk-result").classList.add("hidden");
};

window.closeBulkModal = function() {
  bulkModal.classList.add("hidden");
};

window.createBulkCategories = async function() {
  const allCategories = [
    { id: "landscape", name: "Landscape", description: "Kenyan landscapes, mountains, savannahs, and natural scenery" },
    { id: "wildlife", name: "Wildlife", description: "African wildlife, safari animals, and nature scenes" },
    { id: "portrait", name: "Portrait", description: "Portraits of people, cultural figures, and traditional subjects" },
    { id: "abstract", name: "Abstract", description: "Contemporary abstract art and modern expressions" },
    { id: "cultural", name: "Cultural", description: "Traditional Kenyan culture, ceremonies, and heritage" },
    { id: "urban", name: "Urban", description: "City life, street art, and urban landscapes" },
    { id: "coastal", name: "Coastal", description: "Beach scenes, ocean views, and coastal life" },
    { id: "figurative", name: "Figurative", description: "Human figures, movement, and form in artistic expression" },
    { id: "stilllife", name: "Still Life", description: "Arrangements of objects, fruits, flowers, and everyday items" },
    { id: "mixedmedia", name: "Mixed Media", description: "Artworks combining different materials and techniques" }
  ];
  
  // Get selected categories
  const selectedCategories = allCategories.filter(cat => {
    const checkbox = document.getElementById(`cat-${cat.id}`);
    return checkbox && checkbox.checked;
  });
  
  if (selectedCategories.length === 0) {
    alert("Please select at least one category.");
    return;
  }
  
  const token = localStorage.getItem("auth_token");
  const progressEl = document.getElementById("bulk-progress");
  const progressText = document.getElementById("bulk-progress-text");
  const progressBar = document.getElementById("bulk-progress-bar");
  const resultEl = document.getElementById("bulk-result");
  const createBtn = document.getElementById("bulk-create-btn");
  
  // Show progress
  progressEl.classList.remove("hidden");
  resultEl.classList.add("hidden");
  createBtn.disabled = true;
  
  let created = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < selectedCategories.length; i++) {
    const cat = selectedCategories[i];
    progressText.textContent = `Creating "${cat.name}"... (${i + 1}/${selectedCategories.length})`;
    progressBar.style.width = `${((i + 1) / selectedCategories.length) * 100}%`;
    
    // Check if already exists
    const exists = categories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
    if (exists) {
      skipped++;
      continue;
    }
    
    try {
      await createCategory({ name: cat.name, description: cat.description }, token);
      created++;
    } catch (err) {
      console.error(`Failed to create ${cat.name}:`, err);
      failed++;
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Show result
  progressEl.classList.add("hidden");
  resultEl.classList.remove("hidden");
  createBtn.disabled = false;
  
  let resultMessage = `✅ Created: ${created}`;
  if (skipped > 0) resultMessage += ` | ⏭️ Skipped (already exist): ${skipped}`;
  if (failed > 0) resultMessage += ` | ❌ Failed: ${failed}`;
  
  resultEl.className = `p-3 rounded-lg text-sm ${failed > 0 ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'}`;
  resultEl.textContent = resultMessage;
  
  // Reload categories
  await loadCategories();
  
  // Auto close after 3 seconds if all successful
  if (failed === 0) {
    setTimeout(() => {
      closeBulkModal();
    }, 3000);
  }
};

// ══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════
function setLoading(loading) {
  saveCategoryBtn.disabled = loading;
  saveCategorySpinner.classList.toggle("hidden", !loading);
  saveCategoryText.textContent = loading 
    ? (editingCategoryId ? "Updating..." : "Saving...") 
    : (editingCategoryId ? "Update Category" : "Save Category");
}

function showCategoryError(message) {
  categoryError.textContent = message;
  categoryError.classList.remove("hidden");
  categorySuccess.classList.add("hidden");
}

function showCategorySuccess(message) {
  categorySuccess.textContent = message;
  categorySuccess.classList.remove("hidden");
  categoryError.classList.add("hidden");
}

function hideCategoryMessages() {
  categoryError.classList.add("hidden");
  categorySuccess.classList.add("hidden");
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = "info") {
  // Create toast element
  const toast = document.createElement("div");
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
    type === "success" ? "bg-green-600 text-white" :
    type === "error" ? "bg-red-600 text-white" :
    "bg-gray-800 text-white"
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.transform = "translateY(100%)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ══════════════════════════════════════════════════════════════════
// INITIALIZE
// ══════════════════════════════════════════════════════════════════
export function initCategoryManagement() {
  loadCategories();
}

// Auto-initialize when categories section is shown
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on admin dashboard and categories section exists
  if (document.getElementById("categories-section")) {
    loadCategories();
  }
});

// Export for use in main admin dashboard
export { loadCategories };