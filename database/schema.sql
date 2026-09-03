-- CivicResolve Stage 1 Database Schema

-- Enable foreign keys (needs to be run on every connection, but good to have here as a reminder)
PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('reporter', 'authority')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Complaint Clusters Table
CREATE TABLE IF NOT EXISTS complaint_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    representative_complaint_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'reported' CHECK(status IN ('reported', 'assigned', 'in_progress', 'resolved', 'pending', 'visually_verified', 'citizen_confirmed', 'completed')),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    image_path TEXT,
    image_phash TEXT,
    cluster_id INTEGER,
    duplicate_count INTEGER DEFAULT 0,
    priority_score REAL DEFAULT 0.0,
    priority_distance_poi_m REAL,
    priority_age_hours REAL,
    assigned_to INTEGER,
    is_suspicious BOOLEAN DEFAULT 0,
    suspicious_reason TEXT,
    upvotes INTEGER DEFAULT 0,
    verification_status TEXT,
    citizen_confirmation TEXT,
    after_repair_image_path TEXT,
    after_repair_image_phash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cluster_id) REFERENCES complaint_clusters(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_cluster ON complaints(cluster_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_complaint ON activity_logs(complaint_id, timestamp DESC);
