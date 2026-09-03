const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const Jimp = require('jimp');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'hackathon_super_secret_key_2026';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const DB_PATH = path.join(__dirname, '../database/db.sqlite');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('DB Connection error', err);
    else console.log('Connected to SQLite DB');
});
db.run("PRAGMA foreign_keys = ON;");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

function logActivity(complaint_id, user_id, action, details) {
    db.run(
        "INSERT INTO activity_logs (complaint_id, user_id, action, details) VALUES (?, ?, ?, ?)",
        [complaint_id, user_id, action, JSON.stringify(details)]
    );
}

// ---------------- AUTHENTICATION ----------------
app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!['reporter', 'authority'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [name, email, hashedPassword, role], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
                return res.status(500).json({ error: err.message });
            }
            
            const user = { id: this.lastID, name, email, role };
            const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, user });
        });
    } catch (e) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT id, name, email, password as hash, role FROM users WHERE email = ?", [email], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
        
        // Because seed data passwords aren't hashed, we check both plain (for demo) and bcrypt
        const isValid = await bcrypt.compare(password, user.hash).catch(() => false);
        const isPlainMatch = password === user.hash; // Fallback for old unhashed seed data
        
        if (!isValid && !isPlainMatch) return res.status(401).json({ error: 'Invalid credentials' });
        
        const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: payload });
    });
});

const authMiddleware = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'No token' });
    try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch(e) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ---------------- COMPLAINTS ----------------
app.get('/api/complaints', (req, res) => {
    db.all("SELECT * FROM complaints ORDER BY priority_score DESC, created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/complaints/:id', (req, res) => {
    db.get("SELECT * FROM complaints WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.get('/api/complaints/:id/logs', (req, res) => {
    db.all("SELECT * FROM activity_logs WHERE complaint_id = ? ORDER BY timestamp DESC", [req.params.id], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/complaints', authMiddleware, upload.single('image'), async (req, res) => {
    const { title, description, category, latitude, longitude } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    let phash = null;
    let priority_score = 10.0;
    
    // Priority logic
    // Distance POI, Duplicate count etc
    
    if (req.file) {
        try {
            const image = await Jimp.read(req.file.path);
            phash = image.hash();
        } catch(e) { console.error('Hash error', e); }
    }

    const query = `INSERT INTO complaints (
        reporter_id, title, description, category, latitude, longitude, image_path, image_phash, priority_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [req.user.id, title, description, category, latitude, longitude, imagePath, phash, priority_score], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const id = this.lastID;
        logActivity(id, req.user.id, 'complaint_created', { note: "Complaint submitted" });
        io.emit('complaint_created', { id, title });
        res.json({ id, success: true });
    });
});

// Update status
app.post('/api/complaints/:id/status', authMiddleware, (req, res) => {
    const { status } = req.body;
    db.run("UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity(req.params.id, req.user.id, 'status_changed', { status });
        io.emit('status_changed', { id: req.params.id, status });
        res.json({ success: true });
    });
});

// Assign
app.post('/api/complaints/:id/assign', authMiddleware, (req, res) => {
    db.run("UPDATE complaints SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.user.id, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity(req.params.id, req.user.id, 'complaint_assigned', { to: req.user.id });
        io.emit('complaint_updated', { id: req.params.id });
        res.json({ success: true });
    });
});

// Resolve
app.post('/api/complaints/:id/resolve', authMiddleware, upload.single('image'), async (req, res) => {
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    let phash = null;
    if (req.file) {
        try {
            const image = await Jimp.read(req.file.path);
            phash = image.hash();
        } catch(e) {}
    }

    db.run("UPDATE complaints SET status = 'resolved', after_repair_image_path = ?, after_repair_image_phash = ?, verification_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?", 
        [imagePath, phash, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity(req.params.id, req.user.id, 'resolution_submitted', { note: 'Resolved by authority' });
        io.emit('complaint_resolved', { id: req.params.id });
        res.json({ success: true });
    });
});

// Confirm
app.post('/api/complaints/:id/confirm', authMiddleware, (req, res) => {
    db.run("UPDATE complaints SET citizen_confirmation = 'confirmed', status = 'completed', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id], (err) => {
        logActivity(req.params.id, req.user.id, 'citizen_confirmation', { note: 'Citizen confirmed fix' });
        io.emit('complaint_completed', { id: req.params.id });
        res.json({ success: true });
    });
});

// Upvote complaint
app.post('/api/complaints/:id/upvote', authMiddleware, (req, res) => {
    db.run("UPDATE complaints SET upvotes = upvotes + 1, priority_score = priority_score + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        logActivity(req.params.id, req.user.id, 'complaint_upvoted', { note: 'Citizen upvoted' });
        io.emit('complaint_updated', { id: req.params.id });
        res.json({ success: true });
    });
});

// Analytics Dashboard
app.get('/api/analytics', authMiddleware, (req, res) => {
    if (req.user.role !== 'authority') return res.status(403).json({ error: 'Unauthorized' });
    
    db.all("SELECT category, COUNT(*) as count FROM complaints GROUP BY category", [], (err, categories) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all("SELECT status, COUNT(*) as count FROM complaints GROUP BY status", [], (err, statuses) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ categories, statuses });
        });
    });
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
