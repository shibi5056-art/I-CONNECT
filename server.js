const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

// Helpers for reading/writing users DB
function readUsersDB() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

function writeUsersDB(db) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2), 'utf-8');
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

const server = http.createServer((req, res) => {
    // 1. Handle REST API Routes
    if (req.url.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method === 'POST') {
            getRequestBody(req).then(body => {
                const db = readUsersDB();
                
                if (req.url === '/api/auth/signup') {
                    const { name, email, password } = body;
                    if (!name || !email || !password) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Name, email, and password are required.' }));
                        return;
                    }
                    const normalizedEmail = email.toLowerCase().trim();
                    if (db[normalizedEmail]) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'An account with this email already exists.' }));
                        return;
                    }
                    
                    // Create user
                    db[normalizedEmail] = {
                        name,
                        password,
                        products: [],
                        categories: [],
                        sales: []
                    };
                    writeUsersDB(db);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, name, email: normalizedEmail }));
                    
                } else if (req.url === '/api/auth/login') {
                    const { email, password } = body;
                    const normalizedEmail = (email || '').toLowerCase().trim();
                    const user = db[normalizedEmail];
                    if (!user || user.password !== password) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid email or password.' }));
                        return;
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, name: user.name, email: normalizedEmail }));
                    
                } else if (req.url === '/api/sync/save') {
                    const email = req.headers['x-user-email'];
                    const normalizedEmail = (email || '').toLowerCase().trim();
                    const user = db[normalizedEmail];
                    if (!user) {
                        res.writeHead(401);
                        res.end(JSON.stringify({ error: 'Unauthorized.' }));
                        return;
                    }
                    const { products, categories, sales } = body;
                    user.products = products || [];
                    user.categories = categories || [];
                    user.sales = sales || [];
                    writeUsersDB(db);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
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
        
        if (req.method === 'GET' && req.url === '/api/sync/get') {
            const email = req.headers['x-user-email'];
            const normalizedEmail = (email || '').toLowerCase().trim();
            const db = readUsersDB();
            const user = db[normalizedEmail];
            if (!user) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized.' }));
                return;
            }
            res.writeHead(200);
            res.end(JSON.stringify({
                products: user.products,
                categories: user.categories,
                sales: user.sales
            }));
            return;
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
});
