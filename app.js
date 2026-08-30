// I CONNECT Mobile Shop Billing & Inventory Management System (Local Storage Database)

// --- Default SVG Icon Placeholders for Products (Red & White Theme) ---
const SVG_PHONE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
const SVG_AUDIO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`;
const SVG_CHARGER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="12" rx="2"></rect><line x1="9" y1="17" x2="9" y2="21"></line><line x1="15" y1="17" x2="15" y2="21"></line><path d="M12 2v3"></path></svg>`;
const SVG_CABLE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 13V5c0-1.1-.9-2-2-2H7C5.9 3 5 3.9 5 5v8m4 8h6M12 13v8"></path></svg>`;
const SVG_CASE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="2" ry="2"></rect><path d="M12 7v4m-2-2h4"></path></svg>`;
const SVG_SCREEN = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><path d="M8 6h8M8 18h8"></path></svg>`;

// --- Initial Demo/Seed Data ---
const DEMO_PRODUCTS = [
    { id: "P001", sku: "MPH001", name: "iPhone 15 Pro Max (256GB)", category: "Smartphones", price: 1199.00, stock: 15, minStock: 3, image: SVG_PHONE },
    { id: "P002", sku: "MPH002", name: "Samsung Galaxy S24 Ultra (256GB)", category: "Smartphones", price: 1299.00, stock: 12, minStock: 3, image: SVG_PHONE },
    { id: "P003", sku: "MPH003", name: "Google Pixel 8 Pro (128GB)", category: "Smartphones", price: 999.00, stock: 8, minStock: 2, image: SVG_PHONE },
    { id: "P004", sku: "ACC001", name: "Apple AirPods Pro (2nd Gen)", category: "Audio Accessories", price: 249.00, stock: 25, minStock: 5, image: SVG_AUDIO },
    { id: "P005", sku: "ACC002", name: "Sony WH-1000XM5 Wireless Headphones", category: "Audio Accessories", price: 349.00, stock: 10, minStock: 2, image: SVG_AUDIO },
    { id: "P006", sku: "CHG001", name: "Super Fast Charger Adapter (25W)", category: "Chargers", price: 19.99, stock: 50, minStock: 10, image: SVG_CHARGER },
    { id: "P007", sku: "CHG002", name: "Wireless Charging Pad (15W)", category: "Chargers", price: 29.99, stock: 30, minStock: 5, image: SVG_CHARGER },
    { id: "P008", sku: "CBL001", name: "Braided USB-C to USB-C Cable (2m)", category: "Cables", price: 14.99, stock: 60, minStock: 15, image: SVG_CABLE },
    { id: "P009", sku: "CAS001", name: "MagSafe Silicone Case for iPhone 15", category: "Cases & Covers", price: 39.99, stock: 40, minStock: 8, image: SVG_CASE },
    { id: "P010", sku: "SCR001", name: "Tempered Glass Screen Protector (iPhone/Samsung)", category: "Screen Protectors", price: 9.99, stock: 100, minStock: 20, image: SVG_SCREEN }
];

const DEMO_SALES = [];

// --- Core State Variables ---
let products = [];
let sales = [];
let cart = [];
let categories = [];
let activeTab = "dashboard";
let salesChart = null;

// --- Database Operations (REST Sync & Permissions) ---
let currentUser = null;

// Toggle Login / Signup forms
function toggleAuthForm(type) {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const errorBanner = document.getElementById("auth-error");
    
    errorBanner.classList.add("hidden");
    
    if (type === "signup") {
        loginForm.classList.add("hidden");
        signupForm.classList.remove("hidden");
    } else {
        signupForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
    }
}

let syncInterval = null;

// Start auto synchronization polling
function startAutoSync() {
    stopAutoSync();
    // Poll the server every 5 seconds for updates
    syncInterval = setInterval(() => {
        if (currentUser) {
            fetchSyncedDataSilent();
        }
    }, 5000);
}

// Stop auto synchronization polling
function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Quietly check for data updates from the server
function fetchSyncedDataSilent() {
    if (!currentUser) return;
    
    fetch('/api/sync/get', {
        method: 'GET',
        headers: {
            'x-user-email': currentUser.email,
            'X-Pinggy-No-Screen': 'true'
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("Sync failed");
        return res.json();
    })
    .then(data => {
        // Compare structure to see if any updates occurred
        const productsChanged = JSON.stringify(data.products || []) !== JSON.stringify(products);
        const categoriesChanged = JSON.stringify(data.categories || []) !== JSON.stringify(categories);
        const salesChanged = JSON.stringify(data.sales || []) !== JSON.stringify(sales);
        
        if (productsChanged || categoriesChanged || salesChanged) {
            // Verify user is not typing to avoid focus-hijack
            const activeEl = document.activeElement;
            const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA');
            
            // Also check if critical modals are open
            const isAddModalOpen = !document.getElementById("add-product-modal").classList.contains("hidden");
            const isEditModalOpen = !document.getElementById("edit-product-modal").classList.contains("hidden");
            const isCategoryModalOpen = !document.getElementById("manage-categories-modal").classList.contains("hidden");
            
            if (!isTyping && !isAddModalOpen && !isEditModalOpen && !isCategoryModalOpen) {
                products = data.products || [];
                categories = data.categories || [];
                sales = data.sales || [];
                
                initApp();
                console.log("App data updated in real-time.");
            }
        }
    })
    .catch(err => {
        // Silently catch network drops to avoid UI error popups
    });
}

// Check auth state on start
function checkAuth() {
    const email = localStorage.getItem("iconnect_user_email");
    const name = localStorage.getItem("iconnect_user_name");
    
    if (email && name) {
        currentUser = { email, name };
        document.getElementById("user-display-name").innerText = `Welcome, ${name}`;
        document.getElementById("auth-screen").classList.add("hidden");
        
        // Load data from server and start auto sync
        loadSyncedData();
        startAutoSync();
    } else {
        document.getElementById("auth-screen").classList.remove("hidden");
    }
}

// Fetch synced data from server
function loadSyncedData() {
    if (!currentUser) return;
    
    fetch('/api/sync/get', {
        method: 'GET',
        headers: {
            'x-user-email': currentUser.email,
            'X-Pinggy-No-Screen': 'true'
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("Sync failed");
        return res.json();
    })
    .then(data => {
        // If server data is empty, seed it with defaults
        if (!data.products || data.products.length === 0) {
            products = [...DEMO_PRODUCTS];
            categories = [...new Set(DEMO_PRODUCTS.map(p => p.category))];
            sales = [];
            saveSyncedData(); // Upload seeded defaults
        } else {
            products = data.products || [];
            categories = data.categories || [];
            sales = data.sales || [];
        }
        initApp();
    })
    .catch(err => {
        console.warn("Offline fallback: Loading local storage data.", err);
        loadLocalFallback();
    });
}

// Send synced data back to server
function saveSyncedData() {
    if (!currentUser) {
        saveLocalFallback();
        return;
    }
    
    // Save locally as fallback
    saveLocalFallback();
    
    fetch('/api/sync/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
            'X-Pinggy-No-Screen': 'true'
        },
        body: JSON.stringify({ products, categories, sales })
    })
    .then(res => {
        if (!res.ok) console.warn("Failed to sync updates to server.");
    })
    .catch(err => console.warn("Connection lost. Data saved locally.", err));
}

// Local fallback database operations (keeps working offline)
function loadLocalFallback() {
    const localProducts = localStorage.getItem("iconnect_products_v4");
    const localSales = localStorage.getItem("iconnect_sales_v4");
    const localCategories = localStorage.getItem("iconnect_categories_v4");

    if (localProducts) {
        products = JSON.parse(localProducts);
    } else {
        products = [...DEMO_PRODUCTS];
        localStorage.setItem("iconnect_products_v4", JSON.stringify(products));
    }

    if (localSales) {
        sales = JSON.parse(localSales);
    } else {
        sales = [...DEMO_SALES];
        localStorage.setItem("iconnect_sales_v4", JSON.stringify(sales));
    }

    if (localCategories) {
        categories = JSON.parse(localCategories);
    } else {
        categories = [...new Set(DEMO_PRODUCTS.map(p => p.category))];
        localStorage.setItem("iconnect_categories_v4", JSON.stringify(categories));
    }
    initApp();
}

function saveLocalFallback() {
    localStorage.setItem("iconnect_products_v4", JSON.stringify(products));
    localStorage.setItem("iconnect_sales_v4", JSON.stringify(sales));
    localStorage.setItem("iconnect_categories_v4", JSON.stringify(categories));
}

function saveProducts() {
    saveSyncedData();
}

function saveSales() {
    saveSyncedData();
}

function saveCategories() {
    saveSyncedData();
}

// Log Out User
function logoutUser() {
    if (confirm("Are you sure you want to log out from I CONNECT?")) {
        localStorage.removeItem("iconnect_user_email");
        localStorage.removeItem("iconnect_user_name");
        currentUser = null;
        stopAutoSync();
        
        // Reset local memory
        products = [];
        categories = [];
        sales = [];
        cart = [];
        
        // Show auth screen and hide app content
        document.getElementById("auth-screen").classList.remove("hidden");
        document.getElementById("login-form").reset();
        document.getElementById("signup-form").reset();
        toggleAuthForm("login");
    }
}

// Setup Auth form listeners
function setupAuthListeners() {
    // Login Form Submit
    document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        const errorBanner = document.getElementById("auth-error");
        
        errorBanner.classList.add("hidden");
        
        fetch('/api/auth/login', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Pinggy-No-Screen': 'true'
            },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                errorBanner.innerText = data.error;
                errorBanner.classList.remove("hidden");
            } else {
                localStorage.setItem("iconnect_user_email", data.email);
                localStorage.setItem("iconnect_user_name", data.name);
                checkAuth();
            }
        })
        .catch(err => {
            errorBanner.innerText = "Connection error. Cannot log in.";
            errorBanner.classList.remove("hidden");
        });
    });

    // Signup Form Submit
    document.getElementById("signup-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("signup-name").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value;
        const errorBanner = document.getElementById("auth-error");
        
        errorBanner.classList.add("hidden");
        
        fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Pinggy-No-Screen': 'true'
            },
            body: JSON.stringify({ name, email, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                errorBanner.innerText = data.error;
                errorBanner.classList.remove("hidden");
            } else {
                // Auto login on successful register
                localStorage.setItem("iconnect_user_email", data.email);
                localStorage.setItem("iconnect_user_name", data.name);
                checkAuth();
            }
        })
        .catch(err => {
            errorBanner.innerText = "Connection error. Cannot register.";
            errorBanner.classList.remove("hidden");
        });
    });
}

// --- App Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    setupAuthListeners();
    checkAuth();
    setupEventListeners();
    switchTab("dashboard");
    
    // Register Service Worker to automatically bypass Pinggy warning page on subsequent visits
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Pinggy Warning Bypass Service Worker registered.'))
            .catch(err => console.warn('Service Worker registration failed:', err));
    }
});

function initApp() {
    renderDashboard();
    populateCategoryDropdowns();
    renderProductsTable();
    populateBillingProductSelect();
    renderCart();
    renderSalesHistory();
}

// --- Tab Switching ---
function switchTab(tabId) {
    activeTab = tabId;
    
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    
    // Show active tab
    document.getElementById(`${tabId}-tab`).classList.remove("hidden");
    
    // Update navigation styles
    document.querySelectorAll(".nav-link").forEach(link => {
        if (link.getAttribute("data-tab") === tabId) {
            link.className = "nav-link flex items-center p-3 my-1 nav-link-active transition-colors duration-200";
        } else {
            link.className = "nav-link flex items-center p-3 my-1 nav-link-inactive rounded-lg transition-colors duration-200";
        }
    });

    // Refresh content for tabs that display dynamic database status
    if (tabId === "dashboard") {
        renderDashboard();
    } else if (tabId === "products") {
        renderProductsTable();
    } else if (tabId === "billing") {
        populateBillingProductSelect();
        renderCart();
    } else if (tabId === "sales-history") {
        renderSalesHistory();
    }
}

// --- Dashboard Logic ---
function renderDashboard() {
    const totalSalesAmount = sales.reduce((acc, sale) => acc + sale.total, 0);
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    const totalProductsCount = products.length;
    const transactionsCount = sales.length;

    // Update Counter Widgets
    document.getElementById("dash-total-sales").innerText = `₹${totalSalesAmount.toFixed(2)}`;
    document.getElementById("dash-total-products").innerText = totalProductsCount;
    document.getElementById("dash-transactions").innerText = transactionsCount;
    
    const lowStockEl = document.getElementById("dash-low-stock");
    lowStockEl.innerText = lowStockCount;
    if (lowStockCount > 0) {
        lowStockEl.parentElement.parentElement.classList.remove("bg-white");
        lowStockEl.parentElement.parentElement.classList.add("bg-red-50", "border-red-200");
    } else {
        lowStockEl.parentElement.parentElement.classList.remove("bg-red-50", "border-red-200");
        lowStockEl.parentElement.parentElement.classList.add("bg-white");
    }

    // Render Recent Transactions
    const recentSalesContainer = document.getElementById("dash-recent-sales");
    recentSalesContainer.innerHTML = "";
    
    const recentSales = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    if (recentSales.length === 0) {
        recentSalesContainer.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">No transactions recorded yet.</td></tr>`;
    } else {
        recentSales.forEach(sale => {
            const formattedDate = new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
            recentSalesContainer.innerHTML += `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-6 py-3 text-sm font-semibold text-gray-900">${sale.invoiceNo}</td>
                    <td class="px-6 py-3 text-sm text-gray-600">${formattedDate}</td>
                    <td class="px-6 py-3 text-sm text-gray-600">${sale.customerName || 'Walk-in Customer'}</td>
                    <td class="px-6 py-3 text-sm text-gray-600">${sale.items.length} items</td>
                    <td class="px-6 py-3 text-sm font-semibold text-green-600">₹${sale.total.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    // Initialize/Update Charts
    renderSalesAnalyticsChart();
}

function renderSalesAnalyticsChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    // Group sales by date for the last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toDateString());
    }

    const salesByDay = {};
    last7Days.forEach(day => { salesByDay[day] = 0; });

    sales.forEach(sale => {
        const saleDay = new Date(sale.date).toDateString();
        if (saleDay in salesByDay) {
            salesByDay[saleDay] += sale.total;
        }
    });

    const chartLabels = last7Days.map(day => {
        const parts = day.split(' ');
        return `${parts[1]} ${parts[2]}`; // "Aug 18"
    });
    const chartData = last7Days.map(day => salesByDay[day]);

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Sales Revenue (₹)',
                data: chartData,
                borderColor: '#d32f2f',
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return '₹' + value; }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// --- Product Management Logic ---
let productSearchQuery = "";
let productCategoryFilter = "";

function renderProductsTable() {
    const tbody = document.getElementById("products-table-body");
    tbody.innerHTML = "";

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || 
                              p.sku.includes(productSearchQuery) || 
                              p.id.toLowerCase().includes(productSearchQuery.toLowerCase());
        const matchesCategory = productCategoryFilter === "" || p.category === productCategoryFilter;
        return matchesSearch && matchesCategory;
    });



    if (filteredProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-gray-500">No products found matching filters.</td></tr>`;
        return;
    }

    filteredProducts.forEach(p => {
        const isLowStock = p.stock <= p.minStock;
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 ${isLowStock ? 'bg-red-50/30' : ''}">
                <td class="px-6 py-4 text-sm">
                    <img src="${p.image || 'https://placehold.co/100x100?text=No+Photo'}" class="w-10 h-10 object-cover rounded-full border bg-white shadow-sm">
                </td>
                <td class="px-6 py-4 text-sm font-semibold text-gray-900">${p.id}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${p.sku}</td>
                <td class="px-6 py-4 text-sm font-medium text-gray-800">${p.name}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${p.category}</td>
                <td class="px-6 py-4 text-sm font-semibold text-gray-800">₹${p.price.toFixed(2)}</td>
                <td class="px-6 py-4 text-sm">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${isLowStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                        ${p.stock} units
                    </span>
                    ${isLowStock ? `<p class="text-[10px] text-red-600 font-semibold mt-1">Reorder Level: ${p.minStock}</p>` : ''}
                </td>
                <td class="px-6 py-4 text-sm font-medium text-right no-print">
                    <button onclick="openEditProductModal('${p.id}')" class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

function deleteProduct(id) {
    if (confirm("Are you sure you want to delete this product?")) {
        products = products.filter(p => p.id !== id);
        saveProducts();
        renderProductsTable();
        populateBillingProductSelect();
    }
}

// Get Category Default SVG
function getDefaultImageByCategory(category) {
    const cat = (category || "").toLowerCase();
    if (cat.includes("phone")) return SVG_PHONE;
    if (cat.includes("audio") || cat.includes("head") || cat.includes("ear")) return SVG_AUDIO;
    if (cat.includes("charger")) return SVG_CHARGER;
    if (cat.includes("cable")) return SVG_CABLE;
    if (cat.includes("case") || cat.includes("cover")) return SVG_CASE;
    if (cat.includes("screen") || cat.includes("guard") || cat.includes("protector")) return SVG_SCREEN;
    return "https://placehold.co/100x100?text=No+Photo";
}

// Add Product Submit
document.getElementById("add-product-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = "P" + String(products.length + 1).padStart(3, "0");
    const sku = document.getElementById("add-p-sku").value.trim();
    const name = document.getElementById("add-p-name").value.trim();
    const category = document.getElementById("add-p-category").value.trim();
    const price = parseFloat(document.getElementById("add-p-price").value);
    const stock = parseInt(document.getElementById("add-p-stock").value);
    const minStock = parseInt(document.getElementById("add-p-minstock").value);

    // SKU uniqueness check
    if (products.some(p => p.sku === sku)) {
        alert("SKU already exists. Please use a unique barcode/SKU.");
        return;
    }

    const previewImg = document.getElementById("add-p-image-preview").src;
    let image = previewImg;
    if (previewImg.includes("placehold.co")) {
        image = getDefaultImageByCategory(category);
    }

    products.push({ id, sku, name, category, price, stock, minStock, image });
    saveProducts();
    
    // Close modal & reset form
    closeModal("add-product-modal");
    document.getElementById("add-product-form").reset();
    clearImagePreview('add-p-image-input', 'add-p-image-preview');
    
    renderProductsTable();
    populateBillingProductSelect();
});

// Edit Product Details
let currentEditId = null;

function openEditProductModal(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    currentEditId = id;
    document.getElementById("edit-p-id").value = product.id;
    document.getElementById("edit-p-sku").value = product.sku;
    document.getElementById("edit-p-name").value = product.name;
    document.getElementById("edit-p-category").value = product.category;
    document.getElementById("edit-p-price").value = product.price;
    document.getElementById("edit-p-stock").value = product.stock;
    document.getElementById("edit-p-minstock").value = product.minStock;
    document.getElementById("edit-p-image-preview").src = product.image || "https://placehold.co/100x100?text=No+Photo";

    openModal("edit-product-modal");
}

document.getElementById("edit-product-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const index = products.findIndex(p => p.id === currentEditId);
    if (index === -1) return;

    const sku = document.getElementById("edit-p-sku").value.trim();

    // Check SKU uniqueness ignoring itself
    if (products.some(p => p.sku === sku && p.id !== currentEditId)) {
        alert("SKU already exists on another product. Please use a unique barcode/SKU.");
        return;
    }

    products[index].sku = sku;
    products[index].name = document.getElementById("edit-p-name").value.trim();
    products[index].category = document.getElementById("edit-p-category").value.trim();
    products[index].price = parseFloat(document.getElementById("edit-p-price").value);
    products[index].stock = parseInt(document.getElementById("edit-p-stock").value);
    products[index].minStock = parseInt(document.getElementById("edit-p-minstock").value);

    const previewImg = document.getElementById("edit-p-image-preview").src;
    let image = previewImg;
    if (previewImg.includes("placehold.co")) {
        image = getDefaultImageByCategory(products[index].category);
    }
    products[index].image = image;

    saveProducts();
    closeModal("edit-product-modal");
    document.getElementById("edit-p-image-input").value = "";
    
    renderProductsTable();
    populateBillingProductSelect();
});

// --- Billing/Invoicing System ---
function populateBillingProductSelect() {
    const select = document.getElementById("billing-product-select");
    select.innerHTML = '<option value="">-- Choose Product --</option>';
    
    // Sort products by name
    const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
    
    sorted.forEach(p => {
        const outOfStock = p.stock <= 0;
        select.innerHTML += `
            <option value="${p.id}" ${outOfStock ? 'disabled' : ''}>
                ${p.name} (SKU: ${p.sku}) - ₹${p.price.toFixed(2)} ${outOfStock ? '[OUT OF STOCK]' : `(${p.stock} left)`}
            </option>
        `;
    });
}

// Show details of the currently selected/scanned product
function showProductPreview(product) {
    const previewEl = document.getElementById("selected-product-preview");
    if (!previewEl) return;

    document.getElementById("preview-prod-img").src = product.image || "https://placehold.co/100x100?text=No+Photo";
    document.getElementById("preview-prod-name").innerText = product.name;
    document.getElementById("preview-prod-sku").innerText = product.sku;
    document.getElementById("preview-prod-cat").innerText = product.category;
    document.getElementById("preview-prod-price").innerText = `₹${product.price.toFixed(2)}`;
    document.getElementById("preview-prod-stock").innerText = product.stock;

    previewEl.classList.remove("hidden");
    previewEl.classList.add("flex");
}

// Add Item to Bill Cart
function addToCart(productId, qty = 1) {
    if (!productId) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
        alert("Product is out of stock!");
        return;
    }

    const cartItem = cart.find(item => item.product.id === productId);
    if (cartItem) {
        if (cartItem.quantity + qty > product.stock) {
            alert(`Insufficient stock. Only ${product.stock} units available.`);
            return;
        }
        cartItem.quantity += qty;
    } else {
        if (qty > product.stock) {
            alert(`Insufficient stock. Only ${product.stock} units available.`);
            return;
        }
        cart.push({ product, quantity: qty });
    }

    showProductPreview(product);
    renderCart();
}

// Handle Barcode/SKU scan or enter
document.getElementById("billing-sku-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const skuVal = e.target.value.trim();
        if (skuVal) {
            const product = products.find(p => p.sku === skuVal);
            if (product) {
                addToCart(product.id, 1);
                e.target.value = "";
            } else {
                alert(`Product with SKU "${skuVal}" not found.`);
            }
        }
    }
});

function updateCartQty(productId, newQty) {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(item => item.product.id === productId);
    
    if (!cartItem) return;

    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQty > product.stock) {
        alert(`Insufficient stock. Only ${product.stock} units available.`);
        cartItem.quantity = product.stock;
    } else {
        cartItem.quantity = newQty;
    }
    
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.product.id !== productId);
    renderCart();
}

function clearCart() {
    cart = [];
    renderCart();
}

function renderCart() {
    const tbody = document.getElementById("cart-table-body");
    tbody.innerHTML = "";

    if (cart.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-gray-500">Cart is empty. Search products above or enter SKU to add items.</td></tr>`;
        updateCartSummary();
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.product.price * item.quantity;
        tbody.innerHTML += `
            <tr class="border-b">
                <td class="px-4 py-3 text-sm flex items-center space-x-3">
                    <img src="${item.product.image || 'https://placehold.co/100x100?text=No+Photo'}" class="w-10 h-10 object-cover rounded border bg-white shadow-sm flex-shrink-0">
                    <div>
                        <span class="font-medium text-gray-900">${item.product.name}</span>
                        <p class="text-xs text-gray-500">SKU: ${item.product.sku}</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">₹${item.product.price.toFixed(2)}</td>
                <td class="px-4 py-3 text-sm">
                    <div class="flex items-center space-x-1">
                        <button onclick="updateCartQty('${item.product.id}', ${item.quantity - 1})" class="px-2 py-0.5 border bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">-</button>
                        <input type="number" min="1" max="${item.product.stock}" value="${item.quantity}" 
                            onchange="updateCartQty('${item.product.id}', parseInt(this.value))" 
                            class="w-12 text-center border rounded py-0.5 text-sm">
                        <button onclick="updateCartQty('${item.product.id}', ${item.quantity + 1})" class="px-2 py-0.5 border bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">+</button>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm font-semibold text-gray-800">₹${itemTotal.toFixed(2)}</td>
                <td class="px-4 py-3 text-sm text-right">
                    <button onclick="removeFromCart('${item.product.id}')" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    updateCartSummary();
}

function updateCartSummary() {
    const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const discountVal = parseFloat(document.getElementById("billing-discount").value) || 0;
    const taxRate = parseFloat(document.getElementById("billing-tax-rate").value) || 0;

    const discountAmount = discountVal; // Direct flat cash discount
    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = subtotalAfterDiscount * (taxRate / 100);
    const total = subtotalAfterDiscount + taxAmount;

    document.getElementById("bill-subtotal").innerText = `₹${subtotal.toFixed(2)}`;
    document.getElementById("bill-discount-amount").innerText = `-₹${discountAmount.toFixed(2)}`;
    document.getElementById("bill-tax-amount").innerText = `₹${taxAmount.toFixed(2)}`;
    document.getElementById("bill-total").innerText = `₹${total.toFixed(2)}`;
}

// Generate Invoice / Complete Checkout
function processCheckout() {
    if (cart.length === 0) {
        alert("Cannot generate invoice. Cart is empty.");
        return;
    }

    const customerName = document.getElementById("customer-name").value.trim() || "Walk-in Customer";
    const customerPhone = document.getElementById("customer-phone").value.trim() || "N/A";
    
    const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById("billing-discount").value) || 0;
    const taxRate = parseFloat(document.getElementById("billing-tax-rate").value) || 0;
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);
    const tax = subtotalAfterDiscount * (taxRate / 100);
    const total = subtotalAfterDiscount + tax;

    const invoiceNo = "INV-" + (1000 + sales.length + 1);
    
    // Construct Sale record
    const saleItems = cart.map(item => ({
        id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        total: item.product.price * item.quantity
    }));

    const newSale = {
        id: invoiceNo,
        invoiceNo,
        date: new Date().toISOString(),
        customerName,
        customerPhone,
        items: saleItems,
        subtotal,
        discount,
        tax,
        total
    };

    // 1. Deduct Stock Levels in local memory
    cart.forEach(item => {
        const prod = products.find(p => p.id === item.product.id);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - item.quantity);
        }
    });

    // 2. Save product updates & sale record
    sales.push(newSale);
    saveSales();
    saveProducts();

    // 3. Clear cart and billing form inputs
    cart = [];
    document.getElementById("customer-name").value = "";
    document.getElementById("customer-phone").value = "";
    document.getElementById("billing-discount").value = "0";
    document.getElementById("billing-tax-rate").value = "5"; // Reset default tax

    // 4. Update UI screens
    initApp();

    // 5. Open invoice dialog printable modal
    openInvoiceModal(newSale);
}

// Invoice Printable Preview Modal
function openInvoiceModal(sale) {
    document.getElementById("invoice-no").innerText = sale.invoiceNo;
    document.getElementById("invoice-date").innerText = new Date(sale.date).toLocaleString();
    document.getElementById("invoice-customer-name").innerText = sale.customerName;
    document.getElementById("invoice-customer-phone").innerText = sale.customerPhone;

    const itemsContainer = document.getElementById("invoice-items");
    itemsContainer.innerHTML = "";
    sale.items.forEach(item => {
        itemsContainer.innerHTML += `
            <tr class="border-b text-sm">
                <td class="py-2 text-gray-800">${item.name} <span class="text-xs text-gray-500 font-normal">(${item.sku})</span></td>
                <td class="py-2 text-center text-gray-600">${item.quantity}</td>
                <td class="py-2 text-right text-gray-600">₹${item.price.toFixed(2)}</td>
                <td class="py-2 text-right font-medium text-gray-800">₹${item.total.toFixed(2)}</td>
            </tr>
        `;
    });

    document.getElementById("invoice-subtotal").innerText = `₹${sale.subtotal.toFixed(2)}`;
    document.getElementById("invoice-discount").innerText = `-₹${sale.discount.toFixed(2)}`;
    document.getElementById("invoice-tax").innerText = `₹${sale.tax.toFixed(2)}`;
    document.getElementById("invoice-total").innerText = `₹${sale.total.toFixed(2)}`;

    openModal("print-invoice-modal");
}

function printReceipt() {
    window.print();
}

// --- Sales History ---
let salesSearchQuery = "";

function renderSalesHistory() {
    const tbody = document.getElementById("sales-history-body");
    tbody.innerHTML = "";

    const filteredSales = sales.filter(sale => {
        return sale.invoiceNo.toLowerCase().includes(salesSearchQuery.toLowerCase()) || 
               sale.customerName.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
               sale.customerPhone.includes(salesSearchQuery);
    });

    // Sort: newest sales first
    const sortedSales = [...filteredSales].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedSales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No invoices match your search.</td></tr>`;
        return;
    }

    sortedSales.forEach(sale => {
        const formattedDate = new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-semibold text-gray-900">${sale.invoiceNo}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${formattedDate}</td>
                <td class="px-6 py-4 text-sm text-gray-800 font-medium">${sale.customerName}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${sale.customerPhone}</td>
                <td class="px-6 py-4 text-sm font-semibold text-gray-900">₹${sale.total.toFixed(2)}</td>
                <td class="px-6 py-4 text-sm text-right no-print">
                    <button onclick="viewInvoiceFromHistory('${sale.id}')" class="theme-red-text hover:text-red-900 font-medium">
                        <i class="fas fa-eye mr-1"></i> View & Print
                    </button>
                </td>
            </tr>
        `;
    });
}

function viewInvoiceFromHistory(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
        openInvoiceModal(sale);
    }
}

function clearSalesHistory() {
    if (confirm("Are you sure you want to delete all sales invoices? This action cannot be undone.")) {
        sales = [];
        saveSales();
        renderSalesHistory();
        renderDashboard(); // Reset the dashboard chart & stats cards
        alert("Sales history has been cleared.");
    }
}

// --- General UI Modal Handlers ---
function openModal(modalId) {
    document.getElementById(modalId).classList.remove("hidden");
    document.getElementById(modalId).classList.add("flex");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("flex");
    document.getElementById(modalId).classList.add("hidden");
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Navigation Tabs clicks
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = link.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    // Product search inputs
    document.getElementById("product-search-input").addEventListener("input", (e) => {
        productSearchQuery = e.target.value;
        renderProductsTable();
    });

    document.getElementById("product-filter-category").addEventListener("change", (e) => {
        productCategoryFilter = e.target.value;
        renderProductsTable();
    });

    // Billing inputs
    document.getElementById("billing-product-select").addEventListener("change", (e) => {
        const prodId = e.target.value;
        if (prodId) {
            addToCart(prodId, 1);
            e.target.value = ""; // Reset selection dropdown
        }
    });

    document.getElementById("billing-discount").addEventListener("input", updateCartSummary);
    document.getElementById("billing-tax-rate").addEventListener("input", updateCartSummary);

    // Sales History search
    document.getElementById("sales-search-input").addEventListener("input", (e) => {
        salesSearchQuery = e.target.value;
        renderSalesHistory();
    });

    // General window clicking checks to close modals
    window.addEventListener("click", (e) => {
        const modals = ["add-product-modal", "edit-product-modal", "print-invoice-modal", "manage-categories-modal"];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (e.target === modal) {
                closeModal(modalId);
            }
        });
    });
}

// --- Category Management Logic ---

// Populate all selects and filters in the application
function populateCategoryDropdowns() {
    // 1. Inventory page filter
    const filterSelect = document.getElementById("product-filter-category");
    if (filterSelect) {
        const currentFilterVal = filterSelect.value;
        filterSelect.innerHTML = `<option value="">All Categories</option>`;
        categories.forEach(cat => {
            filterSelect.innerHTML += `<option value="${cat}" ${cat === currentFilterVal ? 'selected' : ''}>${cat}</option>`;
        });
    }

    // 2. Add product modal category select
    const addSelect = document.getElementById("add-p-category");
    if (addSelect) {
        addSelect.innerHTML = '';
        categories.forEach(cat => {
            addSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    // 3. Edit product modal category select
    const editSelect = document.getElementById("edit-p-category");
    if (editSelect) {
        const currentEditVal = editSelect.value;
        editSelect.innerHTML = '';
        categories.forEach(cat => {
            editSelect.innerHTML += `<option value="${cat}" ${cat === currentEditVal ? 'selected' : ''}>${cat}</option>`;
        });
    }
}

// Open Categories Modal and Render List
function openManageCategoriesModal() {
    // Close other modals if open (in case they clicked "+ Create Category" from Add/Edit product modal)
    closeModal("add-product-modal");
    closeModal("edit-product-modal");
    
    renderCategoriesList();
    openModal("manage-categories-modal");
}

function renderCategoriesList() {
    const tbody = document.getElementById("categories-list-body");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="px-4 py-4 text-center text-gray-500">No categories found. Add one above.</td></tr>`;
        return;
    }
    
    categories.forEach(cat => {
        // Count products under this category
        const productCount = products.filter(p => p.category === cat).length;
        
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3 flex justify-between items-center">
                    <div>
                        <span class="font-medium text-gray-800">${cat}</span>
                        <span class="text-xs text-gray-400 ml-2">(${productCount} items)</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button type="button" onclick="renameCategory('${cat}')" class="text-blue-600 hover:text-blue-900 text-xs font-semibold">
                        Rename
                    </button>
                    <button type="button" onclick="deleteCategory('${cat}')" class="text-red-600 hover:text-red-900 text-xs font-semibold">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

// Add Category Form Handler
document.getElementById("add-category-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("new-category-name");
    const newCat = input.value.trim();
    
    if (!newCat) return;
    
    if (categories.some(c => c.toLowerCase() === newCat.toLowerCase())) {
        alert("This category already exists!");
        return;
    }
    
    categories.push(newCat);
    saveCategories();
    input.value = "";
    
    renderCategoriesList();
    populateCategoryDropdowns();
});

// Rename Category
function renameCategory(oldName) {
    const newName = prompt(`Enter new name for category "${oldName}":`, oldName);
    if (!newName) return;
    
    const trimmed = newName.trim();
    if (trimmed === "" || trimmed === oldName) return;
    
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== oldName)) {
        alert("This category name already exists!");
        return;
    }
    
    // 1. Rename in categories array
    const idx = categories.indexOf(oldName);
    if (idx !== -1) {
        categories[idx] = trimmed;
    }
    
    // 2. Cascade rename to all products under this category
    products.forEach(p => {
        if (p.category === oldName) {
            p.category = trimmed;
        }
    });
    
    saveCategories();
    saveProducts();
    
    // 3. Refresh dropdowns and tables
    renderCategoriesList();
    populateCategoryDropdowns();
    renderProductsTable();
}

// Delete Category
function deleteCategory(catName) {
    const productCount = products.filter(p => p.category === catName).length;
    
    if (productCount > 0) {
        alert(`Cannot delete category "${catName}". It is currently in use by ${productCount} products.\n\nPlease assign those products to a different category or delete them first.`);
        return;
    }
    
    if (confirm(`Are you sure you want to delete the category "${catName}"?`)) {
        categories = categories.filter(c => c !== catName);
        saveCategories();
        
        renderCategoriesList();
        populateCategoryDropdowns();
    }
}

// --- Image Utilities (Preview, Compression, Canvas Resizing & Permissions) ---

let pendingFileInputId = null;

// Ask for gallery permission before clicking input
function requestGalleryPermission(inputId) {
    if (sessionStorage.getItem("gallery_permission_granted") === "true") {
        document.getElementById(inputId).click();
    } else {
        pendingFileInputId = inputId;
        openModal("gallery-permission-modal");
    }
}

// User allowed gallery permission
function approveGalleryPermission() {
    sessionStorage.setItem("gallery_permission_granted", "true");
    closeModal("gallery-permission-modal");
    if (pendingFileInputId) {
        document.getElementById(pendingFileInputId).click();
        pendingFileInputId = null;
    }
}

// User denied gallery permission
function denyGalleryPermission() {
    closeModal("gallery-permission-modal");
    pendingFileInputId = null;
    alert("Gallery permission denied. Standard category graphic icon will be used instead.");
}

// Show image preview when selected in file picker
function previewImage(input, previewId) {
    const file = input.files[0];
    if (file) {
        compressImage(file, (base64Str) => {
            const previewImg = document.getElementById(previewId);
            if (previewImg) {
                previewImg.src = base64Str;
            }
        });
    }
}

// Clear selected image and reset preview placeholder
function clearImagePreview(inputId, previewId) {
    const fileInput = document.getElementById(inputId);
    if (fileInput) fileInput.value = "";
    
    const previewImg = document.getElementById(previewId);
    if (previewImg) {
        previewImg.src = "https://placehold.co/100x100?text=No+Photo";
    }
}

// Downscale and compress image to keep localStorage footprint minimal
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 120;
            const MAX_HEIGHT = 120;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG at 70% quality for optimal size
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(dataUrl);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}
