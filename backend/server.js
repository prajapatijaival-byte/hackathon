const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const Jimp = require('jimp');

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
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT id, name, email, role FROM users WHERE email = ? AND password = ?", [email, password], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ token: Buffer.from(JSON.stringify(user)).toString('base64'), user });
    });
});

const authMiddleware = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'No token' });
    try {
        const token = header.split(' ')[1];
        req.user = JSON.parse(Buffer.from(token, 'base64').toString('ascii'));
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

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
