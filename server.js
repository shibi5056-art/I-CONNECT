const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const DB_PATH = path.join(__dirname, 'db');
const USERS_FILE = path.join(DB_PATH, 'users.json');

// Ensure db directory and users.json file exist
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH);
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '{}', 'utf-8');
}

// Debounced asynchronous disk persistence for high-frequency deltas
let writeDbTimeout = null;
let pendingDbToWrite = null;

// Helpers for reading/writing users DB
function readUsersDB() {
    if (pendingDbToWrite) {
        return pendingDbToWrite;
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

function writeUsersDB(db) {
    if (writeDbTimeout) {
        clearTimeout(writeDbTimeout);
        writeDbTimeout = null;
    }
    pendingDbToWrite = db;
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
        console.error("writeUsersDB error:", err);
    }
}

function scheduleWriteUsersDB(db) {
    pendingDbToWrite = db;
    if (writeDbTimeout) return;
    writeDbTimeout = setTimeout(() => {
        writeDbTimeout = null;
        if (pendingDbToWrite) {
            try {
                fs.writeFileSync(USERS_FILE, JSON.stringify(pendingDbToWrite, null, 2), 'utf-8');
            } catch (err) {
                console.error("Scheduled users DB write error:", err);
            }
        }
    }, 150);
}

// High-speed compressed JSON response helper (Gzip / Deflate for slow connections)
function sendJsonResponse(req, res, statusCode, data, extraHeaders = {}) {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const acceptEncoding = (req.headers && req.headers['accept-encoding']) || '';
    const baseHeaders = Object.assign({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Bypass-Tunnel-Reminder': 'true'
    }, extraHeaders);

    if (acceptEncoding.includes('gzip') && Buffer.byteLength(jsonStr) > 256) {
        zlib.gzip(jsonStr, (err, compressed) => {
            if (!err) {
                baseHeaders['Content-Encoding'] = 'gzip';
                baseHeaders['Content-Length'] = compressed.length;
                res.writeHead(statusCode, baseHeaders);
                res.end(compressed);
                return;
            }
            baseHeaders['Content-Length'] = Buffer.byteLength(jsonStr);
            res.writeHead(statusCode, baseHeaders);
            res.end(jsonStr);
        });
    } else {
        baseHeaders['Content-Length'] = Buffer.byteLength(jsonStr);
        res.writeHead(statusCode, baseHeaders);
        res.end(jsonStr);
    }
}

// Parse request body for POST requests
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', err => reject(err));
    });
}

function maskPhoneNumber(phone) {
    const clean = (phone || '').replace(/[^0-9]/g, '');
    if (clean.length < 4) return '****';
    const last4 = clean.slice(-4);
    const masked = '*'.repeat(Math.max(4, clean.length - 4)) + last4;
    return '+91 ' + masked;
}

// SSE Connected Clients Map: normalizedEmail -> Set of client objects { deviceId, res, req }
const sseClients = new Map();

function registerSseClient(email, deviceId, res, req) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail) return;
    if (!sseClients.has(normalizedEmail)) {
        sseClients.set(normalizedEmail, new Set());
    }
    const clientRecord = { deviceId, res, req };
    sseClients.get(normalizedEmail).add(clientRecord);

    req.on('close', () => {
        const clientSet = sseClients.get(normalizedEmail);
        if (clientSet) {
            clientSet.delete(clientRecord);
            if (clientSet.size === 0) {
                sseClients.delete(normalizedEmail);
            }
        }
    });
}

function broadcastSyncEvent(email, eventData) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const clients = sseClients.get(normalizedEmail);
    if (!clients || clients.size === 0) return;

    const message = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of clients) {
        try {
            client.res.write(message);
            if (typeof client.res.flush === 'function') {
                client.res.flush();
            }
        } catch (err) {
            // Socket write failed, will be cleaned up on close
        }
    }
}

// SSE periodic heartbeat every 10 seconds to keep mobile connections alive across aggressive cellular NATs
setInterval(() => {
    const pingData = `: ping\n\n`;
    for (const [, clientSet] of sseClients.entries()) {
        for (const client of clientSet) {
            try {
                client.res.write(pingData);
                if (typeof client.res.flush === 'function') {
                    client.res.flush();
                }
            } catch (e) {}
        }
    }
}, 10000);

let currentTunnel = null;
let publicTunnelUrl = null;
let publicIpAddress = null;
let isStartingTunnel = false;

function refreshPublicIp() {
    const https = require('https');
    https.get('https://api.ipify.org?format=json', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            try {
                publicIpAddress = JSON.parse(d).ip;
                console.log(`Public IP / Tunnel Password: ${publicIpAddress}`);
            } catch (e) {}
        });
    }).on('error', () => {});
}
refreshPublicIp();

let cloudflareTunnelUrl = null;
let cloudflareProcess = null;
let isStartingCloudflare = false;

function startCloudflareTunnel() {
    if (isStartingCloudflare) return;
    const cloudflaredExe = path.join(__dirname, 'cloudflared.exe');
    if (!fs.existsSync(cloudflaredExe)) {
        return;
    }
    isStartingCloudflare = true;
    console.log('Initiating Cloudflare Enterprise Global Tunnel (Works on ANY network anytime)...');

    try {
        const { spawn } = require('child_process');
        const child = spawn(cloudflaredExe, ['tunnel', '--url', `http://127.0.0.1:${PORT}`], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        cloudflareProcess = child;

        function scanOutput(data) {
            const text = data.toString();
            const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
            if (match) {
                cloudflareTunnelUrl = match[0];
                console.log(`\n======================================================`);
                console.log(`CLOUDFLARE ANYTIME-AVAILABLE GLOBAL TUNNEL:`);
                console.log(`Direct URL (Any Network / 0 Password):`);
                console.log(` 👉 ${cloudflareTunnelUrl}`);
                console.log(`======================================================\n`);
                try {
                    fs.writeFileSync(path.join(__dirname, 'tunnel_url.txt'), cloudflareTunnelUrl, 'utf8');
                } catch (e) {}
            }
        }

        child.stdout.on('data', scanOutput);
        child.stderr.on('data', scanOutput);

        child.on('error', (err) => {
            console.warn('Cloudflare tunnel notice:', err.message || err);
        });

        child.on('exit', (code, sig) => {
            if (code !== 0) {
                console.log('Cloudflare tunnel process exited. Auto-reconnecting in 3s...');
            }
            cloudflareTunnelUrl = null;
            cloudflareProcess = null;
            setTimeout(() => {
                isStartingCloudflare = false;
                startCloudflareTunnel();
            }, 3000);
        });
    } catch (err) {
        console.error('Cloudflare tunnel startup error:', err.message);
        setTimeout(() => {
            isStartingCloudflare = false;
            startCloudflareTunnel();
        }, 5000);
    } finally {
        isStartingCloudflare = false;
    }
}

function cleanupChildProcesses() {
    if (cloudflareProcess) {
        try { cloudflareProcess.kill(); } catch (e) {}
        cloudflareProcess = null;
    }
}
process.on('exit', cleanupChildProcesses);
process.on('SIGINT', () => { cleanupChildProcesses(); process.exit(); });
process.on('SIGTERM', () => { cleanupChildProcesses(); process.exit(); });

// Periodic watchdog health check: auto-reconnects tunnels if system was sleeping or connection died
let consecutiveCfFailures = 0;
setInterval(() => {
    if (!cloudflareTunnelUrl || !cloudflareProcess) return;
    const https = require('https');
    const req = https.get(cloudflareTunnelUrl, { timeout: 8000 }, (res) => {
        consecutiveCfFailures = 0;
    });
    req.on('error', () => {
        consecutiveCfFailures++;
        if (consecutiveCfFailures >= 2) {
            console.warn('Cloudflare tunnel unresponsive after sleep/network drop. Auto-healing...');
            cleanupChildProcesses();
            cloudflareTunnelUrl = null;
            consecutiveCfFailures = 0;
            setTimeout(() => {
                isStartingCloudflare = false;
                startCloudflareTunnel();
            }, 1000);
        }
    });
    req.on('timeout', () => {
        req.destroy();
    });
}, 45000);

async function startTunnel() {
    if (process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME || process.env.IS_CLOUD) {
        console.log('Running on cloud hosting platform. Tunnel bypassed (direct cloud HTTPS active).');
        return;
    }
    if (isStartingTunnel) return;
    isStartingTunnel = true;
    try {
        const localtunnel = require('localtunnel');
        const preferredSubdomain = process.env.TUNNEL_SUBDOMAIN || 'iconnect-billing-pos';
        console.log(`Establishing anytime available global tunnel (Subdomain: ${preferredSubdomain})...`);
        
        let tunnel = null;
        try {
            tunnel = await localtunnel({
                port: PORT,
                local_host: '127.0.0.1',
                subdomain: preferredSubdomain
            });
        } catch (subErr) {
            console.warn(`Subdomain ${preferredSubdomain} unavailable, assigning dynamic tunnel...`);
            tunnel = await localtunnel({
                port: PORT,
                local_host: '127.0.0.1'
            });
        }

        currentTunnel = tunnel;
        publicTunnelUrl = tunnel.url;
        console.log(`\n======================================================`);
        console.log(`ANYTIME AVAILABLE GLOBAL TUNNEL (Online & Offline Ready):`);
        console.log(`Public URL: ${publicTunnelUrl}`);
        if (publicIpAddress) {
            console.log(`Tunnel Password / Public IP: ${publicIpAddress}`);
        }
        console.log(`======================================================\n`);

        tunnel.on('close', () => {
            console.log('Public tunnel connection closed. Auto-reconnecting in 3s...');
            publicTunnelUrl = null;
            currentTunnel = null;
            setTimeout(() => {
                isStartingTunnel = false;
                startTunnel();
            }, 3000);
        });

        tunnel.on('error', (err) => {
            console.warn('Public tunnel notice:', err.message || err);
            try { tunnel.close(); } catch(e) {}
        });
    } catch (err) {
        console.error('Localtunnel startup error:', err.message);
        setTimeout(() => {
            isStartingTunnel = false;
            startTunnel();
        }, 5000);
    } finally {
        isStartingTunnel = false;
    }
}

const server = http.createServer((req, res) => {
    // Enable CORS and headers for all cross-network requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-email, x-device-id, Bypass-Tunnel-Reminder, X-Pinggy-No-Screen');
    res.setHeader('Bypass-Tunnel-Reminder', 'true');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 1. Handle REST API Routes
    if (req.url.startsWith('/api/')) {
        if (!req.url.startsWith('/api/sync/events')) {
            res.setHeader('Content-Type', 'application/json');
        }
        
        if (req.method === 'POST') {
            getRequestBody(req).then(body => {
                const db = readUsersDB();
                
                if (req.url === '/api/auth/signup') {
                    const { storeName, storeRole, place, mobile, additionalMobile, gst, email, password, deviceId, deviceName } = body;
                    
                    if (!storeName || !storeRole || !place || !mobile || !email || !password) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Store Name, Store Role, Place, Mobile, Email, and Password are all required.' }));
                        return;
                    }
                    
                    const normalizedEmail = email.toLowerCase().trim();
                    if (db[normalizedEmail]) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'An account with this email already exists.' }));
                        return;
                    }

                    const activeDevices = [];
                    if (deviceId) {
                        activeDevices.push({
                            deviceId,
                            deviceName: deviceName || 'Primary Device',
                            loginTime: Date.now(),
                            lastActive: Date.now()
                        });
                    }
                    
                    // Create user with complete store profile
                    db[normalizedEmail] = {
                        storeName: storeName.trim(),
                        storeRole: storeRole.trim(),
                        place: place.trim(),
                        mobile: mobile.trim(),
                        additionalMobile: (additionalMobile || '').trim(),
                        gst: (gst || '').trim(),
                        email: normalizedEmail,
                        password: password,
                        activeDevices: activeDevices,
                        products: [],
                        categories: [],
                        sales: [],
                        customers: []
                    };
                    writeUsersDB(db);
                    
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        user: {
                            storeName: db[normalizedEmail].storeName,
                            storeRole: db[normalizedEmail].storeRole,
                            place: db[normalizedEmail].place,
                            mobile: db[normalizedEmail].mobile,
                            additionalMobile: db[normalizedEmail].additionalMobile,
                            gst: db[normalizedEmail].gst || '',
                            email: normalizedEmail,
                            activeDevices: db[normalizedEmail].activeDevices
                        }
                    }));
                    
                } else if (req.url === '/api/auth/login') {
                    const { email, password, deviceId, deviceName } = body;
                    const normalizedEmail = (email || '').toLowerCase().trim();
                    const user = db[normalizedEmail];
                    
                    if (!user || user.password !== password) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid email or password.' }));
                        return;
                    }
                    
                    // Initialize activeDevices array if not present (migration support)
                    if (!Array.isArray(user.activeDevices)) {
                        user.activeDevices = [];
                    }

                    // Stale session cleanup (> 30 days inactive)
                    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                    user.activeDevices = user.activeDevices.filter(d => d.lastActive > thirtyDaysAgo);

                    // Check if current device is already active
                    const existingDeviceIndex = user.activeDevices.findIndex(d => d.deviceId === deviceId);
                    
                    if (existingDeviceIndex !== -1) {
                        // Refresh this device's timestamp
                        user.activeDevices[existingDeviceIndex].lastActive = Date.now();
                        if (deviceName) {
                            user.activeDevices[existingDeviceIndex].deviceName = deviceName;
                        }
                    } else {
                        // Auto-evict oldest inactive session if 5-device limit reached so user never encounters a login error
                        if (user.activeDevices.length >= 5) {
                            user.activeDevices.sort((a, b) => (a.lastActive || 0) - (b.lastActive || 0));
                            user.activeDevices.shift();
                        }
                        
                        // Register new device
                        user.activeDevices.push({
                            deviceId: deviceId || ('dev_' + Date.now()),
                            deviceName: deviceName || 'Device #' + (user.activeDevices.length + 1),
                            loginTime: Date.now(),
                            lastActive: Date.now()
                        });
                    }
                    
                    writeUsersDB(db);
                    
                    broadcastSyncEvent(normalizedEmail, {
                        type: 'DEVICES_UPDATED',
                        activeDevices: user.activeDevices,
                        timestamp: Date.now()
                    });
                    
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        user: {
                            storeName: user.storeName || user.name || 'My Store',
                            storeRole: user.storeRole || 'Store Owner',
                            place: user.place || '',
                            mobile: user.mobile || '',
                            additionalMobile: user.additionalMobile || '',
                            gst: user.gst || '',
                            email: normalizedEmail,
                            activeDevices: user.activeDevices
                        }
                    }));
                    
                } else if (req.url === '/api/auth/logout') {
                    const { email, deviceId } = body;
                    const normalizedEmail = (email || '').toLowerCase().trim();
                    const user = db[normalizedEmail];
                    
                    if (user && Array.isArray(user.activeDevices)) {
                        user.activeDevices = user.activeDevices.filter(d => d.deviceId !== deviceId);
                        writeUsersDB(db);
                        broadcastSyncEvent(normalizedEmail, {
                            type: 'DEVICES_UPDATED',
                            revokedDeviceId: deviceId,
                            activeDevices: user.activeDevices,
                            timestamp: Date.now()
                        });
                    }
                    
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                    
                } else if (req.url === '/api/auth/revoke-device') {
                    const { email, password, targetDeviceId } = body;
                    const normalizedEmail = (email || '').toLowerCase().trim();
                    const user = db[normalizedEmail];
                    
                    // Allow revoking with password verification or authorized header
                    const authHeaderEmail = (req.headers['x-user-email'] || '').toLowerCase().trim();
                    const isAuthorized = (authHeaderEmail && authHeaderEmail === normalizedEmail) || 
                                         (user && user.password === password);
                                         
                    if (!user || !isAuthorized) {
                        res.writeHead(401);
                        res.end(JSON.stringify({ error: 'Unauthorized to revoke device.' }));
                        return;
                    }
                    
                    if (Array.isArray(user.activeDevices)) {
                        user.activeDevices = user.activeDevices.filter(d => d.deviceId !== targetDeviceId);
                        writeUsersDB(db);
                        broadcastSyncEvent(normalizedEmail, {
                            type: 'DEVICES_UPDATED',
                            revokedDeviceId: targetDeviceId,
                            activeDevices: user.activeDevices,
                            timestamp: Date.now()
                        });
                    }
                    
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, activeDevices: user.activeDevices }));
                    
                } else if (req.url === '/api/sync/delta') {
                    const email = req.headers['x-user-email'] || body.email;
                    const normalizedEmail = (email || '').toLowerCase().trim();
                    const user = db[normalizedEmail];
                    if (!user) {
                        sendJsonResponse(req, res, 401, { error: 'Unauthorized.' });
                        return;
                    }

                    const deviceId = req.headers['x-device-id'] || body.sourceDeviceId;
                    if (deviceId && Array.isArray(user.activeDevices)) {
                        const dev = user.activeDevices.find(d => d.deviceId === deviceId);
                        if (dev) dev.lastActive = Date.now();
                    }

                    const { action, payload } = body;
                    if (!action || !payload) {
                        sendJsonResponse(req, res, 400, { error: 'Action and payload are required.' });
                        return;
                    }

                    if (!Array.isArray(user.products)) user.products = [];
                    if (!Array.isArray(user.categories)) user.categories = [];
                    if (!Array.isArray(user.sales)) user.sales = [];
                    if (!Array.isArray(user.customers)) user.customers = [];

                    // 1. Process specific action delta
                    if (action === 'SALE_CREATED') {
                        const { sale, stockUpdates, customerUpdate } = payload;
                        if (sale && sale.id) {
                            const exists = user.sales.some(s => s.id === sale.id || s.invoiceNo === sale.invoiceNo);
                            if (!exists) {
                                user.sales.unshift(sale);
                            }
                        }
                        if (Array.isArray(stockUpdates)) {
                            stockUpdates.forEach(su => {
                                if (su && su.id) {
                                    const prod = user.products.find(p => p.id === su.id);
                                    if (prod && typeof su.stock === 'number') {
                                        prod.stock = Math.max(0, su.stock);
                                        prod.updatedAt = Date.now();
                                    }
                                }
                            });
                        }
                        if (customerUpdate && (customerUpdate.id || customerUpdate.phone)) {
                            const cKey = customerUpdate.id || customerUpdate.phone;
                            const existingCust = user.customers.find(c => c.id === cKey || c.phone === cKey);
                            if (existingCust) {
                                Object.assign(existingCust, customerUpdate);
                            } else {
                                user.customers.unshift(customerUpdate);
                            }
                        }
                    } else if (action === 'CUSTOMER_ADDED' || action === 'CUSTOMER_UPDATED') {
                        const { customer } = payload;
                        if (customer && (customer.id || customer.phone)) {
                            const existingIdx = user.customers.findIndex(c => c.id === customer.id || (c.phone && c.phone === customer.phone));
                            if (existingIdx !== -1) {
                                user.customers[existingIdx] = Object.assign({}, user.customers[existingIdx], customer);
                            } else {
                                user.customers.unshift(customer);
                            }
                        }
                    } else if (action === 'CUSTOMER_DELETED') {
                        const { customerId } = payload;
                        if (customerId) {
                            user.customers = user.customers.filter(c => c.id !== customerId);
                        }
                    } else if (action === 'PAYMENT_SETTLED') {
                        const { customerId, settlement, outstandingBalance, totalPaid } = payload;
                        const cust = user.customers.find(c => c.id === customerId);
                        if (cust) {
                            if (!Array.isArray(cust.settlements)) cust.settlements = [];
                            if (settlement && settlement.id) {
                                const exists = cust.settlements.some(s => s.id === settlement.id);
                                if (!exists) cust.settlements.unshift(settlement);
                            }
                            if (typeof outstandingBalance === 'number') cust.outstandingBalance = outstandingBalance;
                            if (typeof totalPaid === 'number') cust.totalPaid = totalPaid;
                            cust.updatedAt = Date.now();
                        }
                    } else if (action === 'PRODUCT_UPSERT') {
                        const { product } = payload;
                        if (product && product.id) {
                            const idx = user.products.findIndex(p => p.id === product.id);
                            if (idx !== -1) {
                                user.products[idx] = Object.assign({}, user.products[idx], product);
                            } else {
                                user.products.unshift(product);
                            }
                        }
                    } else if (action === 'PRODUCT_DELETE') {
                        const { productId } = payload;
                        if (productId) {
                            user.products = user.products.filter(p => p.id !== productId);
                        }
                    } else if (action === 'CATEGORIES_UPDATED') {
                        const { categories } = payload;
                        if (Array.isArray(categories)) {
                            user.categories = categories;
                        }
                    }

                    // 2. Increment version and append to ring buffer
                    user.version = (user.version || 0) + 1;
                    if (!Array.isArray(user.deltaLog)) user.deltaLog = [];
                    user.deltaLog.push({
                        version: user.version,
                        action,
                        payload,
                        sourceDeviceId: deviceId,
                        timestamp: Date.now()
                    });
                    if (user.deltaLog.length > 100) {
                        user.deltaLog.shift();
                    }

                    // 3. Asynchronously write DB without blocking
                    scheduleWriteUsersDB(db);

                    // 4. Broadcast ultra-lightweight delta to all connected clients immediately!
                    broadcastSyncEvent(normalizedEmail, {
                        type: 'DELTA_SYNC',
                        action,
                        payload,
                        sourceDeviceId: deviceId,
                        version: user.version,
                        timestamp: Date.now()
                    });

                    sendJsonResponse(req, res, 200, { success: true, version: user.version });

                } else if (req.url === '/api/sync/save') {
                    const email = req.headers['x-user-email'];
                    const normalizedEmail = (email || '').toLowerCase().trim();
                    const user = db[normalizedEmail];
                    if (!user) {
                        sendJsonResponse(req, res, 401, { error: 'Unauthorized.' });
                        return;
                    }

                    // Optional device heartbeat during sync
                    const deviceId = req.headers['x-device-id'];
                    if (deviceId && Array.isArray(user.activeDevices)) {
                        const dev = user.activeDevices.find(d => d.deviceId === deviceId);
                        if (dev) dev.lastActive = Date.now();
                    }

                    const { products, categories, sales, customers } = body;
                    user.products = products || [];
                    user.categories = categories || [];
                    user.sales = sales || [];
                    if (customers !== undefined) {
                        user.customers = customers || [];
                    }
                    user.version = (user.version || 0) + 1;
                    scheduleWriteUsersDB(db);

                    // Broadcast instant push notification to all connected devices for this user
                    broadcastSyncEvent(normalizedEmail, {
                        type: 'DATA_UPDATED',
                        sourceDeviceId: deviceId,
                        version: user.version,
                        timestamp: Date.now()
                    });

                    sendJsonResponse(req, res, 200, { success: true, version: user.version });
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Not Found' }));
                }
            }).catch(err => {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
            });
            return;
        }
        
        if (req.method === 'GET') {
            if (req.url === '/api/sync/get') {
                const email = req.headers['x-user-email'];
                const normalizedEmail = (email || '').toLowerCase().trim();
                const db = readUsersDB();
                const user = db[normalizedEmail];
                if (!user) {
                    sendJsonResponse(req, res, 401, { error: 'Unauthorized.' });
                    return;
                }
                sendJsonResponse(req, res, 200, {
                    storeName: user.storeName || user.name || 'My Store',
                    storeRole: user.storeRole || 'Store Owner',
                    place: user.place || '',
                    mobile: user.mobile || '',
                    additionalMobile: user.additionalMobile || '',
                    gst: user.gst || '',
                    activeDevices: user.activeDevices || [],
                    products: user.products || [],
                    categories: user.categories || [],
                    sales: user.sales || [],
                    customers: user.customers || [],
                    version: user.version || 0
                });
                return;
            } else if (req.url === '/api/auth/ping') {
                const email = req.headers['x-user-email'];
                const deviceId = req.headers['x-device-id'];
                const normalizedEmail = (email || '').toLowerCase().trim();
                const db = readUsersDB();
                const user = db[normalizedEmail];
                
                if (!user) {
                    sendJsonResponse(req, res, 401, { error: 'User not found.' });
                    return;
                }
                
                if (!Array.isArray(user.activeDevices)) {
                    user.activeDevices = [];
                }
                
                // If deviceId provided, verify it's still registered or auto-attach if slot available (< 5)
                if (deviceId) {
                    const dev = user.activeDevices.find(d => d.deviceId === deviceId);
                    if (!dev) {
                        // Seamless session re-attachment: auto-evict oldest inactive if capped at 5 so user is never interrupted
                        if (user.activeDevices.length >= 5) {
                            user.activeDevices.sort((a, b) => (a.lastActive || 0) - (b.lastActive || 0));
                            user.activeDevices.shift();
                        }
                        user.activeDevices.push({
                            deviceId,
                            deviceName: 'Active POS Terminal',
                            loginTime: Date.now(),
                            lastActive: Date.now()
                        });
                        scheduleWriteUsersDB(db);
                    } else {
                        dev.lastActive = Date.now();
                        scheduleWriteUsersDB(db);
                    }
                }
                
                sendJsonResponse(req, res, 200, {
                    success: true,
                    storeName: user.storeName || user.name || 'My Store',
                    storeRole: user.storeRole || 'Store Owner',
                    place: user.place || '',
                    mobile: user.mobile || '',
                    additionalMobile: user.additionalMobile || '',
                    activeDevices: user.activeDevices,
                    version: user.version || 0
                });
                return;
            } else if (req.url.startsWith('/api/sync/events')) {
                const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
                const email = reqUrl.searchParams.get('email') || req.headers['x-user-email'];
                const deviceId = reqUrl.searchParams.get('deviceId') || req.headers['x-device-id'];
                const normalizedEmail = (email || '').toLowerCase().trim();

                if (!normalizedEmail) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'User email is required for sync events.' }));
                    return;
                }

                const db = readUsersDB();
                const user = db[normalizedEmail];

                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                    'Access-Control-Allow-Origin': '*',
                    'Bypass-Tunnel-Reminder': 'true'
                });
                if (typeof res.flushHeaders === 'function') {
                    res.flushHeaders();
                }

                res.write(`data: ${JSON.stringify({ type: 'CONNECTED', deviceId, version: user ? (user.version || 0) : 0, timestamp: Date.now() })}\n\n`);
                registerSseClient(normalizedEmail, deviceId, res, req);
                return;
            } else if (req.url === '/api/tunnel') {
                res.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(cloudflareTunnelUrl || publicTunnelUrl || `http://localhost:${PORT}/`);
                return;
            } else if (req.url === '/api/network/info') {
                const lanUrls = [];
                const networkInterfaces = os.networkInterfaces();
                for (const name in networkInterfaces) {
                    for (const iface of networkInterfaces[name]) {
                        if (iface.family === 'IPv4' && !iface.internal) {
                            lanUrls.push(`http://${iface.address}:${PORT}/`);
                        }
                    }
                }
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Bypass-Tunnel-Reminder': 'true'
                });
                res.end(JSON.stringify({
                    publicUrl: cloudflareTunnelUrl || publicTunnelUrl,
                    cloudflareUrl: cloudflareTunnelUrl,
                    localtunnelUrl: publicTunnelUrl,
                    tunnelPassword: cloudflareTunnelUrl ? "" : publicIpAddress,
                    lanUrls: lanUrls,
                    localUrl: `http://localhost:${PORT}/`,
                    port: PORT,
                    maxDevices: 5
                }));
                return;
            }
        }
    }

    // 2. Handle Static Files Serving
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // Normalize path to prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`I CONNECT Mobile Shop Billing System is active!`);
    console.log(`------------------------------------------------------`);
    console.log(`Local Access: http://localhost:${PORT}/`);
    
    // Find local IP addresses
    const networkInterfaces = os.networkInterfaces();
    let hasLan = false;
    for (const name in networkInterfaces) {
        for (const iface of networkInterfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                if (!hasLan) {
                    console.log(`LAN Network Access (for other phones/computers):`);
                    hasLan = true;
                }
                console.log(` - http://${iface.address}:${PORT}/`);
            }
        }
    }
    console.log(`======================================================\n`);

    // Launch secure public internet tunnels for global access (Cloudflare Any-Network + Localtunnel)
    startCloudflareTunnel();
    startTunnel();
});
