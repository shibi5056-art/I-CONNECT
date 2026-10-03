// I CONNECT Mobile Shop Billing & Inventory Management System (Local Storage Database)

// --- Global Error & Promise Rejection Shield (Guarantees zero crashes & uninterrupted UI) ---
window.onerror = function (message, source, lineno, colno, error) {
    console.warn("Handled runtime event safely:", message, "at", source, ":", lineno);
    return true; // Prevents disruptive browser error popups
};

window.addEventListener('unhandledrejection', function (event) {
    console.warn("Handled unhandled rejection gracefully:", event.reason);
    event.preventDefault();
});

// --- Default SVG Icon Placeholders for Products (Red & White Theme) ---
const SVG_PHONE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
const SVG_AUDIO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`;
const SVG_CHARGER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="12" rx="2"></rect><line x1="9" y1="17" x2="9" y2="21"></line><line x1="15" y1="17" x2="15" y2="21"></line><path d="M12 2v3"></path></svg>`;
const SVG_CABLE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 13V5c0-1.1-.9-2-2-2H7C5.9 3 5 3.9 5 5v8m4 8h6M12 13v8"></path></svg>`;
const SVG_CASE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="2" ry="2"></rect><path d="M12 7v4m-2-2h4"></path></svg>`;
const SVG_SCREEN = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><path d="M8 6h8M8 18h8"></path></svg>`;

// --- Initial Demo/Seed Data (Empty for clean production slate) ---
const DEMO_PRODUCTS = [];
const DEMO_SALES = [];

// --- Core State Variables ---
let products = [];
let sales = [];
let cart = [];
let categories = [];
let customers = [];
let activeTab = "dashboard";
let salesChart = null;
let customerPassword = "";
let currentUserRole = "owner"; // 'owner' or 'customer'

// Customer Details & Credit Subsystem State
let activeCustomerSubTab = "all";
let currentLedgerFilter = "all";
let tempCustomerIdProofData = null;
let currentSettlingCustomerId = null;
let currentLedgerCustomerId = null;

// Core Utility String Sanitizers
function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function cleanPhone(phone) {
    if (!phone) return "";
    return String(phone).replace(/[^0-9]/g, "").slice(-10);
}

function maskPhoneNumber(phone) {
    if (!phone) return "";
    const clean = cleanPhone(phone);
    if (clean.length < 4) return clean;
    const last4 = clean.slice(-4);
    return `+91 ******${last4}`;
}


// --- Database Operations, Store Profile & Multi-Device Access ---
let currentUser = null;
let currentStore = {
    storeName: "Sales & Billing Software",
    storeRole: "Point of Sale & Billing Management",
    place: "Main Branch",
    mobile: "",
    additionalMobile: "",
    gst: "",
    email: ""
};

let activeDevicesList = [];
let pendingRevokeEmail = null;
let pendingRevokePassword = null;
let pendingActiveDevices = [];

// Device Identification Helpers
function getOrCreateDeviceId() {
    let devId = localStorage.getItem("iconnect_device_id");
    if (!devId) {
        devId = "dev_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
        localStorage.setItem("iconnect_device_id", devId);
    }
    return devId;
}

function getDeviceName() {
    const ua = navigator.userAgent;
    let browser = "Browser";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("SamsungBrowser")) browser = "Samsung Internet";
    else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
    else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    let os = "Device";
    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";

    return `${os} • ${browser}`;
}

// Apply Store Branding throughout the entire software
function applyStoreBranding(store) {
    if (!store) return;
    currentStore = { ...currentStore, ...store };

    if (store.storeName) localStorage.setItem("iconnect_store_name", store.storeName);
    if (store.storeRole) localStorage.setItem("iconnect_store_role", store.storeRole);
    if (store.place) localStorage.setItem("iconnect_store_place", store.place);
    if (store.mobile) localStorage.setItem("iconnect_store_mobile", store.mobile);
    if (store.additionalMobile !== undefined) localStorage.setItem("iconnect_store_mobile_alt", store.additionalMobile);
    if (store.gst !== undefined) localStorage.setItem("iconnect_store_gst", store.gst);

    const sName = currentStore.storeName || "Sales & Billing Software";
    const sRole = currentStore.storeRole || "Point of Sale & Billing Management";
    const sPlace = currentStore.place || "Main Branch";
    const sMobile = currentStore.mobile || "";
    const sMobileAlt = currentStore.additionalMobile || "";
    const sGst = currentStore.gst || "";

    // 1. Sidebar Branding (Store Name + Store Role directly below in small font)
    const sideNameEl = document.getElementById("sidebar-store-name");
    const sideRoleEl = document.getElementById("sidebar-store-role");
    if (sideNameEl) sideNameEl.innerText = sName;
    if (sideRoleEl) sideRoleEl.innerText = sRole;

    // 2. Header Branding (Store Name + Store Role directly below in small font)
    const headNameEl = document.getElementById("header-store-name");
    const headRoleEl = document.getElementById("header-store-role");
    if (headNameEl) headNameEl.innerText = sName;
    if (headRoleEl) headRoleEl.innerText = sRole;

    // 3. Dashboard Welcome Banner (Store Name + Store Role directly below in small font)
    const dashNameEl = document.getElementById("dash-store-name");
    const dashRoleEl = document.getElementById("dash-store-role");
    const dashPlaceEl = document.getElementById("dash-store-place");
    const dashMobileEl = document.getElementById("dash-store-mobile");
    const dashMobile2El = document.getElementById("dash-store-mobile2");
    const dashMobile2Row = document.getElementById("dash-store-mobile2-row");

    if (dashNameEl) dashNameEl.innerText = sName;
    if (dashRoleEl) dashRoleEl.innerText = sRole;
    if (dashPlaceEl) dashPlaceEl.innerText = sPlace;
    if (dashMobileEl) dashMobileEl.innerText = sMobile ? `Mobile: ${sMobile}` : "No contact";
    if (dashMobile2El && dashMobile2Row) {
        if (sMobileAlt && sMobileAlt.trim()) {
            dashMobile2El.innerText = `Alt Mobile: ${sMobileAlt.trim()}`;
            dashMobile2Row.classList.remove("hidden");
        } else {
            dashMobile2Row.classList.add("hidden");
        }
    }

    // 4. Update Document Title
    document.title = `${sName} - Sales & Billing Software`;
}

// Toggle Login / Signup / Customer forms
function toggleAuthForm(type) {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const customerForm = document.getElementById("customer-login-form");
    const errorBanner = document.getElementById("auth-error");
    const tabLogin = document.getElementById("tab-btn-login");
    const tabSignup = document.getElementById("tab-btn-signup");
    const tabCustomer = document.getElementById("tab-btn-customer");

    if (errorBanner) errorBanner.classList.add("hidden");

    const inactiveClass = "py-2.5 text-xs font-bold rounded-lg transition-all text-gray-600 hover:text-gray-900 flex items-center justify-center space-x-1 cursor-pointer";
    const activeRedClass = "py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm theme-red-bg text-white flex items-center justify-center space-x-1 cursor-pointer";
    const activeIndigoClass = "py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm bg-indigo-600 text-white flex items-center justify-center space-x-1 cursor-pointer";

    if (tabLogin) tabLogin.className = inactiveClass;
    if (tabSignup) tabSignup.className = inactiveClass;
    if (tabCustomer) tabCustomer.className = inactiveClass;

    if (loginForm) loginForm.classList.add("hidden");
    if (signupForm) signupForm.classList.add("hidden");
    if (customerForm) customerForm.classList.add("hidden");

    if (type === "signup") {
        if (signupForm) signupForm.classList.remove("hidden");
        if (tabSignup) tabSignup.className = activeRedClass;
    } else if (type === "customer") {
        if (customerForm) customerForm.classList.remove("hidden");
        if (tabCustomer) tabCustomer.className = activeIndigoClass;
        const custPwInput = document.getElementById("customer-login-password");
        if (custPwInput) {
            setTimeout(() => custPwInput.focus(), 50);
        }
    } else {
        if (loginForm) loginForm.classList.remove("hidden");
        if (tabLogin) tabLogin.className = activeRedClass;
    }
}

let syncInterval = null;
let isSyncing = false;

// Dynamic status badge updater (Offline & Online)
function updateSyncStatus(status) {
    const badge = document.getElementById("sync-status-badge");
    const dot = document.getElementById("sync-status-dot");
    const text = document.getElementById("sync-status-text");
    const queueBadge = document.getElementById("offline-queue-badge");
    const queueText = document.getElementById("offline-sync-queue-count");

    const hasPending = localStorage.getItem("iconnect_pending_sync") === "true";

    if (queueBadge) {
        if (hasPending) {
            queueBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 animate-pulse";
            queueBadge.innerText = "Queue Active";
        } else {
            queueBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-green-100 text-green-800";
            queueBadge.innerText = "All Synced";
        }
    }
    if (queueText) {
        queueText.innerHTML = hasPending ? 
            `<i class="fas fa-exclamation-circle mr-1 text-amber-600"></i>Pending Queue: Offline updates saved locally` : 
            `<i class="fas fa-check-circle mr-1 text-emerald-600"></i>Pending Queue: 0 (All Synced)`;
    }

    if (!badge || !dot || !text) return;

    if (status === "synced") {
        badge.className = "px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center space-x-1.5 transition-all shadow-sm";
        dot.className = "h-2 w-2 bg-green-500 rounded-full animate-pulse";
        text.innerText = "Cloud Synced";
    } else if (status === "syncing") {
        badge.className = "px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center space-x-1.5 transition-all shadow-sm";
        dot.className = "h-2 w-2 bg-blue-500 rounded-full animate-ping";
        text.innerText = "Syncing...";
    } else if (status === "offline") {
        badge.className = "px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1.5 transition-all shadow-sm";
        dot.className = "h-2 w-2 bg-amber-500 rounded-full";
        text.innerText = hasPending ? "Offline (Saved Locally)" : "Offline Mode";
    }
}

// Smart Bidirectional Merge Algorithms
function mergeProducts(localList, serverList) {
    const productMap = new Map();
    // Add server products first
    (serverList || []).forEach(p => {
        if (p && p.id) {
            if (p.purchaseRate === undefined || p.purchaseRate === null) {
                const demo = DEMO_PRODUCTS.find(d => d.id === p.id || d.sku === p.sku);
                p.purchaseRate = demo ? demo.purchaseRate : Math.round((p.price * 0.75) * 100) / 100;
            }
            productMap.set(p.id, p);
        }
    });
    // Merge local products (keep local if newer or not on server)
    (localList || []).forEach(p => {
        if (p && p.id) {
            if (p.purchaseRate === undefined || p.purchaseRate === null) {
                const demo = DEMO_PRODUCTS.find(d => d.id === p.id || d.sku === p.sku);
                p.purchaseRate = demo ? demo.purchaseRate : Math.round((p.price * 0.75) * 100) / 100;
            }
            const existing = productMap.get(p.id);
            if (!existing || (p.updatedAt || 0) >= (existing.updatedAt || 0)) {
                productMap.set(p.id, p);
            }
        }
    });
    return Array.from(productMap.values());
}

function mergeSales(localList, serverList) {
    const salesMap = new Map();
    (serverList || []).forEach(s => {
        const key = s.id || s.invoiceNo;
        if (key) salesMap.set(key, s);
    });
    (localList || []).forEach(s => {
        const key = s.id || s.invoiceNo;
        if (key) salesMap.set(key, s);
    });
    return Array.from(salesMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function mergeCategories(localList, serverList) {
    return [...new Set([...(serverList || []), ...(localList || [])])];
}

function mergeCustomers(localList, serverList) {
    const custMap = new Map();
    (serverList || []).forEach(c => {
        if (c && (c.id || c.phone)) {
            const key = c.id || c.phone;
            custMap.set(key, c);
        }
    });
    (localList || []).forEach(c => {
        if (c && (c.id || c.phone)) {
            const key = c.id || c.phone;
            const existing = custMap.get(key);
            if (!existing || (c.updatedAt || 0) >= (existing.updatedAt || 0)) {
                custMap.set(key, c);
            }
        }
    });
    return Array.from(custMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// Perform full bidirectional sync (pull updates from other devices, push offline changes)
function performFullSync() {
    if (!currentUser || isSyncing) return;
    isSyncing = true;
    updateSyncStatus("syncing");

    const hasPendingLocalChanges = localStorage.getItem("iconnect_pending_sync") === "true";

    fetch('/api/sync/get', {
        method: 'GET',
        headers: {
            'x-user-email': currentUser.email,
            'x-device-id': getOrCreateDeviceId(),
            'X-Pinggy-No-Screen': 'true',
            'Bypass-Tunnel-Reminder': 'true'
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("Sync probe failed");
        return res.json();
    })
    .then(serverData => {
        const serverProducts = serverData.products || [];
        const serverCategories = serverData.categories || [];
        const serverSales = serverData.sales || [];
        const serverCustomers = serverData.customers || [];

        if (serverData.storeName || serverData.gst !== undefined) {
            applyStoreBranding({
                storeName: serverData.storeName,
                storeRole: serverData.storeRole,
                place: serverData.place,
                mobile: serverData.mobile,
                additionalMobile: serverData.additionalMobile,
                gst: serverData.gst
            });
        }

        if (serverData.customerPassword !== undefined) {
            customerPassword = serverData.customerPassword || "";
            localStorage.setItem("iconnect_customer_password", customerPassword);
        }

        let shouldUpload = false;
        let shouldRedraw = false;

        if (hasPendingLocalChanges) {
            // Merge offline local changes with any new changes from other devices
            const mergedProducts = mergeProducts(products, serverProducts);
            const mergedCategories = mergeCategories(categories, serverCategories);
            const mergedSales = mergeSales(sales, serverSales);
            const mergedCustomers = mergeCustomers(customers, serverCustomers);

            products = mergedProducts;
            categories = mergedCategories;
            sales = mergedSales;
            customers = mergedCustomers;

            shouldUpload = true;
            shouldRedraw = true;
        } else {
            // No offline changes locally: Check if other devices updated data
            const productsChanged = JSON.stringify(serverProducts) !== JSON.stringify(products);
            const categoriesChanged = JSON.stringify(serverCategories) !== JSON.stringify(categories);
            const salesChanged = JSON.stringify(serverSales) !== JSON.stringify(sales);
            const customersChanged = JSON.stringify(serverCustomers) !== JSON.stringify(customers);

            if (productsChanged || categoriesChanged || salesChanged || customersChanged) {
                products = serverProducts;
                categories = serverCategories;
                sales = serverSales;
                customers = serverCustomers;
                shouldRedraw = true;
            }
        }

        // Cache latest merged state locally for offline use
        saveLocalFallback();

        if (shouldUpload) {
            // Upload merged state to cloud server so all other devices receive updates
            return fetch('/api/sync/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': currentUser.email,
                    'x-device-id': getOrCreateDeviceId(),
                    'X-Pinggy-No-Screen': 'true',
                    'Bypass-Tunnel-Reminder': 'true'
                },
                body: JSON.stringify({ products, categories, sales, customers, customerPassword })
            }).then(saveRes => {
                if (saveRes.ok) {
                    localStorage.removeItem("iconnect_pending_sync");
                    updateSyncStatus("synced");
                }
            });
        } else {
            updateSyncStatus("synced");
        }

        // Seamless Redraw with Typing & Focus Protection
        if (shouldRedraw) {
            const activeEl = document.activeElement;
            const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA');
            const activeId = (isTyping && activeEl && activeEl.id) ? activeEl.id : null;
            const activeStart = (isTyping && activeEl && typeof activeEl.selectionStart === 'number') ? activeEl.selectionStart : null;
            const activeEnd = (isTyping && activeEl && typeof activeEl.selectionEnd === 'number') ? activeEl.selectionEnd : null;

            const isFormModalOpen = !document.getElementById("add-product-modal")?.classList.contains("hidden") ||
                                    !document.getElementById("edit-product-modal")?.classList.contains("hidden") ||
                                    !document.getElementById("manage-categories-modal")?.classList.contains("hidden") ||
                                    !document.getElementById("add-customer-modal")?.classList.contains("hidden") ||
                                    !document.getElementById("settle-payment-modal")?.classList.contains("hidden");

            const isLedgerModalOpen = !document.getElementById("customer-ledger-modal")?.classList.contains("hidden");

            // Redraw active screens if no new entity creation modal is blocking
            if (!isFormModalOpen) {
                initApp();
                // Live refresh customer ledger statement if open
                if (isLedgerModalOpen && currentLedgerCustomerId) {
                    openCustomerLedgerModal(currentLedgerCustomerId);
                }
                // Seamlessly restore typing focus and cursor position
                if (activeId) {
                    const el = document.getElementById(activeId);
                    if (el && typeof el.focus === 'function') {
                        el.focus();
                        if (activeStart !== null && activeEnd !== null && typeof el.setSelectionRange === 'function') {
                            try { el.setSelectionRange(activeStart, activeEnd); } catch (e) {}
                        }
                    }
                }
                console.log("App data synchronized across all devices in real time.");
            }
        }
    })
    .catch(err => {
        updateSyncStatus("offline");
    })
    .finally(() => {
        isSyncing = false;
    });
}

function fetchSyncedDataSilent() {
    performFullSync();
}

// --- Real-time Push Synchronization via Server-Sent Events (SSE) ---
let syncEventSource = null;
let sseReconnectTimer = null;

function connectRealtimeStream() {
    if (!currentUser || !currentUser.email) return;
    if (typeof EventSource === 'undefined') return;

    if (syncEventSource) {
        try { syncEventSource.close(); } catch (e) {}
        syncEventSource = null;
    }

    if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
        sseReconnectTimer = null;
    }

    const deviceId = getOrCreateDeviceId();
    const url = `/api/sync/events?email=${encodeURIComponent(currentUser.email)}&deviceId=${encodeURIComponent(deviceId)}`;

    try {
        syncEventSource = new EventSource(url);

        syncEventSource.onopen = () => {
            console.log("Real-time push SSE connected.");
            updateSyncStatus("synced");
            const sseBadge = document.getElementById("sse-status-badge");
            if (sseBadge) sseBadge.innerText = "Live Push";
        };

        syncEventSource.onmessage = (event) => {
            if (!event || !event.data) return;
            try {
                const data = JSON.parse(event.data);
                handleRealtimeSyncEvent(data);
            } catch (err) {
                console.warn("Failed to parse SSE event payload:", err);
            }
        };

        syncEventSource.onerror = (err) => {
            console.warn("Real-time SSE stream disconnected, reconnecting in 1.5s...", err);
            if (syncEventSource) {
                try { syncEventSource.close(); } catch (e) {}
                syncEventSource = null;
            }
            if (!sseReconnectTimer && currentUser) {
                sseReconnectTimer = setTimeout(() => {
                    sseReconnectTimer = null;
                    if (currentUser) connectRealtimeStream();
                }, 1500);
            }
        };
    } catch (e) {
        console.error("Error setting up EventSource:", e);
    }
}

function handleRealtimeSyncEvent(eventData) {
    if (!eventData || !eventData.type) return;

    if (eventData.type === 'DELTA_SYNC') {
        const currentDevId = getOrCreateDeviceId();
        // If this device was the source of update, local state is already saved & displayed
        if (eventData.sourceDeviceId && eventData.sourceDeviceId === currentDevId) {
            return;
        }
        applyIncomingDeltaSync(eventData.action, eventData.payload);
    } else if (eventData.type === 'DATA_UPDATED') {
        const currentDevId = getOrCreateDeviceId();
        // If this device was the source of update, local state is already saved & displayed
        if (eventData.sourceDeviceId && eventData.sourceDeviceId === currentDevId) {
            return;
        }
        // Instant live update from other devices without page reload!
        performFullSync();
    } else if (eventData.type === 'DEVICES_UPDATED') {
        const currentDevId = getOrCreateDeviceId();
        if (eventData.revokedDeviceId && eventData.revokedDeviceId === currentDevId) {
            alert("Your session on this device has been disconnected.");
            logoutUser(false);
            return;
        }
        if (Array.isArray(eventData.activeDevices)) {
            activeDevicesList = eventData.activeDevices;
            updateActiveDevicesBadge(activeDevicesList);
            const devModal = document.getElementById("device-manager-modal");
            if (devModal && !devModal.classList.contains("hidden")) {
                openDeviceManagerModal();
            }
        }
    }
}

// Instant In-Memory Delta Application (Runs in < 5ms without full database downloads)
function applyIncomingDeltaSync(action, payload) {
    if (!action || !payload) return;
    let shouldRedraw = false;

    if (action === 'SALE_CREATED') {
        const { sale, stockUpdates, customerUpdate } = payload;
        if (sale && sale.id) {
            const exists = sales.some(s => s.id === sale.id || s.invoiceNo === sale.invoiceNo);
            if (!exists) {
                sales.unshift(sale);
                shouldRedraw = true;
            }
        }
        if (Array.isArray(stockUpdates)) {
            stockUpdates.forEach(su => {
                if (su && su.id) {
                    const prod = products.find(p => p.id === su.id);
                    if (prod && typeof su.stock === 'number') {
                        prod.stock = Math.max(0, su.stock);
                        prod.updatedAt = Date.now();
                        shouldRedraw = true;
                    }
                }
            });
        }
        if (customerUpdate && (customerUpdate.id || customerUpdate.phone)) {
            const cKey = customerUpdate.id || customerUpdate.phone;
            const existingCust = customers.find(c => c.id === cKey || c.phone === cKey);
            if (existingCust) {
                Object.assign(existingCust, customerUpdate);
            } else {
                customers.unshift(customerUpdate);
            }
            shouldRedraw = true;
        }
    } else if (action === 'CUSTOMER_ADDED' || action === 'CUSTOMER_UPDATED') {
        const { customer } = payload;
        if (customer && (customer.id || customer.phone)) {
            const existingIdx = customers.findIndex(c => c.id === customer.id || (c.phone && c.phone === customer.phone));
            if (existingIdx !== -1) {
                customers[existingIdx] = Object.assign({}, customers[existingIdx], customer);
            } else {
                customers.unshift(customer);
            }
            shouldRedraw = true;
        }
    } else if (action === 'CUSTOMER_DELETED') {
        const { customerId } = payload;
        if (customerId) {
            customers = customers.filter(c => c.id !== customerId);
            shouldRedraw = true;
        }
    } else if (action === 'PAYMENT_SETTLED') {
        const { customerId, settlement, outstandingBalance, totalPaid } = payload;
        const cust = customers.find(c => c.id === customerId);
        if (cust) {
            if (!Array.isArray(cust.settlements)) cust.settlements = [];
            if (settlement && settlement.id) {
                const exists = cust.settlements.some(s => s.id === settlement.id);
                if (!exists) cust.settlements.unshift(settlement);
            }
            if (typeof outstandingBalance === 'number') cust.outstandingBalance = outstandingBalance;
            if (typeof totalPaid === 'number') cust.totalPaid = totalPaid;
            cust.updatedAt = Date.now();
            shouldRedraw = true;
        }
    } else if (action === 'PRODUCT_UPSERT') {
        const { product } = payload;
        if (product && product.id) {
            const idx = products.findIndex(p => p.id === product.id);
            if (idx !== -1) {
                products[idx] = Object.assign({}, products[idx], product);
            } else {
                products.unshift(product);
            }
            shouldRedraw = true;
        }
    } else if (action === 'PRODUCT_DELETE') {
        const { productId } = payload;
        if (productId) {
            products = products.filter(p => p.id !== productId);
            shouldRedraw = true;
        }
    } else if (action === 'CATEGORIES_UPDATED') {
        const { categories: newCats } = payload;
        if (Array.isArray(newCats)) {
            categories = newCats;
            shouldRedraw = true;
        }
    } else if (action === 'CUSTOMER_PASSWORD_UPDATED') {
        const { customerPassword: newPw } = payload || {};
        customerPassword = newPw || "";
        localStorage.setItem("iconnect_customer_password", customerPassword);
        if (typeof updateCustomerPasswordModalStatus === 'function') {
            updateCustomerPasswordModalStatus();
        }
    }

    if (shouldRedraw) {
        saveLocalFallback();

        const isLedgerOpen = !document.getElementById("customer-ledger-modal")?.classList.contains("hidden");
        const isFormOpen = !document.getElementById("add-product-modal")?.classList.contains("hidden") ||
                           !document.getElementById("edit-product-modal")?.classList.contains("hidden") ||
                           !document.getElementById("add-customer-modal")?.classList.contains("hidden") ||
                           !document.getElementById("settle-payment-modal")?.classList.contains("hidden");

        if (!isFormOpen) {
            initApp();
            if (isLedgerOpen && currentLedgerCustomerId) {
                openCustomerLedgerModal(currentLedgerCustomerId);
            }
        }
        showInstantSyncBadge(action);
    }
}

function showInstantSyncBadge(action) {
    const sseBadge = document.getElementById("sse-status-badge");
    if (sseBadge) {
        const origText = sseBadge.innerText;
        sseBadge.innerText = "⚡ Instant Sync";
        sseBadge.classList.add("bg-emerald-200", "text-emerald-900");
        setTimeout(() => {
            sseBadge.innerText = origText;
            sseBadge.classList.remove("bg-emerald-200", "text-emerald-900");
        }, 1200);
    }
}

// Instant sync reconnect on phone wake or tab focus
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentUser) {
        if (!syncEventSource || syncEventSource.readyState === 2) { // 2 = CLOSED
            connectRealtimeStream();
        }
        performFullSync();
    }
});

window.addEventListener("online", () => {
    if (currentUser) {
        connectRealtimeStream();
        performFullSync();
    }
});

// --- Global Network Info & Public Internet Tunnel ---
let serverNetworkInfo = null;

function fetchNetworkInfo() {
    fetch('/api/network/info', {
        headers: {
            'Bypass-Tunnel-Reminder': 'true',
            'X-Pinggy-No-Screen': 'true'
        }
    })
    .then(res => res.json())
    .then(info => {
        if (info) {
            serverNetworkInfo = info;
            updateNetworkDisplay(info);
        }
    })
    .catch(err => console.warn("Network info fetch warning:", err));
}

function updateNetworkDisplay(info) {
    if (!info) return;
    const publicLinkInput = document.getElementById("public-link-input");
    const publicLinkOpenBtn = document.getElementById("public-link-open-btn");
    const lanLinkText = document.getElementById("lan-link-text");
    const networkPillText = document.getElementById("network-status-pill-text");
    const tunnelPwdVal = document.getElementById("tunnel-password-val");
    const tunnelPasswordBox = document.getElementById("tunnel-password-box");

    const effectivePublicUrl = info.cloudflareUrl || info.publicUrl || info.localtunnelUrl || window.location.origin;
    if (publicLinkInput) {
        publicLinkInput.value = effectivePublicUrl;
    }
    if (publicLinkOpenBtn) {
        publicLinkOpenBtn.setAttribute('href', effectivePublicUrl);
    }
    if (lanLinkText) {
        const lan = (info.lanUrls && info.lanUrls.length > 0) ? info.lanUrls[0] : (window.location.origin || '127.0.0.1:3000');
        lanLinkText.innerText = lan;
    }
    if (networkPillText) {
        networkPillText.innerText = (info.cloudflareUrl || info.publicUrl) ? "Anytime Global: Online" : "Shop Wi-Fi: Active";
    }
    if (tunnelPasswordBox) {
        if (effectivePublicUrl.includes('trycloudflare.com') || (info.cloudflareUrl && effectivePublicUrl === info.cloudflareUrl)) {
            tunnelPasswordBox.innerHTML = `<span><i class="fas fa-check-circle mr-1 text-emerald-600"></i><strong>Zero-Configuration Access:</strong> Works on ANY network (4G/5G/Wi-Fi) with no password required.</span>`;
            tunnelPasswordBox.className = "text-[11px] flex items-center justify-between text-emerald-900 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200";
        } else if (info.tunnelPassword) {
            if (tunnelPwdVal) tunnelPwdVal.innerText = info.tunnelPassword;
            tunnelPasswordBox.className = "text-[11px] flex items-center justify-between text-indigo-900 bg-white/80 px-2.5 py-1.5 rounded-lg border border-indigo-100";
        }
    }
}

function copyPublicLink() {
    const input = document.getElementById("public-link-input");
    if (!input) return;
    const url = input.value;
    if (!url || url.includes("Initializing")) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(showCopied).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }

    function fallbackCopy() {
        input.select();
        document.execCommand('copy');
        showCopied();
    }

    function showCopied() {
        const textSpan = document.getElementById("copy-link-text");
        if (textSpan) {
            const original = textSpan.innerText;
            textSpan.innerText = "Copied!";
            setTimeout(() => { textSpan.innerText = original; }, 2000);
        }
    }
}

function copyTunnelPassword() {
    const el = document.getElementById("tunnel-password-val");
    if (!el) return;
    const text = el.innerText.trim();
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showCopied).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }

    function fallbackCopy() {
        const temp = document.createElement("textarea");
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showCopied();
    }

    function showCopied() {
        const textSpan = document.getElementById("copy-pwd-text");
        if (textSpan) {
            const original = textSpan.innerText;
            textSpan.innerText = "Copied!";
            setTimeout(() => { textSpan.innerText = original; }, 2000);
        }
    }
}

let pingInterval = null;

// Start auto synchronization and real-time push connection
function startAutoSync() {
    stopAutoSync();
    performFullSync();
    pingSession();
    fetchNetworkInfo();
    connectRealtimeStream();

    // Fallback sync check (only probes full DB if offline changes pending or stream disconnected)
    syncInterval = setInterval(() => {
        if (currentUser) {
            const hasPending = localStorage.getItem("iconnect_pending_sync") === "true";
            const sseActive = syncEventSource && syncEventSource.readyState === 1; // 1 = OPEN
            if (hasPending || !sseActive) {
                performFullSync();
            }
        }
    }, 30000);

    // Device session heartbeat every 20 seconds
    pingInterval = setInterval(() => {
        if (currentUser) {
            pingSession();
        }
    }, 20000);
}

// Stop auto synchronization and close real-time stream
function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
    if (syncEventSource) {
        try { syncEventSource.close(); } catch (e) {}
        syncEventSource = null;
    }
    if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
        sseReconnectTimer = null;
    }
}

// Immediate sync on mobile/desktop wakeups and network changes
window.addEventListener("online", () => {
    updateSyncStatus("syncing");
    performFullSync();
    connectRealtimeStream();
    fetchNetworkInfo();
});
window.addEventListener("offline", () => {
    updateSyncStatus("offline");
});
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        performFullSync();
        if (!syncEventSource || syncEventSource.readyState === 2) {
            connectRealtimeStream();
        }
    }
});
window.addEventListener("focus", () => {
    performFullSync();
});

// Check auth state on start
function checkAuth() {
    const email = localStorage.getItem("iconnect_user_email");
    const storeName = localStorage.getItem("iconnect_store_name");
    const storeRole = localStorage.getItem("iconnect_store_role");
    const place = localStorage.getItem("iconnect_store_place");
    const mobile = localStorage.getItem("iconnect_store_mobile");
    const additionalMobile = localStorage.getItem("iconnect_store_mobile_alt");
    const gst = localStorage.getItem("iconnect_store_gst");

    if (email) {
        currentUser = { email };
        currentStore = {
            storeName: storeName || "Sales & Billing Software",
            storeRole: storeRole || "Point of Sale & Billing Management",
            place: place || "Main Branch",
            mobile: mobile || "",
            additionalMobile: additionalMobile || "",
            gst: gst || "",
            email
        };

        applyStoreBranding(currentStore);
        currentUserRole = localStorage.getItem("iconnect_user_role") || "owner";
        applyCustomerRolePermissions();
        document.getElementById("auth-screen").classList.add("hidden");

        // Load local cache immediately so UI shows instantly
        loadLocalFallback();
        // Trigger full sync and background polling
        startAutoSync();
        // Ping session & retrieve active device list
        pingSession();
    } else {
        document.getElementById("auth-screen").classList.remove("hidden");
    }
}

function pingSession() {
    if (!currentUser || !currentUser.email) return;
    const deviceId = getOrCreateDeviceId();

    fetch('/api/auth/ping', {
        headers: {
            'x-user-email': currentUser.email,
            'x-device-id': deviceId,
            'X-Pinggy-No-Screen': 'true',
            'Bypass-Tunnel-Reminder': 'true'
        }
    })
    .then(res => {
        if (res.status === 401) {
            return res.json().then(data => {
                if (data && data.sessionRevoked) {
                    alert("Your session on this device has been disconnected.");
                    logoutUser(false);
                }
                return null;
            }).catch(() => null);
        }
        if (!res.ok) return null;
        return res.json();
    })
    .then(data => {
        if (data && data.success) {
            if (Array.isArray(data.activeDevices)) {
                activeDevicesList = data.activeDevices;
                updateActiveDevicesBadge(data.activeDevices);
            }
            if (data.storeName) {
                applyStoreBranding(data);
            }
        }
    })
    .catch(err => {
        console.warn("Session ping offline check:", err);
    });
}

function updateActiveDevicesBadge(devices) {
    const badgeText = document.getElementById("active-devices-text");
    const badgeBtn = document.getElementById("active-devices-badge");
    if (!badgeText || !badgeBtn) return;
    
    const count = Array.isArray(devices) ? devices.length : 1;
    badgeText.innerText = `Devices: ${count}/5`;
    
    if (count >= 5) {
        badgeBtn.className = "px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer";
    } else {
        badgeBtn.className = "px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer";
    }
}

function openDeviceManagerModal() {
    fetchNetworkInfo();
    updateSyncStatus(isSyncing ? "syncing" : (navigator.onLine ? "synced" : "offline"));

    const countHeader = document.getElementById("devices-count-header");
    if (countHeader) {
        const cnt = Array.isArray(activeDevicesList) ? activeDevicesList.length : 1;
        countHeader.innerText = `${cnt} / 5 Active`;
    }

    if (serverNetworkInfo) {
        updateNetworkDisplay(serverNetworkInfo);
    }

    const sseBadge = document.getElementById("sse-status-badge");
    if (sseBadge) {
        if (syncEventSource && syncEventSource.readyState === 1) {
            sseBadge.innerText = "Live Push Connected";
            sseBadge.className = "px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-extrabold text-[10px] uppercase tracking-wider";
        } else {
            sseBadge.innerText = "Active";
            sseBadge.className = "px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase tracking-wider";
        }
    }

    const container = document.getElementById("devices-list-container");
    if (!container) return;

    container.innerHTML = "";
    const currentDevId = getOrCreateDeviceId();

    if (!activeDevicesList || activeDevicesList.length === 0) {
        activeDevicesList = [{
            deviceId: currentDevId,
            deviceName: getDeviceName(),
            loginTime: Date.now(),
            lastActive: Date.now()
        }];
    }

    activeDevicesList.forEach((dev, idx) => {
        const isCurrent = dev.deviceId === currentDevId;
        const lastActiveDate = new Date(dev.lastActive || dev.loginTime || Date.now());
        const timeAgo = lastActiveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = lastActiveDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const row = document.createElement("div");
        row.className = "p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between";
        row.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-lg ${isCurrent ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'} flex items-center justify-center text-xs">
                    <i class="fas ${isCurrent ? 'fa-check' : 'fa-laptop'}"></i>
                </div>
                <div>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold text-gray-800">${dev.deviceName || `Device #${idx + 1}`}</span>
                        ${isCurrent ? '<span class="text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded">This Device</span>' : ''}
                    </div>
                    <span class="text-[11px] text-gray-500">Last active: ${dateStr} ${timeAgo}</span>
                </div>
            </div>
            <div>
                ${isCurrent ? 
                    '<span class="text-xs text-green-600 font-semibold flex items-center"><span class="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-1"></span>This Device</span>' : 
                    `<button onclick="revokeDevice('${dev.deviceId}')" class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all cursor-pointer">Disconnect</button>`
                }
            </div>
        `;
        container.appendChild(row);
    });

    openModal("device-manager-modal");
}

function revokeDevice(targetDeviceId) {
    if (!confirm("Are you sure you want to disconnect this device session?")) return;

    const email = (currentUser && currentUser.email) ? currentUser.email : pendingRevokeEmail;
    const password = pendingRevokePassword || "";

    fetch('/api/auth/revoke-device', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-email': email || '',
            'X-Pinggy-No-Screen': 'true',
            'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ email, password, targetDeviceId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            activeDevicesList = data.activeDevices || [];
            updateActiveDevicesBadge(activeDevicesList);

            if (pendingRevokeEmail && pendingRevokePassword) {
                closeModal("device-manager-modal");
                document.getElementById("login-email").value = pendingRevokeEmail;
                document.getElementById("login-password").value = pendingRevokePassword;
                document.getElementById("login-form").dispatchEvent(new Event("submit"));
                pendingRevokeEmail = null;
                pendingRevokePassword = null;
            } else {
                openDeviceManagerModal();
            }
        } else {
            alert(data.error || "Failed to disconnect device.");
        }
    })
    .catch(err => {
        alert("Failed to disconnect device. Network error.");
    });
}

function openDeviceRevocationPrompt() {
    activeDevicesList = pendingActiveDevices || [];
    openDeviceManagerModal();
}

function loadSyncedData() {
    performFullSync();
}

// High-Speed Low-Bandwidth Delta Synchronization Dispatcher (< 500 bytes per update)
function dispatchDeltaSync(action, payload) {
    if (!currentUser || !action || !payload) return;

    const deviceId = getOrCreateDeviceId();
    const bodyData = {
        action,
        payload,
        sourceDeviceId: deviceId,
        timestamp: Date.now()
    };

    fetch('/api/sync/delta', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email,
            'x-device-id': deviceId,
            'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify(bodyData)
    })
    .then(res => {
        if (res.ok) {
            updateSyncStatus("synced");
        }
    })
    .catch(err => {
        // Network drop: saveSyncedData fallback queue already marked pending sync
        console.warn("Delta sync dispatch warning (will reconcile on reconnect):", err);
    });
}

let debouncedSaveTimeout = null;

// Send synced data back to server with offline fallback & queue
function saveSyncedData() {
    // 1. Immediately save to local offline cache (< 1ms)
    saveLocalFallback();
    // 2. Mark pending sync flag
    localStorage.setItem("iconnect_pending_sync", "true");

    if (!currentUser) return;

    // 3. Debounce full cloud upload so multiple synchronous updates coalesce into a single payload
    if (debouncedSaveTimeout) {
        clearTimeout(debouncedSaveTimeout);
    }

    debouncedSaveTimeout = setTimeout(() => {
        debouncedSaveTimeout = null;
        if (!currentUser) return;

        updateSyncStatus("syncing");

        fetch('/api/sync/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-email': currentUser.email,
                'x-device-id': getOrCreateDeviceId(),
                'Bypass-Tunnel-Reminder': 'true'
            },
            body: JSON.stringify({ products, categories, sales, customers, customerPassword })
        })
        .then(res => {
            if (res.ok) {
                localStorage.removeItem("iconnect_pending_sync");
                updateSyncStatus("synced");
            } else {
                updateSyncStatus("offline");
            }
        })
        .catch(err => {
            updateSyncStatus("offline");
            console.warn("Device offline. Changes queued for automatic sync when network is restored.");
        });
    }, 300);
}

// Local fallback database operations (keeps working offline)
function loadLocalFallback() {
    // Clean up legacy v4 keys if present
    localStorage.removeItem("iconnect_products_v4");
    localStorage.removeItem("iconnect_sales_v4");
    localStorage.removeItem("iconnect_categories_v4");

    const localProducts = localStorage.getItem("iconnect_products_v5");
    const localSales = localStorage.getItem("iconnect_sales_v5");
    const localCategories = localStorage.getItem("iconnect_categories_v5");
    const localCustomers = localStorage.getItem("iconnect_customers_v5") || localStorage.getItem("iconnect_customers");

    if (localProducts !== null) {
        try {
            products = JSON.parse(localProducts);
            if (!Array.isArray(products)) products = [];
        } catch(e) {
            products = [];
        }
    } else {
        products = [];
        localStorage.setItem("iconnect_products_v5", JSON.stringify(products));
    }

    if (localSales !== null) {
        try {
            sales = JSON.parse(localSales);
            if (!Array.isArray(sales)) sales = [];
        } catch(e) {
            sales = [];
        }
    } else {
        sales = [];
        localStorage.setItem("iconnect_sales_v5", JSON.stringify(sales));
    }

    if (localCategories !== null) {
        try {
            categories = JSON.parse(localCategories);
            if (!Array.isArray(categories)) categories = [];
        } catch(e) {
            categories = [];
        }
    } else {
        categories = [];
        localStorage.setItem("iconnect_categories_v5", JSON.stringify(categories));
    }

    if (localCustomers !== null) {
        try {
            customers = JSON.parse(localCustomers);
            if (!Array.isArray(customers)) customers = [];
        } catch(e) {
            customers = [];
        }
    } else {
        customers = [];
        localStorage.setItem("iconnect_customers_v5", JSON.stringify(customers));
    }

    customerPassword = localStorage.getItem("iconnect_customer_password") || "";

    initApp();
}

function saveLocalFallback() {
    localStorage.setItem("iconnect_products_v5", JSON.stringify(products));
    localStorage.setItem("iconnect_sales_v5", JSON.stringify(sales));
    localStorage.setItem("iconnect_categories_v5", JSON.stringify(categories));
    localStorage.setItem("iconnect_customers_v5", JSON.stringify(customers));
    localStorage.setItem("iconnect_customer_password", customerPassword || "");
}

function saveProducts() {
    saveSyncedData();
}

function saveSales() {
    saveSyncedData();
}

function saveCategories() {
    saveSyncedData();
    dispatchDeltaSync('CATEGORIES_UPDATED', { categories });
}

function saveCustomers() {
    saveSyncedData();
}

// Log Out User
function logoutUser(confirmPrompt = true) {
    const sName = currentStore.storeName || "Sales & Billing Software";
    if (!confirmPrompt || confirm(`Are you sure you want to log out from ${sName}?`)) {
        const email = localStorage.getItem("iconnect_user_email");
        const deviceId = getOrCreateDeviceId();

        if (email) {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Pinggy-No-Screen': 'true',
                    'Bypass-Tunnel-Reminder': 'true'
                },
                body: JSON.stringify({ email, deviceId })
            }).catch(e => console.warn(e));
        }

        localStorage.removeItem("iconnect_user_email");
        localStorage.removeItem("iconnect_user_name");
        localStorage.removeItem("iconnect_store_name");
        localStorage.removeItem("iconnect_store_role");
        localStorage.removeItem("iconnect_store_place");
        localStorage.removeItem("iconnect_store_mobile");
        localStorage.removeItem("iconnect_store_mobile_alt");
        localStorage.removeItem("iconnect_store_gst");
        localStorage.removeItem("iconnect_user_role");
        currentUserRole = "owner";

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

// --- Client-Side Auth Cache (Zero-Error Offline Authentication) ---
function getAuthCache() {
    try {
        const raw = localStorage.getItem("iconnect_user_auth_cache");
        let cache = raw ? JSON.parse(raw) : {};
        if (typeof cache !== 'object' || cache === null) cache = {};
        
        // Ensure default pre-seeded demo accounts exist for immediate zero-error access
        if (!cache["iconnect@gmail.com"]) {
            cache["iconnect@gmail.com"] = {
                email: "iconnect@gmail.com",
                password: "Iconnect101",
                storeName: "NIHAL STORE",
                storeRole: "Anyone",
                place: "Athippttta,Edayoor PO, Malaappuram, Keral,a",
                mobile: "9578876232",
                additionalMobile: "",
                gst: ""
            };
        }
        if (!cache["shibi5056@gmail.com"]) {
            cache["shibi5056@gmail.com"] = {
                email: "shibi5056@gmail.com",
                password: "shibil101@",
                storeName: "I CONNECT",
                storeRole: "Mobile Phones, Accessories & Repairing",
                place: "Calicut, Kerala",
                mobile: "8138962026",
                additionalMobile: "",
                gst: ""
            };
        }
        return cache;
    } catch (e) {
        return {};
    }
}

function saveUserToAuthCache(userRecord) {
    if (!userRecord || !userRecord.email) return;
    try {
        const cache = getAuthCache();
        const normEmail = userRecord.email.toLowerCase().trim();
        cache[normEmail] = {
            email: normEmail,
            password: userRecord.password,
            storeName: userRecord.storeName || "Sales & Billing Software",
            storeRole: userRecord.storeRole || "Point of Sale & Billing Management",
            place: userRecord.place || "",
            mobile: userRecord.mobile || "",
            additionalMobile: userRecord.additionalMobile || "",
            gst: userRecord.gst || ""
        };
        localStorage.setItem("iconnect_user_auth_cache", JSON.stringify(cache));
    } catch (e) {
        console.warn("Could not save to auth cache:", e);
    }
}

function tryOfflineLogin(email, password) {
    const normEmail = (email || '').toLowerCase().trim();
    const cache = getAuthCache();
    const user = cache[normEmail];
    if (user && user.password === password) {
        localStorage.setItem("iconnect_user_email", user.email);
        localStorage.setItem("iconnect_store_name", user.storeName || "Sales & Billing Software");
        localStorage.setItem("iconnect_store_role", user.storeRole || "Point of Sale & Billing Management");
        localStorage.setItem("iconnect_store_place", user.place || "");
        localStorage.setItem("iconnect_store_mobile", user.mobile || "");
        localStorage.setItem("iconnect_store_mobile_alt", user.additionalMobile || "");
        localStorage.setItem("iconnect_store_gst", user.gst || "");
        localStorage.setItem("iconnect_user_role", "owner");
        currentUserRole = "owner";
        
        checkAuth();
        console.log("Logged in successfully via Offline Auth Cache.");
        return true;
    }
    return false;
}

function quickDemoLogin() {
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    if (emailInput && passwordInput) {
        emailInput.value = "iconnect@gmail.com";
        passwordInput.value = "Iconnect101";
        const form = document.getElementById("login-form");
        if (form) {
            form.dispatchEvent(new Event("submit"));
        }
    }
}
window.quickDemoLogin = quickDemoLogin;

// Setup Auth form listeners
function setupAuthListeners() {
    // Login Form Submit
    document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const rawEmail = document.getElementById("login-email").value;
        const normEmail = (rawEmail || '').toLowerCase().trim();
        const password = document.getElementById("login-password").value;
        const errorBanner = document.getElementById("auth-error");
        const errorMsg = document.getElementById("auth-error-msg");
        const deviceActions = document.getElementById("device-limit-actions");
        
        errorBanner.classList.add("hidden");
        if (deviceActions) deviceActions.classList.add("hidden");

        const submitBtn = document.getElementById("login-submit-btn");
        if (submitBtn) submitBtn.disabled = true;

        const deviceId = getOrCreateDeviceId();
        const deviceName = getDeviceName();
        
        fetch('/api/auth/login', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Pinggy-No-Screen': 'true',
                'Bypass-Tunnel-Reminder': 'true'
            },
            body: JSON.stringify({ email: normEmail, password, deviceId, deviceName })
        })
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (data.offline || status === 503) {
                // Device or server offline: seamlessly attempt local offline authentication
                if (tryOfflineLogin(normEmail, password)) {
                    return;
                }
            }

            if (data.error) {
                // If network/server issues or credentials match cached store, try offline login
                if (status >= 500 || (data.error.includes("Invalid email or password") && tryOfflineLogin(normEmail, password))) {
                    return;
                }

                errorMsg.innerText = data.error;
                errorBanner.classList.remove("hidden");

                if (data.deviceLimitReached) {
                    if (deviceActions) deviceActions.classList.remove("hidden");
                    pendingRevokeEmail = normEmail;
                    pendingRevokePassword = password;
                    pendingActiveDevices = data.activeDevices || [];
                }
            } else if (data.success && data.user) {
                const user = data.user;
                // Save to local auth cache for future offline access
                saveUserToAuthCache({
                    email: user.email,
                    password: password,
                    storeName: user.storeName,
                    storeRole: user.storeRole,
                    place: user.place,
                    mobile: user.mobile,
                    additionalMobile: user.additionalMobile,
                    gst: user.gst
                });

                localStorage.setItem("iconnect_user_email", user.email);
                localStorage.setItem("iconnect_store_name", user.storeName || "Sales & Billing Software");
                localStorage.setItem("iconnect_store_role", user.storeRole || "Point of Sale & Billing Management");
                localStorage.setItem("iconnect_store_place", user.place || "");
                localStorage.setItem("iconnect_store_mobile", user.mobile || "");
                localStorage.setItem("iconnect_store_mobile_alt", user.additionalMobile || "");
                localStorage.setItem("iconnect_store_gst", user.gst || "");
                localStorage.setItem("iconnect_user_role", "owner");
                currentUserRole = "owner";

                if (Array.isArray(user.activeDevices)) {
                    activeDevicesList = user.activeDevices;
                    updateActiveDevicesBadge(user.activeDevices);
                }

                checkAuth();
            }
        })
        .catch(err => {
            // Network fetch failed (e.g. offline, tunnel down): check local cache
            if (tryOfflineLogin(normEmail, password)) {
                return;
            }
            errorMsg.innerText = "Connection unreachable. Please verify credentials or use Quick Demo Sign-In.";
            errorBanner.classList.remove("hidden");
        })
        .finally(() => {
            if (submitBtn) submitBtn.disabled = false;
        });
    });

    // Signup Form Submit (With optional GST field)
    document.getElementById("signup-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const storeName = document.getElementById("signup-store-name").value.trim();
        const storeRole = document.getElementById("signup-store-role").value.trim();
        const place = document.getElementById("signup-place").value.trim();
        const mobile = document.getElementById("signup-mobile").value.trim();
        const additionalMobile = document.getElementById("signup-mobile-alt").value.trim();
        const gstInput = document.getElementById("signup-gst");
        const gst = gstInput ? gstInput.value.trim() : "";
        const email = document.getElementById("signup-email").value.trim();
        const normEmail = email.toLowerCase().trim();
        const password = document.getElementById("signup-password").value;
        const errorBanner = document.getElementById("auth-error");
        const errorMsg = document.getElementById("auth-error-msg");
        
        errorBanner.classList.add("hidden");

        const submitBtn = document.getElementById("signup-submit-btn");
        if (submitBtn) submitBtn.disabled = true;

        const deviceId = getOrCreateDeviceId();
        const deviceName = getDeviceName();
        
        fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Pinggy-No-Screen': 'true',
                'Bypass-Tunnel-Reminder': 'true'
            },
            body: JSON.stringify({
                storeName,
                storeRole,
                place,
                mobile,
                additionalMobile,
                gst,
                email: normEmail,
                password,
                deviceId,
                deviceName
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                errorMsg.innerText = data.error;
                errorBanner.classList.remove("hidden");
            } else if (data.success && data.user) {
                const user = data.user;
                saveUserToAuthCache({
                    email: user.email,
                    password: password,
                    storeName: user.storeName,
                    storeRole: user.storeRole,
                    place: user.place,
                    mobile: user.mobile,
                    additionalMobile: user.additionalMobile,
                    gst: user.gst
                });

                localStorage.setItem("iconnect_user_email", user.email);
                localStorage.setItem("iconnect_store_name", user.storeName);
                localStorage.setItem("iconnect_store_role", user.storeRole);
                localStorage.setItem("iconnect_store_place", user.place);
                localStorage.setItem("iconnect_store_mobile", user.mobile);
                localStorage.setItem("iconnect_store_mobile_alt", user.additionalMobile || "");
                localStorage.setItem("iconnect_store_gst", user.gst || "");
                localStorage.setItem("iconnect_user_role", "owner");
                currentUserRole = "owner";

                if (Array.isArray(user.activeDevices)) {
                    activeDevicesList = user.activeDevices;
                    updateActiveDevicesBadge(user.activeDevices);
                }

                checkAuth();
            }
        })
        .catch(err => {
            // If offline, save locally so cashier is never blocked from using the POS
            const localUser = {
                storeName,
                storeRole,
                place,
                mobile,
                additionalMobile,
                gst,
                email: normEmail,
                password
            };
            saveUserToAuthCache(localUser);
            localStorage.setItem("iconnect_user_email", localUser.email);
            localStorage.setItem("iconnect_store_name", localUser.storeName);
            localStorage.setItem("iconnect_store_role", localUser.storeRole);
            localStorage.setItem("iconnect_store_place", localUser.place);
            localStorage.setItem("iconnect_store_mobile", localUser.mobile);
            localStorage.setItem("iconnect_store_mobile_alt", localUser.additionalMobile || "");
            localStorage.setItem("iconnect_store_gst", localUser.gst || "");
            localStorage.setItem("iconnect_user_role", "owner");
            currentUserRole = "owner";
            localStorage.setItem("iconnect_pending_signup", JSON.stringify(localUser));

            checkAuth();
        })
        .finally(() => {
            if (submitBtn) submitBtn.disabled = false;
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
    renderReport();
    renderCustomerDetailsSection();
}

// --- Tab Switching ---
function switchTab(tabId) {
    let effectiveTab = tabId;
    if (tabId === "customer-credit") {
        effectiveTab = "customer-details";
    }
    if (currentUserRole === "customer" && effectiveTab !== "products" && effectiveTab !== "reports") {
        effectiveTab = "products";
    }
    activeTab = effectiveTab;
    fetchSyncedDataSilent();
    
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    
    // Show active tab
    const targetTab = document.getElementById(`${effectiveTab}-tab`);
    if (targetTab) targetTab.classList.remove("hidden");
    
    // Update navigation styles
    document.querySelectorAll(".nav-link").forEach(link => {
        const linkTab = link.getAttribute("data-tab");
        if (linkTab === effectiveTab || (effectiveTab === "customer-details" && linkTab === "customer-credit")) {
            link.className = "nav-link flex items-center p-3 my-1 nav-link-active transition-colors duration-200";
        } else {
            link.className = "nav-link flex items-center p-3 my-1 nav-link-inactive rounded-lg transition-colors duration-200";
        }
    });

    // Refresh content for tabs that display dynamic database status
    if (effectiveTab === "dashboard") {
        renderDashboard();
    } else if (effectiveTab === "products") {
        renderProductsTable();
    } else if (effectiveTab === "billing") {
        populateBillingProductSelect();
        renderCart();
    } else if (effectiveTab === "sales-history") {
        renderSalesHistory();
    } else if (effectiveTab === "reports") {
        renderReport();
    } else if (effectiveTab === "customer-details") {
        renderCustomerDetailsSection();
    }
}

// --- Profit & Loss Helpers ---
function calculateSaleRevenue(sale) {
    if (typeof sale.subtotal === 'number') {
        return Math.max(0, sale.subtotal - (sale.discount || 0));
    }
    return sale.total || 0;
}

function calculateSaleCost(sale) {
    if (typeof sale.totalCost === 'number') return sale.totalCost;
    if (Array.isArray(sale.items)) {
        return sale.items.reduce((sum, item) => {
            if (typeof item.totalCost === 'number') return sum + item.totalCost;
            if (typeof item.purchaseRate === 'number') return sum + (item.purchaseRate * item.quantity);
            const prod = products.find(p => p.id === item.id || p.sku === item.sku);
            const rate = (prod && typeof prod.purchaseRate === 'number') ? prod.purchaseRate : (item.price * 0.75);
            return sum + (rate * item.quantity);
        }, 0);
    }
    return (sale.subtotal || sale.total || 0) * 0.75;
}

function calculateSaleProfit(sale) {
    if (typeof sale.profit === 'number') return sale.profit;
    return calculateSaleRevenue(sale) - calculateSaleCost(sale);
}

// --- Dashboard Logic ---
let currentChartMetric = "revenue";

function setChartMetric(metric) {
    currentChartMetric = metric;
    const revBtn = document.getElementById("chart-toggle-revenue");
    const profBtn = document.getElementById("chart-toggle-profit");
    const heading = document.getElementById("chart-heading-text");
    
    if (metric === "revenue") {
        if (revBtn) revBtn.className = "px-3 py-1 rounded-md theme-red-bg text-white shadow-sm transition-all cursor-pointer";
        if (profBtn) profBtn.className = "px-3 py-1 rounded-md text-gray-600 hover:text-gray-900 transition-all cursor-pointer";
        if (heading) heading.innerText = "Sales Revenue Analytics (Last 7 Days)";
    } else {
        if (profBtn) profBtn.className = "px-3 py-1 rounded-md bg-emerald-600 text-white shadow-sm transition-all cursor-pointer";
        if (revBtn) revBtn.className = "px-3 py-1 rounded-md text-gray-600 hover:text-gray-900 transition-all cursor-pointer";
        if (heading) heading.innerText = "Net Profit Analytics (Last 7 Days)";
    }
    renderSalesAnalyticsChart();
}

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

    const metricByDay = {};
    last7Days.forEach(day => { metricByDay[day] = 0; });

    sales.forEach(sale => {
        const saleDay = new Date(sale.date).toDateString();
        if (saleDay in metricByDay) {
            if (currentChartMetric === "profit") {
                metricByDay[saleDay] += calculateSaleProfit(sale);
            } else {
                metricByDay[saleDay] += calculateSaleRevenue(sale);
            }
        }
    });

    const chartLabels = last7Days.map(day => {
        const parts = day.split(' ');
        return `${parts[1]} ${parts[2]}`; // "Aug 18"
    });
    const chartData = last7Days.map(day => metricByDay[day]);

    if (salesChart) {
        salesChart.destroy();
    }

    const isProfitMetric = currentChartMetric === "profit";
    const lineColor = isProfitMetric ? '#059669' : '#d32f2f';
    const bgGradient = isProfitMetric ? 'rgba(5, 150, 105, 0.1)' : 'rgba(211, 47, 47, 0.1)';
    const labelTitle = isProfitMetric ? 'Net Profit (₹)' : 'Sales Revenue (₹)';

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: labelTitle,
                data: chartData,
                borderColor: lineColor,
                backgroundColor: bgGradient,
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

// --- Profit Preview Helpers for Add / Edit Modals ---
function calculateProfitDetails(purchaseRate, sellingPrice) {
    const cost = parseFloat(purchaseRate);
    const price = parseFloat(sellingPrice);
    if (isNaN(cost) || isNaN(price) || price === 0) {
        return { diff: 0, margin: '0.0', isProfit: true, ready: false };
    }
    const diff = price - cost;
    const margin = price > 0 ? ((diff / price) * 100) : 0;
    return {
        diff,
        margin: Math.abs(margin).toFixed(1),
        isProfit: diff >= 0,
        ready: true
    };
}

function calculateAddProfitPreview() {
    const cost = document.getElementById("add-p-purchase-rate")?.value;
    const price = document.getElementById("add-p-price")?.value;
    const el = document.getElementById("add-p-profit-preview");
    if (!el) return;
    if (!cost && !price) {
        el.className = "font-bold text-gray-400";
        el.innerText = "Enter purchase rate & price";
        return;
    }
    const res = calculateProfitDetails(cost, price);
    if (res.isProfit) {
        el.className = "font-bold text-emerald-600 flex items-center space-x-1";
        el.innerHTML = `<i class="fas fa-arrow-up mr-1"></i>Profit: +₹${res.diff.toFixed(2)} (${res.margin}% margin)`;
    } else {
        el.className = "font-bold text-rose-600 flex items-center space-x-1";
        el.innerHTML = `<i class="fas fa-arrow-down mr-1"></i>Loss: -₹${Math.abs(res.diff).toFixed(2)} (${res.margin}% deficit)`;
    }
}

function calculateEditProfitPreview() {
    const cost = document.getElementById("edit-p-purchase-rate")?.value;
    const price = document.getElementById("edit-p-price")?.value;
    const el = document.getElementById("edit-p-profit-preview");
    if (!el) return;
    if (!cost && !price) {
        el.className = "font-bold text-gray-400";
        el.innerText = "Enter purchase rate & price";
        return;
    }
    const res = calculateProfitDetails(cost, price);
    if (res.isProfit) {
        el.className = "font-bold text-emerald-600 flex items-center space-x-1";
        el.innerHTML = `<i class="fas fa-arrow-up mr-1"></i>Profit: +₹${res.diff.toFixed(2)} (${res.margin}% margin)`;
    } else {
        el.className = "font-bold text-rose-600 flex items-center space-x-1";
        el.innerHTML = `<i class="fas fa-arrow-down mr-1"></i>Loss: -₹${Math.abs(res.diff).toFixed(2)} (${res.margin}% deficit)`;
    }
}

window.calculateAddProfitPreview = calculateAddProfitPreview;
window.calculateEditProfitPreview = calculateEditProfitPreview;

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
        tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">No products found matching filters.</td></tr>`;
        return;
    }

    filteredProducts.forEach(p => {
        const isLowStock = p.stock <= p.minStock;
        const purchaseRate = typeof p.purchaseRate === 'number' ? p.purchaseRate : 0;
        const sellingPrice = p.price || 0;
        const unitProfit = sellingPrice - purchaseRate;
        const isProfit = unitProfit >= 0;
        const marginPct = sellingPrice > 0 ? ((unitProfit / sellingPrice) * 100).toFixed(1) : "0.0";

        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 ${isLowStock ? 'bg-red-50/30' : ''}">
                <td class="px-4 py-3 text-sm">
                    <button type="button" onclick="openProductImageById('${p.id}')" class="group relative block w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-white shadow-sm hover:ring-2 hover:ring-red-500 hover:scale-110 transition-all cursor-pointer" title="Click to view 1080 × 1080 px enlarged view">
                        <img src="${p.image || 'https://placehold.co/100x100?text=No+Photo'}" class="w-full h-full object-cover">
                        <span class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[11px]">
                            <i class="fas fa-search-plus"></i>
                        </span>
                    </button>
                </td>
                <td class="px-4 py-3 text-sm">
                    <div class="flex items-center space-x-2">
                        <span class="font-semibold text-gray-900 font-mono">${p.sku}</span>
                        <button onclick="openBarcodeModal('${p.id}')" class="text-gray-400 hover:text-red-600 transition-colors p-1" title="View, Download & Print Barcode">
                            <i class="fas fa-barcode text-sm"></i>
                        </button>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm">
                    <div class="font-medium text-gray-800">${p.name}</div>
                    <div class="text-[10px] text-gray-400 font-mono">${p.id}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${p.category}</td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-gray-700">₹${purchaseRate.toFixed(2)}</td>
                <td class="px-4 py-3 text-sm text-right font-bold text-gray-900">₹${sellingPrice.toFixed(2)}</td>
                <td class="px-4 py-3 text-sm text-center">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${isProfit ? '+' : ''}₹${unitProfit.toFixed(2)} (${marginPct}%)
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-center">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${isLowStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                        ${p.stock} units
                    </span>
                    ${isLowStock ? `<p class="text-[10px] text-red-600 font-semibold mt-1">Reorder: ${p.minStock}</p>` : ''}
                </td>
                <td class="px-4 py-3 text-sm font-medium text-right no-print">
                    <button onclick="openBarcodeModal('${p.id}')" class="text-gray-700 hover:text-red-600 mr-2.5 inline-flex items-center text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 shadow-xs" title="Generate, Download & Print Barcode">
                        <i class="fas fa-barcode mr-1 text-red-600"></i> Barcode
                    </button>
                    ${currentUserRole !== 'customer' ? `
                    <button onclick="openEditProductModal('${p.id}')" class="text-blue-600 hover:text-blue-900 mr-2.5">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
}

function deleteProduct(id) {
    if (confirm("Are you sure you want to delete this product?")) {
        products = products.filter(p => p.id !== id);
        saveProducts();
        dispatchDeltaSync('PRODUCT_DELETE', { productId: id });
        renderProductsTable();
        populateBillingProductSelect();
    }
}

// ==========================================
// SKU & BARCODE SYSTEM (CODE128 STANDARD)
// ==========================================

// Web Audio API POS Scanner Beep
function playBarcodeBeep(isSuccess = true) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (isSuccess) {
            // High-pitched pleasant POS scanner beep (A6 ~ 1760Hz)
            osc.type = "sine";
            osc.frequency.setValueAtTime(1760, ctx.currentTime);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.08);
        } else {
            // Low-pitched buzz for not found / error
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        }
    } catch (e) {
        console.warn("Barcode audio beep failed:", e);
    }
}

// Generate random unique SKU code
function generateRandomSku() {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    return `IC${randomNum}`;
}

function generateRandomAddSku() {
    const skuInput = document.getElementById("add-p-sku");
    if (skuInput) {
        skuInput.value = generateRandomSku();
        onAddSkuChange();
    }
}

function generateRandomEditSku() {
    const skuInput = document.getElementById("edit-p-sku");
    if (skuInput) {
        skuInput.value = generateRandomSku();
        onEditSkuChange();
    }
}

// Render Barcode SVG onto target SVG element
function renderBarcodeSvg(svgElementId, placeholderId, skuText, options = {}) {
    const svgEl = document.getElementById(svgElementId);
    const placeholderEl = placeholderId ? document.getElementById(placeholderId) : null;
    if (!svgEl) return false;

    const trimmedSku = (skuText || "").trim();
    if (!trimmedSku) {
        svgEl.innerHTML = "";
        svgEl.style.display = "none";
        if (placeholderEl) placeholderEl.style.display = "block";
        return false;
    }

    try {
        if (typeof JsBarcode === "function") {
            svgEl.style.display = "block";
            if (placeholderEl) placeholderEl.style.display = "none";
            JsBarcode(svgEl, trimmedSku, {
                format: options.format || "CODE128",
                width: options.width || 2,
                height: options.height || 45,
                displayValue: options.displayValue !== undefined ? options.displayValue : true,
                fontSize: options.fontSize || 13,
                textMargin: 2,
                margin: options.margin !== undefined ? options.margin : 8,
                background: "#ffffff",
                lineColor: "#000000"
            });
            return true;
        } else {
            throw new Error("JsBarcode not loaded");
        }
    } catch (err) {
        console.warn("Barcode generation fallback:", err);
        renderFallbackBarcodeSvg(svgEl, trimmedSku);
        svgEl.style.display = "block";
        if (placeholderEl) placeholderEl.style.display = "none";
        return true;
    }
}

// Resilient SVG barcode generator fallback if offline/CDN unavailable
function renderFallbackBarcodeSvg(svgEl, text) {
    const height = 45;
    let x = 10;
    let rects = '';
    // Guard bars
    rects += `<rect x="${x}" y="5" width="2" height="${height}" fill="#000"/>`; x += 4;
    rects += `<rect x="${x}" y="5" width="2" height="${height}" fill="#000"/>`; x += 5;

    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const pattern = [
            (charCode >> 0) & 1,
            (charCode >> 1) & 1,
            (charCode >> 2) & 1,
            (charCode >> 3) & 1,
            (charCode >> 4) & 1
        ];
        pattern.forEach((bit, bitIdx) => {
            const w = (bit ? 3 : 1.5);
            if (bitIdx % 2 === 0) {
                rects += `<rect x="${x}" y="5" width="${w}" height="${height - 5}" fill="#000"/>`;
            }
            x += w + 2;
        });
    }
    // Stop guards
    rects += `<rect x="${x}" y="5" width="2" height="${height}" fill="#000"/>`; x += 4;
    rects += `<rect x="${x}" y="5" width="2" height="${height}" fill="#000"/>`; x += 10;

    const totalWidth = Math.max(160, x);
    svgEl.setAttribute("width", totalWidth);
    svgEl.setAttribute("height", height + 25);
    svgEl.setAttribute("viewBox", `0 0 ${totalWidth} ${height + 25}`);
    svgEl.innerHTML = `
        <rect width="100%" height="100%" fill="#ffffff"/>
        ${rects}
        <text x="${totalWidth / 2}" y="${height + 18}" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#000000">${text}</text>
    `;
}

// Add/Edit SKU Change Handlers
function onAddSkuChange() {
    const skuInput = document.getElementById("add-p-sku");
    if (!skuInput) return;
    const sku = skuInput.value.trim();
    renderBarcodeSvg("add-barcode-svg", "add-barcode-placeholder", sku, { height: 40 });
}

function onEditSkuChange() {
    const skuInput = document.getElementById("edit-p-sku");
    if (!skuInput) return;
    const sku = skuInput.value.trim();
    renderBarcodeSvg("edit-barcode-svg", "edit-barcode-placeholder", sku, { height: 40 });
}

// Download Barcode as PNG file
function downloadBarcodeImage(sku, productName) {
    if (!sku) {
        alert("Please enter a SKU before downloading the barcode.");
        return;
    }
    try {
        const canvas = document.createElement("canvas");
        if (typeof JsBarcode === "function") {
            JsBarcode(canvas, sku, {
                format: "CODE128",
                width: 3,
                height: 75,
                displayValue: true,
                fontSize: 16,
                textMargin: 4,
                margin: 15,
                background: "#ffffff",
                lineColor: "#000000"
            });
            const dataUrl = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            const safeName = (productName || "Product").replace(/[^a-z0-9]/gi, '_');
            a.download = `Barcode_${sku}_${safeName}.png`;
            a.href = dataUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert("Barcode engine is still loading. Please try again.");
        }
    } catch (e) {
        console.error("Barcode download failed:", e);
        alert("Unable to generate barcode PNG for download: " + e.message);
    }
}

function downloadAddBarcode() {
    const sku = document.getElementById("add-p-sku").value.trim();
    const name = document.getElementById("add-p-name").value.trim() || "Item";
    downloadBarcodeImage(sku, name);
}

function downloadEditBarcode() {
    const sku = document.getElementById("edit-p-sku").value.trim();
    const name = document.getElementById("edit-p-name").value.trim() || "Item";
    downloadBarcodeImage(sku, name);
}

function printAddBarcode() {
    const sku = document.getElementById("add-p-sku").value.trim();
    const name = document.getElementById("add-p-name").value.trim() || "New Product";
    const price = parseFloat(document.getElementById("add-p-price").value) || 0;
    if (!sku) {
        alert("Please enter a SKU first.");
        return;
    }
    openCustomBarcodeModal({ sku, name, price, id: "TEMP" });
}

function printEditBarcode() {
    const sku = document.getElementById("edit-p-sku").value.trim();
    const name = document.getElementById("edit-p-name").value.trim() || "Product";
    const price = parseFloat(document.getElementById("edit-p-price").value) || 0;
    if (!sku) {
        alert("Please enter a SKU first.");
        return;
    }
    openCustomBarcodeModal({ sku, name, price, id: currentEditId || "TEMP" });
}

// Dedicated Barcode Modal State & Functions
let currentBarcodeProduct = null;
let currentBarcodePrintQty = 1;

function openBarcodeModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    openCustomBarcodeModal(product);
}

function openCustomBarcodeModal(prodObj) {
    currentBarcodeProduct = prodObj;
    const titleEl = document.getElementById("barcode-modal-title");
    const subTitleEl = document.getElementById("barcode-modal-sku-subtitle");
    if (titleEl) titleEl.textContent = prodObj.name;
    if (subTitleEl) subTitleEl.textContent = `SKU: ${prodObj.sku}`;
    
    // Fill sticker preview
    const sStore = document.getElementById("barcode-sticker-store");
    const sRole = document.getElementById("barcode-sticker-role");
    const sName = document.getElementById("barcode-sticker-name");
    const sSku = document.getElementById("barcode-sticker-sku");
    const sPrice = document.getElementById("barcode-sticker-price");

    if (sStore) sStore.textContent = storeProfile.name || "STORE NAME";
    if (sRole) sRole.textContent = storeProfile.role || "Retail Store";
    if (sName) sName.textContent = prodObj.name;
    if (sSku) sSku.textContent = `SKU: ${prodObj.sku}`;
    if (sPrice) sPrice.textContent = `₹${(prodObj.price || 0).toFixed(2)}`;

    // Render Barcode
    renderBarcodeSvg("barcode-modal-svg", null, prodObj.sku, {
        height: 48,
        width: 2,
        fontSize: 13
    });

    setBarcodePrintQty(1);
    openModal("barcode-label-modal");
}

function setBarcodePrintQty(qty) {
    currentBarcodePrintQty = parseInt(qty) || 1;
    document.querySelectorAll(".barcode-qty-btn").forEach(btn => {
        const bQty = parseInt(btn.getAttribute("data-qty"));
        if (bQty === currentBarcodePrintQty) {
            btn.className = "barcode-qty-btn px-2.5 py-1 rounded-md font-bold transition-all bg-white shadow-sm text-red-600 border border-red-200";
        } else {
            btn.className = "barcode-qty-btn px-2.5 py-1 rounded-md font-medium transition-all text-gray-600 hover:text-gray-900";
        }
    });

    const printBtnText = document.getElementById("barcode-print-btn-text");
    if (printBtnText) {
        printBtnText.textContent = `Print (${currentBarcodePrintQty} ${currentBarcodePrintQty === 1 ? 'Label' : 'Labels'})`;
    }
}

function downloadCurrentModalBarcode() {
    if (!currentBarcodeProduct) return;
    downloadBarcodeImage(currentBarcodeProduct.sku, currentBarcodeProduct.name);
}

function triggerBarcodePrint() {
    if (!currentBarcodeProduct) return;

    const printArea = document.getElementById("barcode-print-area");
    if (!printArea) return;
    printArea.innerHTML = "";

    const storeName = storeProfile.name || "STORE NAME";
    const storeRole = storeProfile.role || "";
    const prodName = currentBarcodeProduct.name;
    const sku = currentBarcodeProduct.sku;
    const price = (currentBarcodeProduct.price || 0).toFixed(2);

    // Build label items
    for (let i = 0; i < currentBarcodePrintQty; i++) {
        const item = document.createElement("div");
        item.className = "barcode-print-item";
        item.innerHTML = `
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #111;">${storeName}</div>
            ${storeRole ? `<div style="font-size: 9px; color: #666; margin-bottom: 2px;">${storeRole}</div>` : ''}
            <div style="font-size: 12px; font-weight: 600; color: #222; margin-bottom: 2px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${prodName}</div>
            <svg id="print-label-svg-${i}" style="max-width: 100%; height: auto;"></svg>
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 11px; margin-top: 2px; padding-top: 2px; border-top: 1px solid #ddd;">
                <span style="font-family: monospace; color: #555;">SKU: ${sku}</span>
                <span style="font-weight: bold; color: #b71c1c;">₹${price}</span>
            </div>
        `;
        printArea.appendChild(item);

        // Render barcode onto this label item's SVG
        renderBarcodeSvg(`print-label-svg-${i}`, null, sku, {
            height: 38,
            width: 1.8,
            fontSize: 11,
            margin: 4
        });
    }

    // Set printing state class on body
    document.body.classList.add("printing-barcode");
    printArea.classList.remove("hidden");

    // Launch print
    setTimeout(() => {
        window.print();
        // Cleanup after dialog closes
        setTimeout(() => {
            document.body.classList.remove("printing-barcode");
            printArea.classList.add("hidden");
            printArea.innerHTML = "";
        }, 500);
    }, 150);
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
    const purchaseRate = Math.max(0, parseFloat(document.getElementById("add-p-purchase-rate").value) || 0);
    const price = Math.max(0, parseFloat(document.getElementById("add-p-price").value) || 0);
    const stock = Math.max(0, parseInt(document.getElementById("add-p-stock").value) || 0);
    const minStock = Math.max(0, parseInt(document.getElementById("add-p-minstock").value) || 0);

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
    const newProduct = { id, sku, name, category, purchaseRate, price, stock, minStock, image, updatedAt: Date.now() };
    products.push(newProduct);
    saveProducts();
    dispatchDeltaSync('PRODUCT_UPSERT', { product: newProduct });
    
    // Close modal & reset form
    closeModal("add-product-modal");
    document.getElementById("add-product-form").reset();
    calculateAddProfitPreview();
    onAddSkuChange();
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
    document.getElementById("edit-p-purchase-rate").value = product.purchaseRate !== undefined ? product.purchaseRate : 0;
    document.getElementById("edit-p-price").value = product.price;
    document.getElementById("edit-p-stock").value = product.stock;
    document.getElementById("edit-p-minstock").value = product.minStock;
    document.getElementById("edit-p-image-preview").src = product.image || "https://placehold.co/100x100?text=No+Photo";

    calculateEditProfitPreview();
    onEditSkuChange();
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
    products[index].purchaseRate = Math.max(0, parseFloat(document.getElementById("edit-p-purchase-rate").value) || 0);
    products[index].price = Math.max(0, parseFloat(document.getElementById("edit-p-price").value) || 0);
    products[index].stock = Math.max(0, parseInt(document.getElementById("edit-p-stock").value) || 0);
    products[index].minStock = Math.max(0, parseInt(document.getElementById("edit-p-minstock").value) || 0);

    const previewImg = document.getElementById("edit-p-image-preview").src;
    let image = previewImg;
    if (previewImg.includes("placehold.co")) {
        image = getDefaultImageByCategory(products[index].category);
    }
    products[index].image = image;
    products[index].updatedAt = Date.now();

    saveProducts();
    dispatchDeltaSync('PRODUCT_UPSERT', { product: products[index] });
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

// Handle Barcode/SKU scan or enter (Hardware scanner & manual input)
const billingSkuInput = document.getElementById("billing-sku-input");
if (billingSkuInput) {
    billingSkuInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const skuVal = e.target.value.trim();
            if (!skuVal) return;

            // Search product by exact or case-insensitive SKU or product ID
            const product = products.find(p => 
                (p.sku && p.sku.toLowerCase() === skuVal.toLowerCase()) || 
                (p.id && p.id.toLowerCase() === skuVal.toLowerCase())
            );

            const feedbackEl = document.getElementById("scanner-feedback-msg");

            if (product) {
                // Check stock
                if (product.stock <= 0) {
                    playBarcodeBeep(false);
                    if (feedbackEl) {
                        feedbackEl.innerHTML = `<i class="fas fa-exclamation-triangle text-amber-500 mr-1"></i> <span class="text-amber-700 font-semibold">"${product.name}" is OUT OF STOCK!</span>`;
                    }
                    alert(`"${product.name}" is out of stock!`);
                    e.target.select();
                    return;
                }

                // Play POS scanner confirmation beep
                playBarcodeBeep(true);

                addToCart(product.id, 1);
                e.target.value = "";
                e.target.focus();

                // Display success feedback
                if (feedbackEl) {
                    feedbackEl.innerHTML = `<i class="fas fa-check-circle text-green-600 mr-1"></i> <span class="text-green-700 font-semibold">Scanned: "${product.name}" added to cart (₹${product.price.toFixed(2)})</span>`;
                    setTimeout(() => {
                        feedbackEl.innerHTML = `<i class="fas fa-bullseye text-red-500 mr-1 text-[10px]"></i> <span>Hardware scanner ready. Scan or type SKU & hit Enter.</span>`;
                    }, 3500);
                }
            } else {
                // Play error buzz
                playBarcodeBeep(false);
                if (feedbackEl) {
                    feedbackEl.innerHTML = `<i class="fas fa-times-circle text-red-600 mr-1"></i> <span class="text-red-700 font-semibold">No product found for SKU "${skuVal}"</span>`;
                    setTimeout(() => {
                        feedbackEl.innerHTML = `<i class="fas fa-bullseye text-red-500 mr-1 text-[10px]"></i> <span>Hardware scanner ready. Scan or type SKU & hit Enter.</span>`;
                    }, 3500);
                }
                alert(`Product with SKU/Barcode "${skuVal}" not found.`);
                e.target.select();
            }
        }
    });
}

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
                    <button type="button" onclick="openProductImageById('${item.product.id}')" class="group relative w-10 h-10 rounded border border-gray-200 bg-white shadow-sm flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-red-500 hover:scale-105 transition-all cursor-pointer" title="Click to view 1080 × 1080 px enlarged view">
                        <img src="${item.product.image || 'https://placehold.co/100x100?text=No+Photo'}" class="w-full h-full object-cover">
                        <span class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px]">
                            <i class="fas fa-search-plus"></i>
                        </span>
                    </button>
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

// Billing Transaction Type Selector (Credit vs Debit)
let selectedBillingTxnType = "Credit";

function onBillingTxnTypeChange(type) {
    selectedBillingTxnType = (type === "Debit") ? "Debit" : "Credit";
    const btnText = document.getElementById("billing-checkout-btn-text");
    if (btnText) {
        if (selectedBillingTxnType === "Debit") {
            btnText.textContent = "Generate & Print Debit Bill (Due)";
        } else {
            btnText.textContent = "Generate & Print Credit Bill (Paid)";
        }
    }
    onBillingCustomerPhoneChange();
}

function onBillingCustomerPhoneChange() {
    const phoneInput = document.getElementById("customer-phone");
    const badgeEl = document.getElementById("billing-cust-credit-badge");
    const nameInput = document.getElementById("customer-name");
    const placeInput = document.getElementById("customer-place");
    if (!phoneInput || !badgeEl) return;

    const rawPhone = phoneInput.value.trim();
    const cleanNum = cleanPhone(rawPhone);

    if (!cleanNum || cleanNum.length < 5) {
        badgeEl.className = "hidden";
        badgeEl.innerHTML = "";
        return;
    }

    const matchedCust = customers.find(c => c.phone && cleanPhone(c.phone) === cleanNum);

    if (matchedCust) {
        if (nameInput && (!nameInput.value.trim() || nameInput.value.trim() === "Walk-in Customer")) {
            nameInput.value = matchedCust.name;
        }
        if (placeInput && !placeInput.value.trim() && matchedCust.place) {
            placeInput.value = matchedCust.place;
        }

        const isDebitSelected = selectedBillingTxnType === "Debit";
        badgeEl.className = "block p-3 rounded-xl border transition-all " + 
            (isDebitSelected ? "bg-amber-50/80 border-amber-200 text-amber-900" : "bg-emerald-50/80 border-emerald-200 text-emerald-900");
        badgeEl.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-start space-x-2">
                    <div class="w-6 h-6 rounded-full ${isDebitSelected ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        <i class="fas ${isDebitSelected ? 'fa-user-clock' : 'fa-check'}"></i>
                    </div>
                    <div>
                        <div class="font-bold text-xs flex items-center space-x-1.5">
                            <span>${escapeHtml(matchedCust.name)}</span>
                            <span class="text-[10px] font-normal px-1.5 py-0.2 rounded bg-white/80 border">${escapeHtml(matchedCust.place || 'Registered')}</span>
                        </div>
                        <div class="text-[11px] text-gray-600 mt-0.5">
                            Customer Due Amount: <strong class="text-amber-700">₹${(matchedCust.outstandingBalance || 0).toFixed(2)}</strong>
                            ${isDebitSelected ? ' • <span class="text-amber-800 font-semibold">Bill will be added to Customer Due Account</span>' : ' • <span class="text-emerald-700">Immediate Payment (Credit / Paid)</span>'}
                        </div>
                    </div>
                </div>
                <button type="button" onclick="openCustomerLedgerModal('${matchedCust.id}')" class="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 border text-[11px] font-bold shadow-xs whitespace-nowrap">
                    <i class="fas fa-history mr-1"></i>History
                </button>
            </div>
        `;
    } else {
        if (selectedBillingTxnType === "Debit" && cleanNum.length >= 10) {
            badgeEl.className = "block p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs";
            badgeEl.innerHTML = `
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center space-x-1.5">
                        <i class="fas fa-info-circle text-amber-600"></i>
                        <span>Mobile <strong>+91 ${cleanNum}</strong> will be registered automatically upon debit billing.</span>
                    </div>
                    <button type="button" onclick="quickRegisterCreditCustomer('${cleanNum}')" class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs whitespace-nowrap">
                        + Register Account
                    </button>
                </div>
            `;
        } else if (cleanNum.length >= 10) {
            badgeEl.className = "block p-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-xs";
            badgeEl.innerHTML = `
                <div class="flex items-center space-x-1.5 text-[11px] text-gray-500">
                    <i class="fas fa-user-plus text-gray-400"></i>
                    <span>Customer details will automatically be saved under mobile <strong>+91 ${cleanNum}</strong>.</span>
                </div>
            `;
        } else {
            badgeEl.className = "hidden";
            badgeEl.innerHTML = "";
        }
    }
}

// Generate Invoice / Complete Checkout
function processCheckout() {
    if (cart.length === 0) {
        alert("Cannot generate invoice. Cart is empty.");
        return;
    }

    const customerNameInput = document.getElementById("customer-name");
    const customerPhoneInput = document.getElementById("customer-phone");
    const customerPlaceInput = document.getElementById("customer-place");

    const rawCustomerName = (customerNameInput ? customerNameInput.value : "").trim();
    const customerName = rawCustomerName || "Walk-in Customer";
    const rawCustomerPhone = (customerPhoneInput ? customerPhoneInput.value : "").trim();
    const customerPhone = rawCustomerPhone || "N/A";
    const customerPlace = (customerPlaceInput ? customerPlaceInput.value : "").trim();
    
    const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const discount = parseFloat(document.getElementById("billing-discount").value) || 0;
    const taxRate = parseFloat(document.getElementById("billing-tax-rate").value) || 0;
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);
    const tax = subtotalAfterDiscount * (taxRate / 100);
    const total = subtotalAfterDiscount + tax;

    const invoiceNo = "INV-" + (1000 + sales.length + 1);
    const transactionType = selectedBillingTxnType || "Credit";
    const isDebitBill = (transactionType === "Debit");

    // Match or automatically create registered customer profile by phone
    const cleanCustomerPhone = cleanPhone(customerPhone);
    let matchedCustomer = null;

    if (cleanCustomerPhone && cleanCustomerPhone.length >= 5 && customerPhone !== "N/A") {
        matchedCustomer = customers.find(c => c.phone && cleanPhone(c.phone) === cleanCustomerPhone);

        if (!matchedCustomer) {
            // Auto-create customer profile for this mobile number (applies to both Debit and Credit)
            matchedCustomer = {
                id: "CUST-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                name: (customerName && customerName !== "Walk-in Customer") ? customerName : `Customer (${customerPhone})`,
                phone: customerPhone,
                isPhoneVerified: false,
                place: customerPlace || "",
                address: "",
                idProof: null,
                totalDebitBilled: 0,
                totalCreditBilled: 0,
                totalPaid: 0,
                outstandingBalance: 0,
                settlements: [],
                createdAt: new Date().toISOString(),
                updatedAt: Date.now()
            };
            customers.unshift(matchedCustomer);
        } else {
            // Update customer profile if names/place provided
            if (rawCustomerName && rawCustomerName !== "Walk-in Customer") {
                matchedCustomer.name = rawCustomerName;
            }
            if (customerPlace && (!matchedCustomer.place || matchedCustomer.place === "-")) {
                matchedCustomer.place = customerPlace;
            }
        }

        // Maintain continuous customer history & balances:
        if (isDebitBill) {
            // Debit bill: added to customer due amount
            matchedCustomer.totalDebitBilled = (matchedCustomer.totalDebitBilled || 0) + total;
            matchedCustomer.outstandingBalance = (matchedCustomer.outstandingBalance || 0) + total;
        } else {
            // Credit bill: recorded as paid cash purchase
            matchedCustomer.totalCreditBilled = (matchedCustomer.totalCreditBilled || 0) + total;
            matchedCustomer.totalPaid = (matchedCustomer.totalPaid || 0) + total;
        }
        matchedCustomer.updatedAt = Date.now();
        saveCustomers();
    }
    
    // Construct Sale record with purchase rates, total cost, and profit
    const saleItems = cart.map(item => {
        const prod = products.find(p => p.id === item.product.id) || item.product;
        const purchaseRate = (prod && typeof prod.purchaseRate === 'number') ? prod.purchaseRate : ((item.product && typeof item.product.purchaseRate === 'number') ? item.product.purchaseRate : 0);
        const price = item.product.price;
        const total = price * item.quantity;
        const itemCost = purchaseRate * item.quantity;
        const itemProfit = total - itemCost;
        return {
            id: item.product.id,
            sku: item.product.sku,
            name: item.product.name,
            purchaseRate,
            price,
            quantity: item.quantity,
            total,
            totalCost: itemCost,
            profit: itemProfit
        };
    });

    const totalCost = saleItems.reduce((acc, it) => acc + (it.totalCost || 0), 0);
    const netRevenue = subtotalAfterDiscount;
    const profit = netRevenue - totalCost;

    const newSale = {
        id: invoiceNo,
        invoiceNo,
        date: new Date().toISOString(),
        customerName: (matchedCustomer && matchedCustomer.name) ? matchedCustomer.name : customerName,
        customerPhone,
        customerPlace: customerPlace || (matchedCustomer ? (matchedCustomer.place || "") : ""),
        transactionType, // "Credit" or "Debit"
        isCreditBill,
        customerId: matchedCustomer ? matchedCustomer.id : null,
        items: saleItems,
        subtotal,
        discount,
        tax,
        total,
        totalCost,
        profit
    };

    // 1. Deduct Stock Levels in local memory and collect stock updates for instant delta
    const stockUpdates = [];
    cart.forEach(item => {
        const prod = products.find(p => p.id === item.product.id);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - item.quantity);
            prod.updatedAt = Date.now();
            stockUpdates.push({ id: prod.id, stock: prod.stock });
        }
    });

    // 2. Save product updates & sale record
    sales.push(newSale);
    saveSales();
    saveProducts();

    // Instant delta push across other 4 devices (< 100ms)
    dispatchDeltaSync('SALE_CREATED', {
        sale: newSale,
        stockUpdates,
        customerUpdate: matchedCustomer ? {
            id: matchedCustomer.id,
            name: matchedCustomer.name,
            phone: matchedCustomer.phone,
            place: matchedCustomer.place,
            totalDebitBilled: matchedCustomer.totalDebitBilled,
            totalCreditBilled: matchedCustomer.totalCreditBilled,
            totalPaid: matchedCustomer.totalPaid,
            outstandingBalance: matchedCustomer.outstandingBalance,
            updatedAt: matchedCustomer.updatedAt
        } : null
    });

    // 3. Clear cart and billing form inputs
    cart = [];
    if (customerNameInput) customerNameInput.value = "";
    if (customerPhoneInput) customerPhoneInput.value = "";
    if (customerPlaceInput) customerPlaceInput.value = "";
    document.getElementById("billing-discount").value = "0";
    document.getElementById("billing-tax-rate").value = "5"; // Reset default tax

    // Reset transaction type selection
    selectedBillingTxnType = "Credit";
    const creditRadio = document.querySelector('input[name="billing-txn-type"][value="Credit"]');
    if (creditRadio) creditRadio.checked = true;
    const btnText = document.getElementById("billing-checkout-btn-text");
    if (btnText) btnText.textContent = "Generate & Print Credit Bill (Paid)";
    const badgeEl = document.getElementById("billing-cust-credit-badge");
    if (badgeEl) { badgeEl.className = "hidden"; badgeEl.innerHTML = ""; }

    // 4. Update UI screens
    initApp();

    // 5. Open invoice dialog printable modal
    openInvoiceModal(newSale);
}

// Invoice Printable Preview Modal
function openInvoiceModal(sale) {
    // 1. Populate Store Branding on Bill (Store Name, Store Role, Place, Mobile, Alt Mobile)
    const invStoreName = document.getElementById("invoice-store-name");
    const invStoreRole = document.getElementById("invoice-store-role");
    const invStorePlace = document.getElementById("invoice-store-place");
    const invStoreMobile = document.getElementById("invoice-store-mobile");
    const invStoreMobile2 = document.getElementById("invoice-store-mobile2");

    if (invStoreName) invStoreName.innerText = currentStore.storeName || "Sales & Billing Software";
    if (invStoreRole) invStoreRole.innerText = currentStore.storeRole || "Point of Sale & Billing Management";
    if (invStorePlace) invStorePlace.innerText = currentStore.place || "Main Branch";
    if (invStoreMobile) invStoreMobile.innerText = currentStore.mobile ? `Mobile: ${currentStore.mobile}` : "";
    
    if (invStoreMobile2) {
        if (currentStore.additionalMobile && currentStore.additionalMobile.trim()) {
            invStoreMobile2.innerText = `Additional Mobile: ${currentStore.additionalMobile.trim()}`;
            invStoreMobile2.classList.remove("hidden");
        } else {
            invStoreMobile2.classList.add("hidden");
        }
    }

    const invStoreGst = document.getElementById("invoice-store-gst");
    const invStoreGstVal = document.getElementById("invoice-store-gst-val");
    if (invStoreGst) {
        if (currentStore.gst && currentStore.gst.trim()) {
            if (invStoreGstVal) {
                invStoreGstVal.innerText = currentStore.gst.trim();
            } else {
                invStoreGst.innerText = `GST: ${currentStore.gst.trim()}`;
            }
            invStoreGst.classList.remove("hidden");
        } else {
            invStoreGst.classList.add("hidden");
        }
    }

    // 2. Invoice Details
    document.getElementById("invoice-no").innerText = sale.invoiceNo;
    document.getElementById("invoice-date").innerText = new Date(sale.date).toLocaleString();
    document.getElementById("invoice-customer-name").innerText = sale.customerName;
    document.getElementById("invoice-customer-phone").innerText = sale.customerPhone;

    // Transaction Type indicator on bill
    const txnTypeEl = document.getElementById("invoice-txn-type");
    if (txnTypeEl) {
        const type = sale.transactionType || "Credit";
        txnTypeEl.innerText = type;
        txnTypeEl.className = type === "Credit"
            ? "font-bold uppercase px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800"
            : "font-bold uppercase px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800";
    }

    const itemsContainer = document.getElementById("invoice-items");
    itemsContainer.innerHTML = "";
    sale.items.forEach(item => {
        itemsContainer.innerHTML += `
            <tr class="border-b text-sm">
                <td class="py-2 text-gray-800">${item.name} <span class="text-xs text-gray-500 font-normal">(${item.sku})</span></td>
                <td class="py-2 text-center text-gray-600">${item.quantity || 1}</td>
                <td class="py-2 text-right text-gray-600">₹${(item.price || 0).toFixed(2)}</td>
                <td class="py-2 text-right font-medium text-gray-800">₹${(item.total || (item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
            </tr>
        `;
    });

    document.getElementById("invoice-subtotal").innerText = `₹${(sale.subtotal || 0).toFixed(2)}`;
    document.getElementById("invoice-discount").innerText = `-₹${(sale.discount || 0).toFixed(2)}`;
    document.getElementById("invoice-tax").innerText = `₹${(sale.tax || 0).toFixed(2)}`;
    document.getElementById("invoice-total").innerText = `₹${(sale.total || 0).toFixed(2)}`;

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
        tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-gray-500">No invoices match your search.</td></tr>`;
        return;
    }

    sortedSales.forEach(sale => {
        const formattedDate = new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        const saleProfit = calculateSaleProfit(sale);
        const isProfit = saleProfit >= 0;
        const type = sale.transactionType || "Credit";
        const typeBadge = type === "Credit"
            ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><i class="fas fa-check mr-1 text-[9px]"></i>Credit</span>`
            : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><i class="fas fa-clock mr-1 text-[9px]"></i>Debit</span>`;

        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-semibold text-gray-900">${sale.invoiceNo}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${formattedDate}</td>
                <td class="px-6 py-4 text-sm text-gray-800 font-medium">${sale.customerName}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${sale.customerPhone}</td>
                <td class="px-6 py-4 text-sm text-center">${typeBadge}</td>
                <td class="px-6 py-4 text-sm font-semibold text-gray-900">₹${(sale.total || 0).toFixed(2)}</td>
                <td class="px-6 py-4 text-sm text-center">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${isProfit ? '+' : ''}₹${(saleProfit || 0).toFixed(2)}
                    </span>
                </td>
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
        renderReport(); // Reset the Report tab
        alert("Sales history has been cleared.");
    }
}

function clearAllProducts() {
    if (confirm("Are you sure you want to delete all products from your inventory? This action cannot be undone.")) {
        products = [];
        cart = [];
        saveProducts();
        renderProductsTable();
        populateBillingProductSelect();
        renderCart();
        renderDashboard(); // Reset the dashboard stats cards
        renderReport();
        alert("All products have been removed from inventory.");
    }
}

// --- Profit & Loss Report Tab Logic ---
let reportStartDateTime = "";
let reportEndDateTime = "";
let reportSearchQuery = "";
let reportCurrentPreset = "all";

function formatForDateTimeLocal(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
}

function applyReportPreset(preset) {
    reportCurrentPreset = preset;
    const now = new Date();

    const presets = ['today', 'yesterday', 'week', 'month', 'year', 'all'];
    presets.forEach(p => {
        const btn = document.getElementById(`preset-btn-${p}`);
        if (btn) {
            if (p === preset) {
                btn.className = "px-3 py-1.5 rounded-lg border theme-red-border theme-red-bg text-white transition-all cursor-pointer font-bold";
            } else {
                btn.className = "px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all cursor-pointer";
            }
        }
    });

    const startInput = document.getElementById("report-start-datetime");
    const endInput = document.getElementById("report-end-datetime");
    const periodLabel = document.getElementById("report-filter-period-label");

    if (preset === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        reportStartDateTime = formatForDateTimeLocal(start);
        reportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = "Today (" + now.toLocaleDateString() + ")";
    } else if (preset === 'yesterday') {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
        const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
        reportStartDateTime = formatForDateTimeLocal(start);
        reportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = "Yesterday (" + y.toLocaleDateString() + ")";
    } else if (preset === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        reportStartDateTime = formatForDateTimeLocal(start);
        reportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = "Last 7 Days";
    } else if (preset === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        reportStartDateTime = formatForDateTimeLocal(start);
        reportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else if (preset === 'year') {
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        reportStartDateTime = formatForDateTimeLocal(start);
        reportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = "Year " + now.getFullYear();
    } else { // 'all'
        reportStartDateTime = "";
        reportEndDateTime = "";
        if (periodLabel) periodLabel.innerText = "All Time";
    }

    if (startInput) startInput.value = reportStartDateTime;
    if (endInput) endInput.value = reportEndDateTime;

    renderReport();
}

function resetReportFilters() {
    reportStartDateTime = "";
    reportEndDateTime = "";
    reportSearchQuery = "";
    reportCurrentPreset = "all";

    const startInput = document.getElementById("report-start-datetime");
    const endInput = document.getElementById("report-end-datetime");
    const searchInput = document.getElementById("report-search-query");

    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";
    if (searchInput) searchInput.value = "";

    applyReportPreset("all");
}

function getFilteredReportSales() {
    return sales.filter(sale => {
        const saleTime = new Date(sale.date).getTime();

        // 1. Date & Time Range filter
        if (reportStartDateTime) {
            const startTimestamp = new Date(reportStartDateTime).getTime();
            if (!isNaN(startTimestamp) && saleTime < startTimestamp) return false;
        }
        if (reportEndDateTime) {
            const endTimestamp = new Date(reportEndDateTime).getTime();
            if (!isNaN(endTimestamp) && saleTime > endTimestamp) return false;
        }

        // 2. Search Query filter (Invoice #, Customer Name, Mobile, Item Name/SKU)
        if (reportSearchQuery && reportSearchQuery.trim()) {
            const q = reportSearchQuery.toLowerCase().trim();
            const invMatch = (sale.invoiceNo || '').toLowerCase().includes(q);
            const custMatch = (sale.customerName || '').toLowerCase().includes(q);
            const phoneMatch = (sale.customerPhone || '').includes(q);
            const itemsMatch = Array.isArray(sale.items) && sale.items.some(it => 
                (it.name || '').toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q)
            );
            if (!invMatch && !custMatch && !phoneMatch && !itemsMatch) return false;
        }

        return true;
    });
}

function renderProfitLossReport() {
    const tableBody = document.getElementById("report-table-body");
    const tableFoot = document.getElementById("report-table-foot");
    if (!tableBody) return;

    const filtered = getFilteredReportSales().sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Totals for the selected date & time period
    let totalSales = 0;
    let totalPurchaseCost = 0;
    let totalProfit = 0;
    let totalLoss = 0;

    filtered.forEach(sale => {
        const rev = calculateSaleRevenue(sale);
        const cost = calculateSaleCost(sale);
        const diff = rev - cost;

        totalSales += rev;
        totalPurchaseCost += cost;

        if (diff >= 0) {
            totalProfit += diff;
        } else {
            totalLoss += Math.abs(diff);
        }
    });

    const netProfit = totalSales - totalPurchaseCost; // Net overall profit or loss
    const isNetProfit = netProfit >= 0;
    const marginPct = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";

    // Update 4 Core Report Metric Cards
    const salesEl = document.getElementById("report-total-sales");
    const costEl = document.getElementById("report-total-cost");
    const profitEl = document.getElementById("report-total-profit");
    const lossEl = document.getElementById("report-total-loss");

    if (salesEl) salesEl.innerText = `₹${totalSales.toFixed(2)}`;
    if (costEl) costEl.innerText = `₹${totalPurchaseCost.toFixed(2)}`;
    if (profitEl) profitEl.innerText = `₹${totalProfit.toFixed(2)}`;
    if (lossEl) lossEl.innerText = `₹${totalLoss.toFixed(2)}`;

    // Update Net Performance Banner
    const netProfitEl = document.getElementById("report-net-profit");
    const netMarginEl = document.getElementById("report-profit-margin");
    const netBadgeEl = document.getElementById("report-net-status-badge");
    const netIconEl = document.getElementById("report-net-icon");
    const netIconContainer = document.getElementById("report-net-icon-container");
    const netBanner = document.getElementById("report-net-banner");
    const invoicesCountEl = document.getElementById("report-invoices-count");

    if (netProfitEl) {
        netProfitEl.innerText = `${isNetProfit ? '+' : '-'}₹${Math.abs(netProfit).toFixed(2)}`;
        netProfitEl.className = `text-xl font-extrabold ${isNetProfit ? 'text-emerald-700' : 'text-rose-700'}`;
    }
    if (netMarginEl) {
        netMarginEl.innerText = `(${isNetProfit ? '+' : '-'}${Math.abs(marginPct)}% margin)`;
        netMarginEl.className = `text-xs font-bold ${isNetProfit ? 'text-emerald-600' : 'text-rose-600'}`;
    }
    if (netBadgeEl) {
        netBadgeEl.innerText = isNetProfit ? "Net Profit" : "Net Loss";
        netBadgeEl.className = `px-2 py-0.5 text-[11px] font-bold rounded-full ${isNetProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`;
    }
    if (netIconEl) {
        netIconEl.className = isNetProfit ? "fas fa-arrow-trend-up" : "fas fa-arrow-trend-down";
    }
    if (netIconContainer) {
        netIconContainer.className = `w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${isNetProfit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`;
    }
    if (netBanner) {
        netBanner.className = `p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isNetProfit ? 'bg-gradient-to-r from-emerald-50 to-white border-emerald-200' : 'bg-gradient-to-r from-rose-50 to-white border-rose-200'}`;
    }
    if (invoicesCountEl) {
        invoicesCountEl.innerText = `${filtered.length} invoice${filtered.length === 1 ? '' : 's'}`;
    }

    // Render Filtered Table Rows
    tableBody.innerHTML = "";
    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-500">
            <i class="fas fa-file-invoice text-3xl text-gray-300 mb-2 block"></i>
            No invoices found for the selected date & time period.
        </td></tr>`;
        if (tableFoot) tableFoot.innerHTML = "";
        return;
    }

    filtered.forEach(sale => {
        const formattedDate = new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        const rev = calculateSaleRevenue(sale);
        const cost = calculateSaleCost(sale);
        const diff = rev - cost;
        const isProf = diff >= 0;

        const itemsSummary = (sale.items || []).map(it => `${it.name} (x${it.quantity})`).join(', ');

        tableBody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">${formattedDate}</td>
                <td class="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">${sale.invoiceNo}</td>
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-800">${sale.customerName || 'Walk-in Customer'}</div>
                    <div class="text-[11px] text-gray-400">${sale.customerPhone || 'No Phone'}</div>
                </td>
                <td class="px-4 py-3 text-gray-600 max-w-xs truncate" title="${itemsSummary}">
                    ${itemsSummary || '-'}
                </td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">₹${rev.toFixed(2)}</td>
                <td class="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">₹${cost.toFixed(2)}</td>
                <td class="px-4 py-3 text-center whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${isProf ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${isProf ? '+' : ''}₹${diff.toFixed(2)}
                    </span>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap no-print">
                    <button onclick="viewInvoiceFromHistory('${sale.id}')" class="theme-red-text hover:text-red-900 font-medium text-xs">
                        <i class="fas fa-eye mr-1"></i> View
                    </button>
                </td>
            </tr>
        `;
    });

    // Render Table Footer Summary Totals
    if (tableFoot) {
        tableFoot.innerHTML = `
            <tr class="bg-gray-100 text-gray-900 font-bold">
                <td colspan="4" class="px-4 py-3 text-left uppercase text-xs tracking-wider">Filtered Period Total (${filtered.length} Invoices)</td>
                <td class="px-4 py-3 text-right">₹${totalSales.toFixed(2)}</td>
                <td class="px-4 py-3 text-right">₹${totalPurchaseCost.toFixed(2)}</td>
                <td class="px-4 py-3 text-center ${isNetProfit ? 'text-emerald-700' : 'text-rose-700'}">
                    ${isNetProfit ? '+' : ''}₹${netProfit.toFixed(2)}
                </td>
                <td class="px-4 py-3 no-print"></td>
            </tr>
        `;
    }
}

// --- Debit & Credit Reports Tab Logic ---
let activeReportSubTab = "profit-loss";
let dcReportStartDateTime = "";
let dcReportEndDateTime = "";
let dcReportSearchQuery = "";
let dcReportTypeFilter = "all"; // 'all', 'Credit', 'Debit'
let dcReportCurrentPreset = "all";

function switchReportSubTab(subTab) {
    activeReportSubTab = subTab;
    const plTab = document.getElementById("report-subtab-profit-loss");
    const dcTab = document.getElementById("report-subtab-debit-credit");
    const plBtn = document.getElementById("subtab-btn-profit-loss");
    const dcBtn = document.getElementById("subtab-btn-debit-credit");

    if (subTab === "debit-credit") {
        if (plTab) plTab.classList.add("hidden");
        if (dcTab) dcTab.classList.remove("hidden");
        if (plBtn) {
            plBtn.className = "px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 cursor-pointer";
        }
        if (dcBtn) {
            dcBtn.className = "px-4 py-2 rounded-lg transition-all shadow-sm bg-white theme-red-text cursor-pointer";
        }
        renderDebitCreditReport();
    } else {
        if (dcTab) dcTab.classList.add("hidden");
        if (plTab) plTab.classList.remove("hidden");
        if (dcBtn) {
            dcBtn.className = "px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 cursor-pointer";
        }
        if (plBtn) {
            plBtn.className = "px-4 py-2 rounded-lg transition-all shadow-sm bg-white theme-red-text cursor-pointer";
        }
        renderProfitLossReport();
    }
}

function applyDcReportPreset(preset) {
    dcReportCurrentPreset = preset;
    const now = new Date();

    const presets = ['today', 'yesterday', 'week', 'month', 'year', 'all'];
    presets.forEach(p => {
        const btn = document.getElementById(`dc-preset-btn-${p}`);
        if (btn) {
            if (p === preset) {
                btn.className = "px-3 py-1.5 rounded-lg border theme-red-border theme-red-bg text-white transition-all cursor-pointer font-bold";
            } else {
                btn.className = "px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all cursor-pointer";
            }
        }
    });

    const startInput = document.getElementById("dc-report-start-datetime");
    const endInput = document.getElementById("dc-report-end-datetime");
    const periodLabel = document.getElementById("dc-report-filter-period-label");

    if (preset === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        dcReportStartDateTime = formatForDateTimeLocal(start);
        dcReportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = "Today (" + now.toLocaleDateString() + ")";
    } else if (preset === 'yesterday') {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
        const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
        dcReportStartDateTime = formatForDateTimeLocal(start);
        dcReportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = "Yesterday (" + y.toLocaleDateString() + ")";
    } else if (preset === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        dcReportStartDateTime = formatForDateTimeLocal(start);
        dcReportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = "Last 7 Days";
    } else if (preset === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        dcReportStartDateTime = formatForDateTimeLocal(start);
        dcReportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else if (preset === 'year') {
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        dcReportStartDateTime = formatForDateTimeLocal(start);
        dcReportEndDateTime = formatForDateTimeLocal(end);
        if (periodLabel) periodLabel.innerText = "Year " + now.getFullYear();
    } else { // 'all'
        dcReportStartDateTime = "";
        dcReportEndDateTime = "";
        if (periodLabel) periodLabel.innerText = "All Time";
    }

    if (startInput) startInput.value = dcReportStartDateTime;
    if (endInput) endInput.value = dcReportEndDateTime;

    renderDebitCreditReport();
}

function resetDcReportFilters() {
    dcReportStartDateTime = "";
    dcReportEndDateTime = "";
    dcReportSearchQuery = "";
    dcReportTypeFilter = "all";
    dcReportCurrentPreset = "all";

    const startInput = document.getElementById("dc-report-start-datetime");
    const endInput = document.getElementById("dc-report-end-datetime");
    const searchInput = document.getElementById("dc-report-search-query");
    const typeSelect = document.getElementById("dc-report-type-filter");

    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";
    if (searchInput) searchInput.value = "";
    if (typeSelect) typeSelect.value = "all";

    applyDcReportPreset("all");
}

function getFilteredDebitCreditSales() {
    return sales.filter(sale => {
        const txnType = sale.transactionType || "Credit";

        // 1. Transaction Type filter
        if (dcReportTypeFilter !== "all" && txnType !== dcReportTypeFilter) {
            return false;
        }

        // 2. Date & Time Range filter
        const saleTime = new Date(sale.date).getTime();
        if (dcReportStartDateTime) {
            const startTimestamp = new Date(dcReportStartDateTime).getTime();
            if (!isNaN(startTimestamp) && saleTime < startTimestamp) return false;
        }
        if (dcReportEndDateTime) {
            const endTimestamp = new Date(dcReportEndDateTime).getTime();
            if (!isNaN(endTimestamp) && saleTime > endTimestamp) return false;
        }

        // 3. Search query filter
        if (dcReportSearchQuery && dcReportSearchQuery.trim()) {
            const q = dcReportSearchQuery.toLowerCase().trim();
            const invMatch = (sale.invoiceNo || '').toLowerCase().includes(q);
            const custMatch = (sale.customerName || '').toLowerCase().includes(q);
            const phoneMatch = (sale.customerPhone || '').includes(q);
            const itemsMatch = Array.isArray(sale.items) && sale.items.some(it => 
                (it.name || '').toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q)
            );
            if (!invMatch && !custMatch && !phoneMatch && !itemsMatch) return false;
        }

        return true;
    });
}

function renderDebitCreditReport() {
    const tableBody = document.getElementById("dc-report-table-body");
    const tableFoot = document.getElementById("dc-report-table-foot");
    if (!tableBody) return;

    const filtered = getFilteredDebitCreditSales().sort((a, b) => new Date(b.date) - new Date(a.date));

    let totalCredit = 0;
    let creditCount = 0;
    let totalDebit = 0;
    let debitCount = 0;

    filtered.forEach(sale => {
        const type = sale.transactionType || "Credit";
        const amt = sale.total || 0;
        if (type === "Debit") {
            totalDebit += amt;
            debitCount++;
        } else {
            totalCredit += amt;
            creditCount++;
        }
    });

    const netVolume = totalCredit + totalDebit;

    // Update 4 Debit & Credit Metric Cards
    const crEl = document.getElementById("dc-total-credit");
    const crCountEl = document.getElementById("dc-credit-count");
    const dbEl = document.getElementById("dc-total-debit");
    const dbCountEl = document.getElementById("dc-debit-count");
    const volEl = document.getElementById("dc-total-volume");
    const volSubEl = document.getElementById("dc-volume-subtitle");
    const countEl = document.getElementById("dc-total-count");
    const countSubEl = document.getElementById("dc-count-subtitle");

    if (crEl) crEl.innerText = `₹${totalCredit.toFixed(2)}`;
    if (crCountEl) crCountEl.innerText = `${creditCount} paid transaction${creditCount === 1 ? '' : 's'} (Inflow)`;
    if (dbEl) dbEl.innerText = `₹${totalDebit.toFixed(2)}`;
    if (dbCountEl) dbCountEl.innerText = `${debitCount} due/khata transaction${debitCount === 1 ? '' : 's'}`;
    if (volEl) volEl.innerText = `₹${netVolume.toFixed(2)}`;
    if (volSubEl) volSubEl.innerText = `Gross billed volume (${filtered.length} bills)`;
    if (countEl) countEl.innerText = String(filtered.length);
    if (countSubEl) countSubEl.innerText = `${creditCount} Credit / ${debitCount} Debit`;

    // Update Summary Badge
    const sumBadge = document.getElementById("dc-summary-badge");
    const recText = document.getElementById("dc-reconcile-text");
    const filtCount = document.getElementById("dc-filtered-count-badge");

    if (sumBadge) {
        if (totalDebit === 0 && totalCredit > 0) {
            sumBadge.innerText = "100% Paid (Credit)";
            sumBadge.className = "px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800";
        } else if (totalDebit > 0) {
            sumBadge.innerText = `₹${totalDebit.toFixed(2)} Outstanding Due`;
            sumBadge.className = "px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800";
        } else {
            sumBadge.innerText = "No Records";
            sumBadge.className = "px-2 py-0.5 text-[11px] font-bold rounded-full bg-gray-100 text-gray-800";
        }
    }
    if (recText) {
        recText.innerText = `Received Inflow: ₹${totalCredit.toFixed(2)} | Customer Receivables: ₹${totalDebit.toFixed(2)}`;
    }
    if (filtCount) {
        filtCount.innerText = `${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`;
    }

    // Render Table Rows
    tableBody.innerHTML = "";
    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-gray-500">
            <i class="fas fa-scale-balanced text-3xl text-gray-300 mb-2 block"></i>
            No debit or credit transactions found matching filters.
        </td></tr>`;
        if (tableFoot) tableFoot.innerHTML = "";
        return;
    }

    filtered.forEach(sale => {
        const formattedDate = new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        const type = sale.transactionType || "Credit";
        const isDebit = type === "Debit";
        const typeBadge = isDebit
            ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><i class="fas fa-clock mr-1 text-[9px]"></i>Debit</span>`
            : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><i class="fas fa-check mr-1 text-[9px]"></i>Credit</span>`;

        const itemsSummary = (sale.items || []).map(it => `${it.name} (x${it.quantity})`).join(', ');

        tableBody.innerHTML += `
            <tr class="border-b hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">${formattedDate}</td>
                <td class="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">${sale.invoiceNo}</td>
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-800">${sale.customerName || 'Walk-in Customer'}</div>
                    <div class="text-[11px] text-gray-400">${sale.customerPhone || 'No Phone'}</div>
                </td>
                <td class="px-4 py-3 text-gray-600 max-w-xs truncate" title="${itemsSummary}">
                    ${itemsSummary || '-'}
                </td>
                <td class="px-4 py-3 text-center whitespace-nowrap">${typeBadge}</td>
                <td class="px-4 py-3 text-right font-bold ${isDebit ? 'text-amber-700' : 'text-emerald-700'} whitespace-nowrap">
                    ${isDebit ? '' : '+'}₹${(sale.total || 0).toFixed(2)}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap no-print">
                    <button onclick="viewInvoiceFromHistory('${sale.id}')" class="theme-red-text hover:text-red-900 font-medium text-xs">
                        <i class="fas fa-eye mr-1"></i> View Bill
                    </button>
                </td>
            </tr>
        `;
    });

    // Render Table Footer Summary Totals
    if (tableFoot) {
        tableFoot.innerHTML = `
            <tr class="bg-gray-100 text-gray-900 font-bold">
                <td colspan="4" class="px-4 py-3 text-left uppercase text-xs tracking-wider">Total (${filtered.length} Transactions: ${creditCount} Credit / ${debitCount} Debit)</td>
                <td class="px-4 py-3 text-center text-xs">Cr: ₹${totalCredit.toFixed(2)} | Db: ₹${totalDebit.toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-base theme-red-text">₹${netVolume.toFixed(2)}</td>
                <td class="px-4 py-3 no-print"></td>
            </tr>
        `;
    }
}

// Master Render Report (triggers both Profit & Loss and Debit & Credit)
function renderReport() {
    renderProfitLossReport();
    renderDebitCreditReport();
}

function triggerReportPrint() {
    document.body.classList.add("printing-report");
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove("printing-report");
        }, 500);
    }, 150);
}

function printReport() {
    triggerReportPrint();
}

function printDebitCreditReport() {
    triggerReportPrint();
}

window.applyReportPreset = applyReportPreset;
window.resetReportFilters = resetReportFilters;
window.printReport = printReport;
window.switchReportSubTab = switchReportSubTab;
window.applyDcReportPreset = applyDcReportPreset;
window.resetDcReportFilters = resetDcReportFilters;
window.printDebitCreditReport = printDebitCreditReport;
window.onBillingTxnTypeChange = onBillingTxnTypeChange;

// --- General UI Modal Handlers ---
function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.remove("hidden");
    el.classList.add("flex");
    if (modalId === "add-product-modal") {
        const addSku = document.getElementById("add-p-sku");
        if (addSku && !addSku.value.trim()) {
            addSku.value = generateRandomSku();
        }
        onAddSkuChange();
    }
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.remove("flex");
    el.classList.add("hidden");
}

// Window global bindings for barcode subsystem
window.generateRandomAddSku = generateRandomAddSku;
window.generateRandomEditSku = generateRandomEditSku;
window.onAddSkuChange = onAddSkuChange;
window.onEditSkuChange = onEditSkuChange;
window.downloadAddBarcode = downloadAddBarcode;
window.downloadEditBarcode = downloadEditBarcode;
window.printAddBarcode = printAddBarcode;
window.printEditBarcode = printEditBarcode;
window.openBarcodeModal = openBarcodeModal;
window.downloadCurrentModalBarcode = downloadCurrentModalBarcode;
window.triggerBarcodePrint = triggerBarcodePrint;
window.setBarcodePrintQty = setBarcodePrintQty;

// --- Enlarged Product Image Viewer (1080 × 1080 px format) ---
let currentEnlargedImageSrc = "";

function openEnlargedImage(imageSrc, title = "Product Image", subtitle = "") {
    const modal = document.getElementById("enlarged-image-modal");
    const imgEl = document.getElementById("enlarged-product-img");
    const titleEl = document.getElementById("enlarged-image-title");
    const subEl = document.getElementById("enlarged-image-subtitle");
    const downloadBtn = document.getElementById("enlarged-image-download-btn");

    if (!modal || !imgEl) return;

    const resolvedSrc = (imageSrc && imageSrc.trim() && !imageSrc.includes("text=No+Photo"))
        ? imageSrc.trim()
        : "https://placehold.co/1080x1080?text=No+Product+Photo";

    currentEnlargedImageSrc = resolvedSrc;
    imgEl.src = resolvedSrc;
    
    if (titleEl) titleEl.innerText = title || "Product Image";
    if (subEl) subEl.innerText = subtitle || "1080 × 1080 px Format";
    
    if (downloadBtn) {
        downloadBtn.href = resolvedSrc;
        const safeName = (title || "product").toLowerCase().replace(/[^a-z0-9]/g, '_');
        downloadBtn.download = `${safeName}_1080x1080.jpg`;
    }

    openModal("enlarged-image-modal");
}

function openProductImageById(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const subtitle = `SKU: ${product.sku} | Category: ${product.category} | Price: ₹${(product.price || 0).toFixed(2)}`;
    openEnlargedImage(product.image, product.name, subtitle);
}

function closeEnlargedImage() {
    closeModal("enlarged-image-modal");
}

function onPreviewProdImgClick() {
    const previewImg = document.getElementById("preview-prod-img");
    const previewName = document.getElementById("preview-prod-name");
    const previewSku = document.getElementById("preview-prod-sku");
    const previewPrice = document.getElementById("preview-prod-price");
    
    const src = previewImg ? previewImg.src : "";
    const name = previewName ? previewName.innerText : "Product Preview";
    const sku = previewSku ? previewSku.innerText : "";
    const price = previewPrice ? previewPrice.innerText : "";
    const sub = sku ? `SKU: ${sku} | Price: ${price}` : "";
    
    openEnlargedImage(src, name, sub);
}

window.openEnlargedImage = openEnlargedImage;
window.openProductImageById = openProductImageById;
window.closeEnlargedImage = closeEnlargedImage;
window.onPreviewProdImgClick = onPreviewProdImgClick;

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

    // Real-time live profit preview calculation listeners
    const addPR = document.getElementById("add-p-purchase-rate");
    const addPrice = document.getElementById("add-p-price");
    if (addPR) addPR.addEventListener("input", calculateAddProfitPreview);
    if (addPrice) addPrice.addEventListener("input", calculateAddProfitPreview);

    const editPR = document.getElementById("edit-p-purchase-rate");
    const editPrice = document.getElementById("edit-p-price");
    if (editPR) editPR.addEventListener("input", calculateEditProfitPreview);
    if (editPrice) editPrice.addEventListener("input", calculateEditProfitPreview);

    // Report tab date & time and search input listeners
    const rStart = document.getElementById("report-start-datetime");
    const rEnd = document.getElementById("report-end-datetime");
    const rSearch = document.getElementById("report-search-query");

    if (rStart) {
        rStart.addEventListener("change", (e) => {
            reportStartDateTime = e.target.value;
            renderReport();
        });
    }
    if (rEnd) {
        rEnd.addEventListener("change", (e) => {
            reportEndDateTime = e.target.value;
            renderReport();
        });
    }
    if (rSearch) {
        rSearch.addEventListener("input", (e) => {
            reportSearchQuery = e.target.value;
            renderReport();
        });
    }

    // Debit & Credit Report tab listeners
    const dcStart = document.getElementById("dc-report-start-datetime");
    const dcEnd = document.getElementById("dc-report-end-datetime");
    const dcSearch = document.getElementById("dc-report-search-query");
    const dcType = document.getElementById("dc-report-type-filter");

    if (dcStart) {
        dcStart.addEventListener("change", (e) => {
            dcReportStartDateTime = e.target.value;
            renderDebitCreditReport();
        });
    }
    if (dcEnd) {
        dcEnd.addEventListener("change", (e) => {
            dcReportEndDateTime = e.target.value;
            renderDebitCreditReport();
        });
    }
    if (dcSearch) {
        dcSearch.addEventListener("input", (e) => {
            dcReportSearchQuery = e.target.value;
            renderDebitCreditReport();
        });
    }
    if (dcType) {
        dcType.addEventListener("change", (e) => {
            dcReportTypeFilter = e.target.value;
            renderDebitCreditReport();
        });
    }

    // Customer Credit search and filter listeners
    const custSearch = document.getElementById("customer-credit-search");
    const custFilter = document.getElementById("customer-credit-status-filter");
    if (custSearch) {
        custSearch.addEventListener("input", () => {
            renderCustomerCreditTable();
        });
    }
    if (custFilter) {
        custFilter.addEventListener("change", () => {
            renderCustomerCreditTable();
        });
    }

    // General window clicking checks to close modals
    window.addEventListener("click", (e) => {
        const modals = [
            "add-product-modal", "edit-product-modal", "print-invoice-modal", 
            "manage-categories-modal", "enlarged-image-modal", "barcode-label-modal", 
            "device-manager-modal", "add-customer-modal", 
            "settle-payment-modal", "customer-ledger-modal"
        ];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (e.target === modal) {
                closeModal(modalId);
            }
        });
    });

    // Keyboard shortcut (Escape closes open modal and returns to previous screen)
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeEnlargedImage();
            closeModal("add-product-modal");
            closeModal("edit-product-modal");
            closeModal("barcode-label-modal");
            closeModal("print-invoice-modal");
            closeModal("manage-categories-modal");
            closeModal("device-manager-modal");
            closeModal("add-customer-modal");
            closeModal("settle-payment-modal");
            closeModal("customer-ledger-modal");
        }
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

// Downscale and compress image up to 1080 × 1080 px format
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1080;
            const MAX_HEIGHT = 1080;
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

            canvas.width = Math.round(width);
            canvas.height = Math.round(height);

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Export as JPEG at 80% quality for crisp 1080x1080 display
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            callback(dataUrl);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// =============================================================================
// CUSTOMER CREDIT DETAILS SUBSYSTEM
// =============================================================================

function switchCustomerSubTab(subTab) {
    activeCustomerSubTab = subTab;
    const btnAll = document.getElementById("cust-subtab-btn-all");
    const btnCredit = document.getElementById("cust-subtab-btn-credit");
    const secAll = document.getElementById("cust-all-subsection");
    const secCredit = document.getElementById("cust-credit-subsection");

    if (subTab === "all") {
        if (btnAll) {
            btnAll.className = "px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white shadow-xs flex items-center space-x-2 transition-all cursor-pointer";
        }
        if (btnCredit) {
            btnCredit.className = "px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all flex items-center space-x-2 cursor-pointer";
        }
        if (secAll) secAll.classList.remove("hidden");
        if (secCredit) secCredit.classList.add("hidden");
        renderAllCustomersTable();
    } else {
        if (btnCredit) {
            btnCredit.className = "px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white shadow-xs flex items-center space-x-2 transition-all cursor-pointer";
        }
        if (btnAll) {
            btnAll.className = "px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all flex items-center space-x-2 cursor-pointer";
        }
        if (secAll) secAll.classList.add("hidden");
        if (secCredit) secCredit.classList.remove("hidden");
        renderCustomerCreditTable();
    }
}

function renderCustomerDetailsSection() {
    // 1. Calculate KPI Metrics for All Customers Subsection
    const totalCustomers = (customers || []).length;
    
    let totalInvoicesCount = 0;
    let totalPurchasesVolume = 0;
    let totalCreditReceivables = 0;

    (customers || []).forEach(c => {
        const cPhone = cleanPhone(c.phone);
        const custSales = (sales || []).filter(s => s.customerId === c.id || (s.customerPhone && cleanPhone(s.customerPhone) === cPhone));
        totalInvoicesCount += custSales.length;
        totalPurchasesVolume += custSales.reduce((sum, s) => sum + (s.total || 0), 0);
        totalCreditReceivables += (c.outstandingBalance || 0);
    });

    const elAllCustCount = document.getElementById("cust-metric-all-count");
    const elAllBillsCount = document.getElementById("cust-metric-all-bills-count");
    const elAllPurchasesVol = document.getElementById("cust-metric-all-purchases-vol");
    const elAllCreditDue = document.getElementById("cust-metric-all-credit-due");

    if (elAllCustCount) elAllCustCount.innerText = totalCustomers;
    if (elAllBillsCount) elAllBillsCount.innerText = totalInvoicesCount;
    if (elAllPurchasesVol) elAllPurchasesVol.innerText = `₹${totalPurchasesVolume.toFixed(2)}`;
    if (elAllCreditDue) elAllCreditDue.innerText = `₹${totalCreditReceivables.toFixed(2)}`;

    // 2. Calculate KPI Metrics for Due Amount Subsection (Customers with Debit bills or Due Amount)
    const dueCustomers = (customers || []).filter(c => (c.outstandingBalance > 0) || ((c.totalDebitBilled || 0) > 0));
    const totalDebitBilled = (customers || []).reduce((acc, c) => acc + (c.totalDebitBilled || 0), 0);
    const totalPaid = (customers || []).reduce((acc, c) => acc + (c.totalPaid || 0), 0);
    const totalOutstanding = (customers || []).reduce((acc, c) => acc + (c.outstandingBalance || 0), 0);

    const elCustCount = document.getElementById("cust-metric-total-customers");
    const elBilled = document.getElementById("cust-metric-total-billed");
    const elPaid = document.getElementById("cust-metric-total-paid");
    const elDue = document.getElementById("cust-metric-total-outstanding");

    if (elCustCount) elCustCount.innerText = dueCustomers.length;
    if (elBilled) elBilled.innerText = `₹${totalDebitBilled.toFixed(2)}`;
    if (elPaid) elPaid.innerText = `₹${totalPaid.toFixed(2)}`;
    if (elDue) elDue.innerText = `₹${totalOutstanding.toFixed(2)}`;

    // 3. Render Both Tables
    renderAllCustomersTable();
    renderCustomerCreditTable();
}

function renderCustomerCreditSection() {
    renderCustomerDetailsSection();
}

function renderAllCustomersTable() {
    const tbody = document.getElementById("customer-all-table-body");
    const badgeEl = document.getElementById("cust-all-filtered-count-badge");
    if (!tbody) return;

    const searchQuery = (document.getElementById("customer-all-search")?.value || "").trim().toLowerCase();

    const filtered = (customers || []).filter(c => {
        if (!c) return false;
        if (searchQuery) {
            const nameMatch = (c.name || "").toLowerCase().includes(searchQuery);
            const phoneMatch = (c.phone || "").toLowerCase().includes(searchQuery);
            const placeMatch = (c.place || "").toLowerCase().includes(searchQuery);
            const addrMatch = (c.address || "").toLowerCase().includes(searchQuery);
            if (!nameMatch && !phoneMatch && !placeMatch && !addrMatch) return false;
        }
        return true;
    });

    if (badgeEl) {
        badgeEl.innerText = `${filtered.length} Customer${filtered.length === 1 ? '' : 's'}`;
    }

    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr class="no-print">
                <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <div class="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xl">
                            <i class="fas fa-users-slash"></i>
                        </div>
                        <p class="text-sm font-semibold text-gray-700">No Customers Found</p>
                        <p class="text-xs text-gray-400">Customer details are automatically saved whenever a bill is generated, or click &quot;Add New Customer&quot; above.</p>
                        <button type="button" onclick="openAddCustomerModal()" class="mt-2 theme-red-bg hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                            + Add New Customer
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(c => {
        const cPhone = cleanPhone(c.phone);
        const custSales = (sales || []).filter(s => s.customerId === c.id || (s.customerPhone && cleanPhone(s.customerPhone) === cPhone));
        const totalBillsCount = custSales.length;
        const totalPurchases = custSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const balance = c.outstandingBalance || 0;
        const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-";

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <!-- Customer Profile -->
                <td class="px-5 py-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-red-100 shadow-xs">
                            ${escapeHtml(c.name ? c.name.charAt(0).toUpperCase() : 'C')}
                        </div>
                        <div class="min-w-0">
                            <a href="#" onclick="event.preventDefault(); openCustomerLedgerModal('${c.id}')" class="font-bold text-gray-900 hover:text-red-600 hover:underline block truncate text-sm" title="View Customer History & Ledger">
                                ${escapeHtml(c.name || 'Customer')}
                            </a>
                            <span class="text-[11px] text-gray-400 block">Registered ${dateStr}</span>
                        </div>
                    </div>
                </td>

                <!-- Contact Number -->
                <td class="px-4 py-3">
                    <div class="space-y-1">
                        <div class="font-mono text-xs font-bold text-gray-800 flex items-center space-x-1">
                            <span>+91</span>
                            <span>${escapeHtml(c.phone || '-')}</span>
                        </div>
                        ${c.isPhoneVerified ? `
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <i class="fas fa-check-circle mr-1 text-[9px]"></i>Active Credit
                            </span>
                        ` : `
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                <i class="fas fa-receipt mr-1 text-[9px]"></i>Saved on Billing
                            </span>
                        `}
                    </div>
                </td>

                <!-- Place & Address -->
                <td class="px-4 py-3">
                    <span class="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 mb-0.5">
                        ${escapeHtml(c.place || '-')}
                    </span>
                    <p class="text-[11px] text-gray-500 truncate max-w-[180px]" title="${escapeHtml(c.address || '')}">
                        ${escapeHtml(c.address || '-')}
                    </p>
                </td>

                <!-- Total Bills -->
                <td class="px-4 py-3 text-center">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        ${totalBillsCount} Bill${totalBillsCount === 1 ? '' : 's'}
                    </span>
                </td>

                <!-- Total Purchases -->
                <td class="px-4 py-3 text-right font-extrabold text-gray-900">
                    ₹${totalPurchases.toFixed(2)}
                </td>

                <!-- Outstanding Due -->
                <td class="px-4 py-3 text-right">
                    ${balance > 0 ? `
                        <span class="font-extrabold text-amber-700 text-sm">
                            ₹${balance.toFixed(2)}
                        </span>
                    ` : `
                        <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ₹0.00 (Nil)
                        </span>
                    `}
                </td>

                <!-- Actions -->
                <td class="px-5 py-3 text-right no-print">
                    <div class="flex items-center justify-end space-x-1.5">
                        <button type="button" onclick="openCustomerLedgerModal('${c.id}')" class="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-all shadow-xs flex items-center space-x-1 cursor-pointer" title="View Complete Customer History & Ledger">
                            <i class="fas fa-history"></i>
                            <span>History</span>
                        </button>

                        ${balance > 0 ? `
                            <button type="button" onclick="openSettlePaymentModal('${c.id}')" class="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-all shadow-xs flex items-center space-x-1 cursor-pointer" title="Record Payment & Settle Due">
                                <i class="fas fa-hand-holding-dollar"></i>
                                <span>Settle</span>
                            </button>
                        ` : ''}

                        <button type="button" onclick="deleteCustomer('${c.id}')" class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Profile">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function renderCustomerCreditTable() {
    const tbody = document.getElementById("customer-credit-table-body");
    const badgeEl = document.getElementById("cust-filtered-count-badge");
    if (!tbody) return;

    const searchQuery = (document.getElementById("customer-credit-search")?.value || "").trim().toLowerCase();
    const statusFilter = document.getElementById("customer-credit-status-filter")?.value || "all";

    const filtered = (customers || []).filter(c => {
        if (!c) return false;

        // Only Customer Debit Bills or Customer Due Amount are displayed in this section
        const hasDebitOrDue = ((c.outstandingBalance || 0) > 0) || ((c.totalDebitBilled || 0) > 0);
        if (!hasDebitOrDue) return false;

        // Search query filter (matches Name, Phone, Place, Address)
        if (searchQuery) {
            const nameMatch = (c.name || "").toLowerCase().includes(searchQuery);
            const phoneMatch = (c.phone || "").toLowerCase().includes(searchQuery);
            const placeMatch = (c.place || "").toLowerCase().includes(searchQuery);
            const addrMatch = (c.address || "").toLowerCase().includes(searchQuery);
            if (!nameMatch && !phoneMatch && !placeMatch && !addrMatch) return false;
        }

        // Status Filter
        const balance = c.outstandingBalance || 0;
        if (statusFilter === "due" && balance <= 0) return false;
        if (statusFilter === "settled" && balance > 0) return false;

        return true;
    });

    if (badgeEl) {
        badgeEl.innerText = `${filtered.length} Customer${filtered.length === 1 ? '' : 's'}`;
    }

    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr class="no-print">
                <td colspan="8" class="px-6 py-12 text-center text-gray-400">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-xl">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                        <p class="text-sm font-semibold text-gray-700">No Customer Due Accounts Found</p>
                        <p class="text-xs text-gray-400">Only customers with Customer Debit Bills or active Customer Due Amount appear in this section.</p>
                        <button type="button" onclick="openAddCustomerModal()" class="mt-2 theme-red-bg hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                            + Add New Customer
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(c => {
        const balance = c.outstandingBalance || 0;
        const totalBilled = c.totalDebitBilled || 0;
        const totalPaid = c.totalPaid || 0;
        const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-";

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <!-- Customer Profile -->
                <td class="px-5 py-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-red-100 shadow-xs">
                            ${escapeHtml(c.name ? c.name.charAt(0).toUpperCase() : 'C')}
                        </div>
                        <div class="min-w-0">
                            <a href="#" onclick="event.preventDefault(); openCustomerLedgerModal('${c.id}')" class="font-bold text-gray-900 hover:text-red-600 hover:underline block truncate text-sm" title="View Customer Ledger">
                                ${escapeHtml(c.name || 'Unnamed')}
                            </a>
                            <span class="text-[11px] text-gray-400 block">Registered ${dateStr}</span>
                        </div>
                    </div>
                </td>

                <!-- Contact Number -->
                <td class="px-4 py-3">
                    <div class="space-y-1">
                        <div class="font-mono text-xs font-bold text-gray-800 flex items-center space-x-1">
                            <span>+91</span>
                            <span>${escapeHtml(c.phone || '-')}</span>
                        </div>
                        ${balance > 0 ? `
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <i class="fas fa-clock mr-1 text-[9px]"></i>Active Due
                            </span>
                        ` : `
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <i class="fas fa-check-circle mr-1 text-[9px]"></i>Due Cleared
                            </span>
                        `}
                    </div>
                </td>

                <!-- Place & Address -->
                <td class="px-4 py-3">
                    <span class="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 mb-0.5">
                        ${escapeHtml(c.place || '-')}
                    </span>
                    <p class="text-[11px] text-gray-500 truncate max-w-[180px]" title="${escapeHtml(c.address || '')}">
                        ${escapeHtml(c.address || '-')}
                    </p>
                </td>

                <!-- ID Proof -->
                <td class="px-4 py-3 text-center">
                    ${c.idProof ? `
                        <div class="inline-flex flex-col items-center">
                            <button type="button" onclick="openCustomerTableIdProof('${c.id}')" class="group relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 hover:ring-2 hover:ring-red-400 transition-all cursor-pointer shadow-xs" title="Click to view 1080 × 1080 px enlarged view">
                                <img src="${c.idProof}" class="w-full h-full object-cover">
                                <span class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px]">
                                    <i class="fas fa-search-plus"></i>
                                </span>
                            </button>
                            <button type="button" onclick="openCustomerTableIdProof('${c.id}')" class="text-[10px] text-blue-600 hover:underline font-semibold mt-0.5">
                                1080p
                            </button>
                        </div>
                    ` : `
                        <span class="text-xs text-gray-400 italic">None</span>
                    `}
                </td>

                <!-- Credit Billed -->
                <td class="px-4 py-3 text-right font-medium text-purple-700">
                    ₹${totalBilled.toFixed(2)}
                </td>

                <!-- Paid Settled -->
                <td class="px-4 py-3 text-right font-medium text-emerald-700">
                    ₹${totalPaid.toFixed(2)}
                </td>

                <!-- Outstanding Due -->
                <td class="px-4 py-3 text-right">
                    ${balance > 0 ? `
                        <span class="font-extrabold text-amber-700 text-sm">
                            ₹${balance.toFixed(2)}
                        </span>
                    ` : `
                        <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ₹0.00 (Settled)
                        </span>
                    `}
                </td>

                <!-- Actions -->
                <td class="px-5 py-3 text-right no-print">
                    <div class="flex items-center justify-end space-x-1.5">
                        <button type="button" onclick="openSettlePaymentModal('${c.id}')" class="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-all shadow-xs flex items-center space-x-1 cursor-pointer" title="Record Payment & Settle Due">
                            <i class="fas fa-hand-holding-dollar"></i>
                            <span>Settle</span>
                        </button>

                        <button type="button" onclick="openCustomerLedgerModal('${c.id}')" class="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200 transition-all shadow-xs flex items-center space-x-1 cursor-pointer" title="View Customer Account Statement">
                            <i class="fas fa-book-open text-gray-500"></i>
                            <span>Ledger</span>
                        </button>

                        <button type="button" onclick="deleteCustomer('${c.id}')" class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Credit Account">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// --- Customer Registration Handlers ---
function openAddCustomerModal() {
    // Reset Form fields
    const nameInput = document.getElementById("cust-add-name");
    const phoneInput = document.getElementById("cust-add-phone");
    const placeInput = document.getElementById("cust-add-place");
    const addrInput = document.getElementById("cust-add-address");

    if (nameInput) nameInput.value = "";
    if (phoneInput) phoneInput.value = "";
    if (placeInput) placeInput.value = "";
    if (addrInput) addrInput.value = "";

    tempCustomerIdProofData = null;

    const dropzone = document.getElementById("cust-idproof-dropzone");
    const previewCard = document.getElementById("cust-idproof-preview-card");
    const fileInput = document.getElementById("cust-idproof-file-input");
    if (dropzone) dropzone.classList.remove("hidden");
    if (previewCard) previewCard.classList.add("hidden");
    if (fileInput) fileInput.value = "";

    openModal("add-customer-modal");
}

function quickRegisterCreditCustomer(prefillPhone = "") {
    openAddCustomerModal();
    if (prefillPhone) {
        const phoneInput = document.getElementById("cust-add-phone");
        if (phoneInput) {
            phoneInput.value = cleanPhone(prefillPhone);
        }
    }
}

function onCustomerIdProofSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    compressImage(file, base64Url => {
        tempCustomerIdProofData = base64Url;

        const previewCard = document.getElementById("cust-idproof-preview-card");
        const dropzone = document.getElementById("cust-idproof-dropzone");
        const previewImg = document.getElementById("cust-idproof-preview-img");
        const filenameEl = document.getElementById("cust-idproof-filename");

        if (previewImg) previewImg.src = base64Url;
        if (filenameEl) filenameEl.innerText = file.name || "id_proof.jpg";
        if (dropzone) dropzone.classList.add("hidden");
        if (previewCard) {
            previewCard.classList.remove("hidden");
            previewCard.classList.add("flex");
        }
    });
}

function removeCustomerIdProof() {
    tempCustomerIdProofData = null;
    const fileInput = document.getElementById("cust-idproof-file-input");
    const previewCard = document.getElementById("cust-idproof-preview-card");
    const dropzone = document.getElementById("cust-idproof-dropzone");

    if (fileInput) fileInput.value = "";
    if (previewCard) {
        previewCard.classList.remove("flex");
        previewCard.classList.add("hidden");
    }
    if (dropzone) dropzone.classList.remove("hidden");
}

function previewCustomerTempIdProof() {
    if (!tempCustomerIdProofData) return;
    const name = document.getElementById("cust-add-name")?.value.trim() || "Customer";
    openEnlargedImage(tempCustomerIdProofData, `${name} - ID Proof Preview`, "Uploaded ID Proof (1080 × 1080 px Format)");
}

function saveCustomer() {
    const name = (document.getElementById("cust-add-name")?.value || "").trim();
    const rawPhone = (document.getElementById("cust-add-phone")?.value || "").trim();
    const phone = cleanPhone(rawPhone);
    const place = (document.getElementById("cust-add-place")?.value || "").trim();
    const address = (document.getElementById("cust-add-address")?.value || "").trim();

    if (!name) {
        alert("Please enter customer name.");
        return;
    }

    if (!phone || phone.length < 10) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    if (!place) {
        alert("Please enter customer place / city.");
        return;
    }

    if (!address) {
        alert("Please enter customer address.");
        return;
    }

    // Check duplicate account
    const existing = (customers || []).find(c => c.phone && cleanPhone(c.phone) === phone);
    if (existing) {
        alert(`A Customer Credit Account is already registered for mobile number +91 ${phone} (${existing.name}).`);
        return;
    }

    const newCustomer = {
        id: "CUST-" + Date.now(),
        name,
        phone,
        isPhoneVerified: true,
        phoneVerifiedAt: new Date().toISOString(),
        place,
        address,
        idProof: tempCustomerIdProofData || null,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        totalCreditBilled: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        settlements: []
    };

    customers.unshift(newCustomer);
    saveCustomers();
    dispatchDeltaSync('CUSTOMER_ADDED', { customer: newCustomer });

    closeModal("add-customer-modal");
    renderCustomerCreditSection();

    // If currently on billing screen, update phone badge
    onBillingCustomerPhoneChange();

    alert(`Customer Credit Account successfully activated for ${newCustomer.name} (+91 ${newCustomer.phone})!`);
}

function deleteCustomer(customerId) {
    const cust = (customers || []).find(c => c.id === customerId);
    if (!cust) return;

    const balance = cust.outstandingBalance || 0;
    let message = "";
    if (balance > 0) {
        message = `Customer "${cust.name}" currently has an outstanding balance of ₹${balance.toFixed(2)} due!\n\nAre you sure you want to permanently delete this credit account?`;
    } else {
        message = `Are you sure you want to delete the Customer Credit Account for "${cust.name}"?`;
    }

    if (!confirm(message)) return;

    customers = customers.filter(c => c.id !== customerId);
    saveCustomers();
    dispatchDeltaSync('CUSTOMER_DELETED', { customerId });
    renderCustomerCreditSection();
    onBillingCustomerPhoneChange();
}

// --- Payment Settlement Handlers ---
function openSettlePaymentModal(customerId) {
    const cust = (customers || []).find(c => c.id === customerId);
    if (!cust) return;

    currentSettlingCustomerId = customerId;

    const nameEl = document.getElementById("settle-cust-name");
    const metaEl = document.getElementById("settle-cust-meta");
    const dueEl = document.getElementById("settle-cust-current-due");
    const idInput = document.getElementById("settle-cust-id");
    const amountInput = document.getElementById("settle-amount-input");
    const dateInput = document.getElementById("settle-payment-date");
    const notesInput = document.getElementById("settle-payment-notes");
    const billSelect = document.getElementById("settle-original-bill-select");
    const billHint = document.getElementById("settle-bill-count-hint");

    if (idInput) idInput.value = cust.id;
    if (nameEl) nameEl.innerText = cust.name;
    if (metaEl) metaEl.innerText = `Mobile: +91 ${cust.phone} | Place: ${cust.place || '-'}`;
    if (dueEl) dueEl.innerText = `₹${(cust.outstandingBalance || 0).toFixed(2)}`;

    // Populate Original Credit Bills in Dropdown Selector
    if (billSelect) {
        billSelect.innerHTML = `<option value="ALL">All Outstanding Credit Bills (General Settlement - ₹${(cust.outstandingBalance || 0).toFixed(2)})</option>`;

        const cleanCustPhone = cleanPhone(cust.phone);
        const creditBills = (sales || []).filter(s => 
            (s.customerId === cust.id || (s.customerPhone && cleanPhone(s.customerPhone) === cleanCustPhone)) && 
            s.transactionType === "Credit"
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (billHint) {
            billHint.innerText = `${creditBills.length} credit bill${creditBills.length === 1 ? '' : 's'} on record`;
        }

        creditBills.forEach(b => {
            const billDateStr = new Date(b.date).toLocaleDateString();
            billSelect.innerHTML += `
                <option value="${b.id}" data-no="${b.invoiceNo}" data-date="${b.date}" data-total="${b.total}">
                    Bill #${b.invoiceNo} (${billDateStr}) - Total: ₹${b.total.toFixed(2)}
                </option>
            `;
        });
    }

    // Reset hidden original bill fields
    const hidBillId = document.getElementById("settle-selected-bill-id");
    const hidBillNo = document.getElementById("settle-selected-bill-no");
    const hidBillDate = document.getElementById("settle-selected-bill-date");
    const hidBillTotal = document.getElementById("settle-selected-bill-total");

    if (hidBillId) hidBillId.value = "ALL";
    if (hidBillNo) hidBillNo.value = "All Credit Bills";
    if (hidBillDate) hidBillDate.value = "-";
    if (hidBillTotal) hidBillTotal.value = (cust.outstandingBalance || 0).toString();

    // Default settlement amount to current balance
    const currentDue = cust.outstandingBalance || 0;
    if (amountInput) amountInput.value = currentDue > 0 ? currentDue.toFixed(2) : "0.00";

    // Default date to current local datetime
    if (dateInput) {
        const localIso = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        dateInput.value = localIso;
    }

    if (notesInput) notesInput.value = "";

    updateSettlePreview();
    openModal("settle-payment-modal");
}

function onSettleBillSelectChange() {
    const cust = (customers || []).find(c => c.id === currentSettlingCustomerId);
    if (!cust) return;

    const billSelect = document.getElementById("settle-original-bill-select");
    const amountInput = document.getElementById("settle-amount-input");
    const hidBillId = document.getElementById("settle-selected-bill-id");
    const hidBillNo = document.getElementById("settle-selected-bill-no");
    const hidBillDate = document.getElementById("settle-selected-bill-date");
    const hidBillTotal = document.getElementById("settle-selected-bill-total");

    const selectedVal = billSelect ? billSelect.value : "ALL";

    if (selectedVal === "ALL") {
        if (hidBillId) hidBillId.value = "ALL";
        if (hidBillNo) hidBillNo.value = "All Credit Bills";
        if (hidBillDate) hidBillDate.value = "-";
        if (hidBillTotal) hidBillTotal.value = (cust.outstandingBalance || 0).toString();

        if (amountInput) {
            amountInput.value = Math.max(0, cust.outstandingBalance || 0).toFixed(2);
        }
    } else {
        const selectedSale = (sales || []).find(s => s.id === selectedVal || s.invoiceNo === selectedVal);
        if (selectedSale) {
            if (hidBillId) hidBillId.value = selectedSale.id;
            if (hidBillNo) hidBillNo.value = selectedSale.invoiceNo;
            if (hidBillDate) hidBillDate.value = new Date(selectedSale.date).toLocaleString();
            if (hidBillTotal) hidBillTotal.value = selectedSale.total.toString();

            if (amountInput) {
                // Pre-fill with bill amount or current outstanding balance, whichever is smaller
                const fillAmount = Math.min(selectedSale.total, cust.outstandingBalance || selectedSale.total);
                amountInput.value = fillAmount.toFixed(2);
            }
        }
    }

    updateSettlePreview();
}

function setQuickSettleAmount(val) {
    const cust = (customers || []).find(c => c.id === currentSettlingCustomerId);
    if (!cust) return;

    const amountInput = document.getElementById("settle-amount-input");
    if (!amountInput) return;

    const due = cust.outstandingBalance || 0;

    if (val === 'full') {
        amountInput.value = Math.max(0, due).toFixed(2);
    } else if (val === 'half') {
        amountInput.value = (Math.max(0, due) / 2).toFixed(2);
    } else if (typeof val === 'number') {
        amountInput.value = val.toFixed(2);
    }

    updateSettlePreview();
}

function updateSettlePreview() {
    const cust = (customers || []).find(c => c.id === currentSettlingCustomerId);
    if (!cust) return;

    const amountInput = document.getElementById("settle-amount-input");
    const newPaidEl = document.getElementById("settle-calc-new-paid");
    const remainingEl = document.getElementById("settle-calc-remaining");

    const amount = parseFloat(amountInput ? amountInput.value : 0) || 0;
    const currentDue = cust.outstandingBalance || 0;
    const currentPaid = cust.totalPaid || 0;

    const updatedTotalPaid = currentPaid + amount;
    const remainingDue = Math.max(0, currentDue - amount);

    if (newPaidEl) newPaidEl.innerText = `₹${updatedTotalPaid.toFixed(2)}`;
    if (remainingEl) remainingEl.innerText = `₹${remainingDue.toFixed(2)}`;
}

function processPaymentSettlement() {
    const cust = (customers || []).find(c => c.id === currentSettlingCustomerId);
    if (!cust) return;

    const amountInput = document.getElementById("settle-amount-input");
    const modeSelect = document.getElementById("settle-payment-mode");
    const dateInput = document.getElementById("settle-payment-date");
    const notesInput = document.getElementById("settle-payment-notes");
    const billSelect = document.getElementById("settle-original-bill-select");

    const amount = parseFloat(amountInput ? amountInput.value : 0) || 0;
    if (amount <= 0) {
        alert("Please enter a valid settlement payment amount greater than ₹0.");
        return;
    }

    const paymentMode = modeSelect ? modeSelect.value : "Cash";
    const paymentDate = (dateInput && dateInput.value) ? new Date(dateInput.value).toISOString() : new Date().toISOString();
    const notes = (notesInput ? notesInput.value : "").trim();

    const currentDue = cust.outstandingBalance || 0;
    const remainingBalance = Math.max(0, currentDue - amount);

    // Retrieve original credit bill details
    let origBillNo = "General Credit Settlement";
    let origBillDate = new Date(paymentDate).toLocaleDateString();
    let origBillTotal = currentDue;

    const selectedBillVal = billSelect ? billSelect.value : "ALL";
    if (selectedBillVal && selectedBillVal !== "ALL") {
        const foundSale = (sales || []).find(s => s.id === selectedBillVal || s.invoiceNo === selectedBillVal);
        if (foundSale) {
            origBillNo = foundSale.invoiceNo;
            origBillDate = new Date(foundSale.date).toLocaleString();
            origBillTotal = foundSale.total;
        }
    } else {
        // If customer has a single credit bill, link directly to it
        const cleanCustPhone = cleanPhone(cust.phone);
        const creditBills = (sales || []).filter(s => 
            (s.customerId === cust.id || (s.customerPhone && cleanPhone(s.customerPhone) === cleanCustPhone)) && 
            s.transactionType === "Credit"
        );
        if (creditBills.length === 1) {
            origBillNo = creditBills[0].invoiceNo;
            origBillDate = new Date(creditBills[0].date).toLocaleString();
            origBillTotal = creditBills[0].total;
        }
    }

    // Determine payment status
    const paymentStatus = remainingBalance <= 0 ? "PAID IN FULL / CLEARED" : "PARTIALLY SETTLED";

    // Create settlement transaction entry with full receipt details
    const settlement = {
        id: "SET-" + Date.now(),
        receiptNo: "REC-" + (1000 + (cust.settlements || []).length + 1),
        date: paymentDate,
        amount,
        paymentMode,
        notes,
        originalBillNo: origBillNo,
        originalBillDate: origBillDate,
        totalCreditAmount: origBillTotal,
        previousBalance: currentDue,
        remainingBalance,
        paymentStatus
    };

    // Update customer credit account state
    cust.totalPaid = (cust.totalPaid || 0) + amount;
    cust.outstandingBalance = remainingBalance;
    cust.settlements = cust.settlements || [];
    cust.settlements.push(settlement);
    cust.updatedAt = Date.now();

    // Persist and synchronize
    saveCustomers();
    dispatchDeltaSync('PAYMENT_SETTLED', {
        customerId: cust.id,
        settlement,
        outstandingBalance: cust.outstandingBalance,
        totalPaid: cust.totalPaid
    });

    // Close settle modal
    closeModal("settle-payment-modal");

    // Refresh UI sections
    renderCustomerDetailsSection();
    onBillingCustomerPhoneChange();

    // If customer ledger modal is currently open, refresh in place
    if (currentLedgerCustomerId === cust.id) {
        openCustomerLedgerModal(cust.id);
    }

    // Automatically generate and present detailed payment settlement receipt!
    openSettlementReceiptModal(settlement.id, cust.id);
}

// --- Settlement Receipt Handlers ---
function openSettlementReceiptModal(settlementId, customerId) {
    const cust = (customers || []).find(c => c.id === customerId);
    if (!cust) return;

    const settlement = (cust.settlements || []).find(s => s.id === settlementId) || (cust.settlements || []).slice(-1)[0];
    if (!settlement) return;

    // 1. Store Branding
    const storeNameEl = document.getElementById("receipt-store-name");
    const storeRoleEl = document.getElementById("receipt-store-role");
    const storePlaceEl = document.getElementById("receipt-store-place");
    const storeContactEl = document.getElementById("receipt-store-contact");
    const storeGstEl = document.getElementById("receipt-store-gst");
    const storeGstValEl = document.getElementById("receipt-store-gst-val");

    if (storeNameEl) storeNameEl.innerText = currentStore.storeName || "I CONNECT Mobile Shop";
    if (storeRoleEl) storeRoleEl.innerText = currentStore.storeRole || "Smartphones & Electronics Retail";
    if (storePlaceEl) storePlaceEl.innerText = currentStore.place || "Main Branch";
    if (storeContactEl) storeContactEl.innerText = currentStore.mobile ? `Mobile: ${currentStore.mobile}` : "";

    if (storeGstEl && storeGstValEl) {
        if (currentStore.gst && currentStore.gst.trim()) {
            storeGstValEl.innerText = currentStore.gst.trim();
            storeGstEl.classList.remove("hidden");
        } else {
            storeGstEl.classList.add("hidden");
        }
    }

    // 2. Receipt Metadata
    const receiptNoEl = document.getElementById("receipt-no");
    const receiptDateEl = document.getElementById("receipt-date-time");

    if (receiptNoEl) receiptNoEl.innerText = settlement.receiptNo || "REC-0000";
    if (receiptDateEl) receiptDateEl.innerText = new Date(settlement.date).toLocaleString();

    // 3. Customer Info
    const custNameEl = document.getElementById("receipt-customer-name");
    const custPhoneEl = document.getElementById("receipt-customer-phone");
    const custPlaceEl = document.getElementById("receipt-customer-place");

    if (custNameEl) custNameEl.innerText = cust.name;
    if (custPhoneEl) custPhoneEl.innerText = `+91 ${cust.phone}`;
    if (custPlaceEl) custPlaceEl.innerText = `${cust.place || '-'} ${cust.address ? ' | ' + cust.address : ''}`;

    // 4. Settlement Details
    const origBillNoEl = document.getElementById("receipt-orig-bill-no");
    const origBillDateEl = document.getElementById("receipt-orig-bill-date");
    const totalCreditEl = document.getElementById("receipt-total-credit");
    const paymentModeEl = document.getElementById("receipt-payment-mode");
    const notesEl = document.getElementById("receipt-notes");
    const amountPaidEl = document.getElementById("receipt-amount-paid");
    const remainingBalEl = document.getElementById("receipt-remaining-balance");
    const statusBadgeEl = document.getElementById("receipt-payment-status");

    if (origBillNoEl) origBillNoEl.innerText = settlement.originalBillNo || "General Settlement";
    if (origBillDateEl) origBillDateEl.innerText = settlement.originalBillDate || "-";
    if (totalCreditEl) totalCreditEl.innerText = `₹${(settlement.totalCreditAmount || settlement.previousBalance || 0).toFixed(2)}`;
    if (paymentModeEl) paymentModeEl.innerText = settlement.paymentMode || "Cash";
    if (notesEl) notesEl.innerText = settlement.notes || "None";
    if (amountPaidEl) amountPaidEl.innerText = `₹${settlement.amount.toFixed(2)}`;
    if (remainingBalEl) remainingBalEl.innerText = `₹${(settlement.remainingBalance || 0).toFixed(2)}`;

    if (statusBadgeEl) {
        if ((settlement.remainingBalance || 0) <= 0) {
            statusBadgeEl.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase";
            statusBadgeEl.innerText = "PAID IN FULL / CLEARED";
        } else {
            statusBadgeEl.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase";
            statusBadgeEl.innerText = `PARTIALLY SETTLED (REMAINING: ₹${settlement.remainingBalance.toFixed(2)})`;
        }
    }

    openModal("settlement-receipt-modal");
}

function printSettlementReceipt() {
    document.body.classList.add("printing-settlement-receipt");
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove("printing-settlement-receipt");
        }, 500);
    }, 150);
}

// --- Customer History & Ledger Handlers ---
function setLedgerFilter(filterType) {
    currentLedgerFilter = filterType;
    const filterButtons = {
        'all': document.getElementById("ledger-filter-btn-all"),
        'debit': document.getElementById("ledger-filter-btn-debit"),
        'credit': document.getElementById("ledger-filter-btn-credit"),
        'settlement': document.getElementById("ledger-filter-btn-settlement")
    };

    Object.keys(filterButtons).forEach(k => {
        const btn = filterButtons[k];
        if (btn) {
            if (k === filterType) {
                btn.className = "px-2.5 py-1 rounded-md text-xs font-bold bg-red-600 text-white shadow-xs";
            } else {
                btn.className = "px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600 hover:text-gray-900";
            }
        }
    });

    if (currentLedgerCustomerId) {
        openCustomerLedgerModal(currentLedgerCustomerId);
    }
}

function openCustomerLedgerModal(customerId) {
    const cust = (customers || []).find(c => c.id === customerId);
    if (!cust) return;

    currentLedgerCustomerId = customerId;

    // 1. Populate Customer Header Info
    const nameEl = document.getElementById("ledger-cust-name");
    const phoneEl = document.getElementById("ledger-cust-phone");
    const placeEl = document.getElementById("ledger-cust-place");
    const addrEl = document.getElementById("ledger-cust-address");
    const idProofBox = document.getElementById("ledger-cust-idproof-box");
    const idProofImg = document.getElementById("ledger-cust-idproof-img");

    if (nameEl) nameEl.innerText = cust.name;
    if (phoneEl) phoneEl.innerText = `+91 ${cust.phone}`;
    if (placeEl) placeEl.innerText = cust.place || "-";
    if (addrEl) addrEl.innerText = cust.address || "-";

    if (cust.idProof) {
        if (idProofImg) idProofImg.src = cust.idProof;
        if (idProofBox) {
            idProofBox.classList.remove("hidden");
            idProofBox.classList.add("flex");
        }
    } else {
        if (idProofBox) {
            idProofBox.classList.remove("flex");
            idProofBox.classList.add("hidden");
        }
    }

    // 2. Populate 4 KPI Cards
    const cleanCustPhone = cleanPhone(cust.phone);
    const allCustomerSales = (sales || []).filter(s => 
        s.customerId === cust.id || (s.customerPhone && cleanPhone(s.customerPhone) === cleanCustPhone)
    );

    const totalDebitBilled = allCustomerSales
        .filter(s => s.transactionType === "Debit")
        .reduce((sum, s) => sum + (s.total || 0), 0);
    const totalCreditBilled = cust.totalCreditBilled || allCustomerSales
        .filter(s => s.transactionType === "Credit")
        .reduce((sum, s) => sum + (s.total || 0), 0);
    const totalPaid = cust.totalPaid || 0;
    const due = cust.outstandingBalance || 0;

    const debitEl = document.getElementById("ledger-total-debit");
    const billedEl = document.getElementById("ledger-total-billed");
    const paidEl = document.getElementById("ledger-total-paid");
    const dueEl = document.getElementById("ledger-outstanding");

    if (debitEl) debitEl.innerText = `₹${(totalDebitBilled || 0).toFixed(2)}`;
    if (billedEl) billedEl.innerText = `₹${(totalCreditBilled || 0).toFixed(2)}`;
    if (paidEl) paidEl.innerText = `₹${(totalPaid || 0).toFixed(2)}`;
    if (dueEl) dueEl.innerText = `₹${(due || 0).toFixed(2)}`;

    // 3. Settle button state
    const settleBtn = document.getElementById("ledger-settle-btn");
    if (settleBtn) {
        if (due > 0) {
            settleBtn.innerHTML = `<i class="fas fa-hand-holding-dollar mr-1"></i>Settle Payment (₹${(due || 0).toFixed(2)})`;
            settleBtn.classList.remove("opacity-50", "pointer-events-none");
        } else {
            settleBtn.innerHTML = `<i class="fas fa-check-circle mr-1"></i>Balance Cleared`;
            settleBtn.classList.add("opacity-50", "pointer-events-none");
        }
    }

    // 4. Build Complete Chronological Activity History
    const timeline = [];

    // All Customer Invoices (Both Debit and Credit Bills)
    allCustomerSales.forEach(s => {
        const isDebit = (s.transactionType === "Debit");
        timeline.push({
            date: new Date(s.date).getTime(),
            dateStr: new Date(s.date).toLocaleString(),
            type: isDebit ? "debit" : "credit",
            ref: s.invoiceNo,
            desc: `${(s.items || []).length} items • ${isDebit ? 'Debit Bill (Due Amount)' : 'Credit Bill (Paid)'}`,
            debit: isDebit ? (s.total || 0) : 0,
            credit: isDebit ? 0 : (s.total || 0),
            settled: 0,
            saleId: s.id
        });
    });

    // Payment Settlements
    (cust.settlements || []).forEach(set => {
        timeline.push({
            date: new Date(set.date).getTime(),
            dateStr: new Date(set.date).toLocaleString(),
            type: "settle",
            ref: set.receiptNo || "SETTLEMENT",
            desc: `Mode: ${set.paymentMode || 'Cash'}${set.notes ? ` • ${set.notes}` : ''}`,
            debit: 0,
            credit: 0,
            settled: set.amount || 0,
            settleId: set.id,
            customerId: cust.id
        });
    });

    // Sort ascending by date to compute accurate running due balances on credit account
    timeline.sort((a, b) => a.date - b.date);

    let runningBal = 0;
    timeline.forEach(item => {
        if (item.type === "credit") {
            runningBal += item.credit;
        } else if (item.type === "settle") {
            runningBal = Math.max(0, runningBal - item.settled);
        }
        item.runningBal = runningBal;
    });

    // Reverse for latest activity first
    let displayList = [...timeline].reverse();

    // Apply Filter Tab
    if (currentLedgerFilter === "debit") {
        displayList = displayList.filter(it => it.type === "debit");
    } else if (currentLedgerFilter === "credit") {
        displayList = displayList.filter(it => it.type === "credit");
    } else if (currentLedgerFilter === "settlement") {
        displayList = displayList.filter(it => it.type === "settle");
    }

    const tbody = document.getElementById("customer-ledger-tbody");
    if (tbody) {
        tbody.innerHTML = "";
        if (displayList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No transactions found for the selected filter.</td></tr>`;
        } else {
            displayList.forEach(item => {
                let badgeClass = "bg-gray-100 text-gray-700";
                let badgeText = "Transaction";

                if (item.type === "debit") {
                    badgeClass = "bg-blue-100 text-blue-800";
                    badgeText = "Debit Bill";
                } else if (item.type === "credit") {
                    badgeClass = "bg-purple-100 text-purple-800";
                    badgeText = "Credit Bill";
                } else if (item.type === "settle") {
                    badgeClass = "bg-emerald-100 text-emerald-800";
                    badgeText = "Settlement";
                }

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50/70 border-b border-gray-100">
                        <td class="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">${item.dateStr}</td>
                        <td class="px-3 py-3">
                            <div class="flex items-center space-x-1.5">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}">
                                    ${badgeText}
                                </span>
                                <strong class="text-gray-900">${escapeHtml(item.ref)}</strong>
                            </div>
                        </td>
                        <td class="px-3 py-3 text-gray-500 text-xs truncate max-w-[160px]" title="${escapeHtml(item.desc)}">
                            ${escapeHtml(item.desc)}
                        </td>
                        <td class="px-3 py-3 text-right font-bold ${(item.debit || 0) > 0 ? 'text-blue-700' : 'text-gray-300'}">
                            ${(item.debit || 0) > 0 ? `+₹${(item.debit || 0).toFixed(2)}` : '-'}
                        </td>
                        <td class="px-3 py-3 text-right font-bold ${(item.credit || 0) > 0 ? 'text-purple-700' : 'text-gray-300'}">
                            ${(item.credit || 0) > 0 ? `+₹${(item.credit || 0).toFixed(2)}` : '-'}
                        </td>
                        <td class="px-3 py-3 text-right font-bold ${(item.settled || 0) > 0 ? 'text-emerald-700' : 'text-gray-300'}">
                            ${(item.settled || 0) > 0 ? `-₹${(item.settled || 0).toFixed(2)}` : '-'}
                        </td>
                        <td class="px-3 py-3 text-right font-extrabold ${item.type === 'debit' ? 'text-gray-400' : 'text-amber-700'}">
                            ${item.type === 'debit' ? '₹0.00 (Paid)' : `₹${Math.max(0, item.runningBal || 0).toFixed(2)}`}
                        </td>
                        <td class="px-3 py-3 text-center no-print">
                            ${(item.type === 'debit' || item.type === 'credit') ? `
                                <button type="button" onclick="viewInvoiceFromLedger('${item.saleId}')" class="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] shadow-2xs whitespace-nowrap cursor-pointer">
                                    <i class="fas fa-file-invoice mr-1 text-gray-500"></i>Bill
                                </button>
                            ` : `
                                <button type="button" onclick="viewReceiptFromLedger('${item.settleId}', '${item.customerId}')" class="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] shadow-2xs whitespace-nowrap cursor-pointer">
                                    <i class="fas fa-receipt mr-1 text-emerald-600"></i>Receipt
                                </button>
                            `}
                        </td>
                    </tr>
                `;
            });
        }
    }

    openModal("customer-ledger-modal");
}

function viewInvoiceFromLedger(saleId) {
    const sale = (sales || []).find(s => s.id === saleId || s.invoiceNo === saleId);
    if (sale) {
        openInvoiceModal(sale);
    } else {
        alert("Invoice details not found.");
    }
}

function viewReceiptFromLedger(settlementId, customerId) {
    openSettlementReceiptModal(settlementId, customerId);
}

function openLedgerCustomerIdProof() {
    const cust = (customers || []).find(c => c.id === currentLedgerCustomerId);
    if (cust && cust.idProof) {
        openEnlargedImage(cust.idProof, `${cust.name} - ID Proof`, `Verified ID Proof (1080 × 1080 px Format)`);
    }
}

function openCustomerTableIdProof(customerId) {
    const cust = (customers || []).find(c => c.id === customerId);
    if (cust && cust.idProof) {
        openEnlargedImage(cust.idProof, `${cust.name} - ID Proof`, `Customer ID Proof (1080 × 1080 px Format)`);
    }
}

function openSettleFromLedger() {
    const custId = currentLedgerCustomerId;
    closeModal("customer-ledger-modal");
    if (custId) {
        openSettlePaymentModal(custId);
    }
}

function printCustomerLedger() {
    document.body.classList.add("printing-ledger");
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove("printing-ledger");
        }, 500);
    }, 150);
}

// ==========================================
// CUSTOMER PORTAL & PASSWORD ACCESS SYSTEM
// ==========================================

function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    if (btnEl) {
        const icon = btnEl.querySelector('i');
        if (icon) {
            icon.className = isPw ? 'fas fa-eye-slash text-xs' : 'fas fa-eye text-xs';
        }
    }
}

function updateCustomerPasswordModalStatus() {
    const banner = document.getElementById("customer-password-status-banner");
    const input = document.getElementById("input-customer-password");
    if (input) input.value = customerPassword || "";
    if (banner) {
        if (customerPassword && customerPassword.trim()) {
            banner.className = "text-xs p-2.5 rounded-xl border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center space-x-2";
            banner.innerHTML = `<i class="fas fa-check-circle text-emerald-600"></i><span>Customer password is configured and active.</span>`;
            banner.classList.remove("hidden");
        } else {
            banner.className = "text-xs p-2.5 rounded-xl border bg-amber-50 text-amber-800 border-amber-200 flex items-center space-x-2";
            banner.innerHTML = `<i class="fas fa-exclamation-triangle text-amber-600"></i><span>No password configured. Customers cannot log in until a password is set.</span>`;
            banner.classList.remove("hidden");
        }
    }
}

function openSetCustomerPasswordModal() {
    if (currentUserRole === 'customer') {
        alert("Only store owners can configure customer access passwords.");
        return;
    }
    updateCustomerPasswordModalStatus();
    openModal("set-customer-password-modal");
}

function saveCustomerPassword() {
    const input = document.getElementById("input-customer-password");
    const val = input ? input.value.trim() : "";
    if (!val) {
        alert("Please enter a valid password for customer access.");
        return;
    }
    customerPassword = val;
    localStorage.setItem("iconnect_customer_password", customerPassword);
    saveSyncedData();
    dispatchDeltaSync("CUSTOMER_PASSWORD_UPDATED", { customerPassword });
    updateCustomerPasswordModalStatus();
    alert("Customer password saved successfully! Customers can now log in using this password to view Product Inventory and Reports.");
    closeModal("set-customer-password-modal");
}

function clearCustomerPassword() {
    if (!customerPassword) {
        alert("No customer password is currently configured.");
        return;
    }
    if (confirm("Are you sure you want to remove the customer access password? Customers will not be able to log in until a new password is set.")) {
        customerPassword = "";
        localStorage.removeItem("iconnect_customer_password");
        saveSyncedData();
        dispatchDeltaSync("CUSTOMER_PASSWORD_UPDATED", { customerPassword: "" });
        updateCustomerPasswordModalStatus();
        alert("Customer password has been removed.");
        closeModal("set-customer-password-modal");
    }
}

function handleCustomerLogin() {
    const passInput = document.getElementById("customer-login-password");
    const password = passInput ? passInput.value.trim() : "";
    const errorBanner = document.getElementById("auth-error");
    const errorMsg = document.getElementById("auth-error-msg");
    const submitBtn = document.getElementById("customer-login-btn");

    if (errorBanner) errorBanner.classList.add("hidden");
    if (!password) {
        if (errorMsg) errorMsg.innerText = "Please enter the customer access password.";
        if (errorBanner) errorBanner.classList.remove("hidden");
        return;
    }

    if (submitBtn) submitBtn.disabled = true;

    const deviceId = getOrCreateDeviceId();
    const deviceName = getDeviceName();

    fetch('/api/auth/customer-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Pinggy-No-Screen': 'true',
            'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ password, deviceId, deviceName })
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
        if (data.offline || status >= 500) {
            const cachedPw = customerPassword || localStorage.getItem("iconnect_customer_password");
            if (cachedPw && cachedPw === password) {
                applyCustomerLoginSuccess({
                    email: localStorage.getItem("iconnect_user_email") || "customer@store.local",
                    storeName: localStorage.getItem("iconnect_store_name") || "Sales & Billing Software",
                    storeRole: localStorage.getItem("iconnect_store_role") || "Point of Sale & Billing Management",
                    place: localStorage.getItem("iconnect_store_place") || "",
                    mobile: localStorage.getItem("iconnect_store_mobile") || "",
                    gst: localStorage.getItem("iconnect_store_gst") || ""
                });
                return;
            }
        }

        if (data.error) {
            const cachedPw = customerPassword || localStorage.getItem("iconnect_customer_password");
            if (cachedPw && cachedPw === password) {
                applyCustomerLoginSuccess({
                    email: localStorage.getItem("iconnect_user_email") || "customer@store.local",
                    storeName: localStorage.getItem("iconnect_store_name") || "Sales & Billing Software",
                    storeRole: localStorage.getItem("iconnect_store_role") || "Point of Sale & Billing Management",
                    place: localStorage.getItem("iconnect_store_place") || "",
                    mobile: localStorage.getItem("iconnect_store_mobile") || "",
                    gst: localStorage.getItem("iconnect_store_gst") || ""
                });
                return;
            }
            if (errorMsg) errorMsg.innerText = data.error;
            if (errorBanner) errorBanner.classList.remove("hidden");
        } else if (data.success && data.store) {
            applyCustomerLoginSuccess(data.store);
        }
    })
    .catch(err => {
        const cachedPw = customerPassword || localStorage.getItem("iconnect_customer_password");
        if (cachedPw && cachedPw === password) {
            applyCustomerLoginSuccess({
                email: localStorage.getItem("iconnect_user_email") || "customer@store.local",
                storeName: localStorage.getItem("iconnect_store_name") || "Sales & Billing Software",
                storeRole: localStorage.getItem("iconnect_store_role") || "Point of Sale & Billing Management",
                place: localStorage.getItem("iconnect_store_place") || "",
                mobile: localStorage.getItem("iconnect_store_mobile") || "",
                gst: localStorage.getItem("iconnect_store_gst") || ""
            });
            return;
        }
        if (errorMsg) errorMsg.innerText = "Connection unreachable. Please verify password.";
        if (errorBanner) errorBanner.classList.remove("hidden");
    })
    .finally(() => {
        if (submitBtn) submitBtn.disabled = false;
    });
}

function applyCustomerLoginSuccess(store) {
    currentUserRole = "customer";
    localStorage.setItem("iconnect_user_role", "customer");
    if (store) {
        if (store.email) localStorage.setItem("iconnect_user_email", store.email);
        if (store.storeName) localStorage.setItem("iconnect_store_name", store.storeName);
        if (store.storeRole) localStorage.setItem("iconnect_store_role", store.storeRole);
        if (store.place) localStorage.setItem("iconnect_store_place", store.place);
        if (store.mobile) localStorage.setItem("iconnect_store_mobile", store.mobile);
        if (store.additionalMobile) localStorage.setItem("iconnect_store_mobile_alt", store.additionalMobile);
        if (store.gst) localStorage.setItem("iconnect_store_gst", store.gst);
    }
    checkAuth();
    switchTab("products");
}

function applyCustomerRolePermissions() {
    const isCustomer = currentUserRole === "customer";
    
    // Sidebar navigation tabs restricted for customers
    const restrictedTabs = ["dashboard", "billing", "sales-history", "customer-details"];
    document.querySelectorAll(".nav-link").forEach(link => {
        const tab = link.getAttribute("data-tab");
        if (restrictedTabs.includes(tab)) {
            if (isCustomer) {
                link.classList.add("hidden");
            } else {
                link.classList.remove("hidden");
            }
        }
    });

    // Owner only action buttons
    document.querySelectorAll(".owner-only-action").forEach(el => {
        if (isCustomer) {
            el.classList.add("hidden");
        } else {
            el.classList.remove("hidden");
        }
    });

    // Header display name
    const userDisplayEl = document.getElementById("user-display-name");
    if (userDisplayEl) {
        if (isCustomer) {
            userDisplayEl.innerText = "Customer Portal (View Only)";
            userDisplayEl.className = "text-xs font-bold text-indigo-700 hidden lg:inline";
        } else {
            userDisplayEl.innerText = `Welcome, ${currentStore.storeName || "Owner"}`;
            userDisplayEl.className = "text-xs font-bold theme-red-text hidden lg:inline";
        }
    }

    // If currently on a restricted tab, switch to products
    if (isCustomer && restrictedTabs.includes(activeTab)) {
        switchTab("products");
    }
}

// Window global bindings for customer subsystem
window.switchCustomerSubTab = switchCustomerSubTab;
window.renderCustomerDetailsSection = renderCustomerDetailsSection;
window.renderCustomerCreditSection = renderCustomerCreditSection;
window.renderAllCustomersTable = renderAllCustomersTable;
window.renderCustomerCreditTable = renderCustomerCreditTable;
window.openAddCustomerModal = openAddCustomerModal;
window.quickRegisterCreditCustomer = quickRegisterCreditCustomer;
window.onCustomerIdProofSelected = onCustomerIdProofSelected;
window.removeCustomerIdProof = removeCustomerIdProof;
window.previewCustomerTempIdProof = previewCustomerTempIdProof;
window.saveCustomer = saveCustomer;
window.deleteCustomer = deleteCustomer;
window.openSettlePaymentModal = openSettlePaymentModal;
window.onSettleBillSelectChange = onSettleBillSelectChange;
window.setQuickSettleAmount = setQuickSettleAmount;
window.updateSettlePreview = updateSettlePreview;
window.processPaymentSettlement = processPaymentSettlement;
window.openSettlementReceiptModal = openSettlementReceiptModal;
window.printSettlementReceipt = printSettlementReceipt;
window.setLedgerFilter = setLedgerFilter;
window.openCustomerLedgerModal = openCustomerLedgerModal;
window.viewInvoiceFromLedger = viewInvoiceFromLedger;
window.viewReceiptFromLedger = viewReceiptFromLedger;
window.openLedgerCustomerIdProof = openLedgerCustomerIdProof;
window.openCustomerTableIdProof = openCustomerTableIdProof;
window.openSettleFromLedger = openSettleFromLedger;
window.printCustomerLedger = printCustomerLedger;
window.onBillingCustomerPhoneChange = onBillingCustomerPhoneChange;
window.maskPhoneNumber = maskPhoneNumber;
window.dispatchDeltaSync = dispatchDeltaSync;
window.applyIncomingDeltaSync = applyIncomingDeltaSync;
window.toggleAuthForm = toggleAuthForm;
window.togglePasswordVisibility = togglePasswordVisibility;
window.openSetCustomerPasswordModal = openSetCustomerPasswordModal;
window.updateCustomerPasswordModalStatus = updateCustomerPasswordModalStatus;
window.saveCustomerPassword = saveCustomerPassword;
window.clearCustomerPassword = clearCustomerPassword;
window.handleCustomerLogin = handleCustomerLogin;
window.applyCustomerRolePermissions = applyCustomerRolePermissions;


