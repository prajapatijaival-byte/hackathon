const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.sqlite');
const schemaPath = path.join(__dirname, 'schema.sql');

// Remove existing database to ensure a clean seed
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Removed existing db.sqlite');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON;");

    // Read and execute schema
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error executing schema:', err.message);
            process.exit(1);
        }
        console.log('Schema created successfully.');
        
        insertSeedData();
    });
});

function insertSeedData() {
    console.log('Inserting seed data...');

    db.serialize(() => {
        const insertUser = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
        insertUser.run("Jane Reporter", "jane@example.com", "password123", "reporter");
        insertUser.run("Admin Auth", "admin@civicresolve.gov", "password123", "authority");
        insertUser.run("Spammer", "spam@example.com", "password123", "reporter");
        insertUser.finalize();

        const insertCluster = db.prepare("INSERT INTO complaint_clusters (representative_complaint_id) VALUES (?)");
        insertCluster.run(null); // cluster_id 1
        insertCluster.finalize();

        const insertComplaint = db.prepare(`
            INSERT INTO complaints (
                reporter_id, title, description, category, status,
                latitude, longitude, cluster_id, duplicate_count,
                priority_score, priority_distance_poi_m, priority_age_hours,
                assigned_to, is_suspicious, suspicious_reason,
                verification_status, citizen_confirmation, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - (72 * 60 * 60 * 1000));
        
        // 1. Normal Complaint
        insertComplaint.run(
            1, "Pothole on Main St", "Deep pothole causing traffic slowdown.", "infrastructure", "reported",
            19.01, 72.01, null, 0,
            25.0, null, 2,
            null, 0, null,
            null, null, now.toISOString()
        );

        // 2 & 3. Multiple complaints representing the same issue (Cluster 1)
        insertComplaint.run(
            1, "Broken streetlight", "Streetlight is out completely.", "infrastructure", "reported",
            19.02, 72.02, 1, 0,
            20.0, null, 5,
            null, 0, null,
            null, null, now.toISOString()
        );

        insertComplaint.run(
            1, "Dark street here", "Streetlight not working, very dark.", "infrastructure", "assigned",
            19.0201, 72.0201, 1, 1,
            65.0, null, 10,
            2, 0, null,
            null, null, now.toISOString()
        );

        // 4. High-priority complaint near a school
        insertComplaint.run(
            1, "Exposed wiring near Demo School", "Live wires hanging from pole.", "electrical", "reported",
            19.0001, 72.0001, null, 0,
            85.0, 10, 1,
            null, 0, null,
            null, null, now.toISOString()
        );

        // 5. Old unresolved complaint
        insertComplaint.run(
            1, "Garbage pile", "Has not been collected for a week.", "sanitation", "reported",
            19.03, 72.03, null, 0,
            90.0, null, 80,
            null, 0, null,
            null, null, threeDaysAgo.toISOString()
        );

        // 6. In-progress complaint
        insertComplaint.run(
            1, "Fallen tree branch", "Blocking the sidewalk.", "infrastructure", "in_progress",
            19.04, 72.04, null, 0,
            40.0, null, 12,
            2, 0, null,
            null, null, now.toISOString()
        );

        // 7. Resolved complaint
        insertComplaint.run(
            1, "Graffiti on wall", "Offensive graffiti on public building.", "other", "resolved",
            19.05, 72.05, null, 0,
            15.0, null, 48,
            2, 0, null,
            'completed', 'confirmed', threeDaysAgo.toISOString()
        );

        // 8. Suspicious/spam example
        insertComplaint.run(
            3, "Free money", "Click here for free money!!!", "other", "reported",
            19.06, 72.06, null, 0,
            0.0, null, 0,
            null, 1, "Suspicious title and content.",
            null, null, now.toISOString()
        );

        insertComplaint.finalize();

        const insertActivity = db.prepare("INSERT INTO activity_logs (complaint_id, user_id, action, details) VALUES (?, ?, ?, ?)");
        insertActivity.run(1, 1, "complaint_created", '{"note": "User created complaint"}');
        insertActivity.run(3, 1, "complaint_created", '{"note": "User created complaint"}');
        insertActivity.run(3, 2, "complaint_assigned", '{"note": "Assigned to Admin Auth"}');
        insertActivity.run(7, 1, "complaint_created", '{"note": "User created complaint"}');
        insertActivity.run(7, 2, "resolution_submitted", '{"note": "Authority claims resolved"}');
        insertActivity.run(7, 1, "citizen_confirmation", '{"note": "Citizen confirmed resolution"}');
        insertActivity.run(7, null, "complaint_completed", '{"note": "System marked as completed"}');
        insertActivity.finalize();
    });

    // Close the database connection when done
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Seed data inserted successfully.');
        console.log('Database initialization complete.');
    });
}
