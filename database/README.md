# CivicResolve - Database Foundation

This directory contains the Stage 1 database foundation for the CivicResolve project.

## Technology Stack
- **Database**: SQLite (`db.sqlite`)
- **Schema**: SQL (`schema.sql`)
- **Driver**: Node `sqlite3` driver
- **Seeding**: Node.js script (`seed.js`)

## Files
- `db.sqlite`: The generated SQLite database file.
- `schema.sql`: Contains all table definitions, relationships, and indexes.
- `seed.js`: A Node.js script that connects to the database, runs the schema, and populates it with realistic demo data representing the various civic issue scenarios.

## Schema Overview

The schema is designed to be minimalistic yet comprehensive for a hackathon MVP, directly powering the API backend (Stage 2) and React frontend (Stage 3).

### Tables
1. **users**: Stores demo `reporter` and `authority` accounts.
2. **complaint_clusters**: Groups duplicate complaints indicating the same physical issue.
3. **complaints**: The central table containing issue reports. Includes geo-coordinates, image paths, image hashes (for duplicates), priority scores, POI distances, and resolution state.
4. **activity_logs**: Records all timeline events (creation, assignment, status changes, resolution).

### Indexes
Common lookup fields are indexed for performance:
- `status`, `priority_score`, `cluster_id`, `reporter_id`, `assigned_to`, `created_at` on `complaints`
- `complaint_id`, `timestamp` on `activity_logs`

## Initialization & Testing
To initialize the database from scratch and load the seed data:

1. Ensure dependencies are installed (`npm install` from the project root).
2. Run the seed script from this directory:
   ```bash
   node seed.js
   ```

## Design Decisions
- Used `INTEGER` for foreign keys and `DATETIME` for timestamps.
- Added a `priority_score` and related fields (like `priority_distance_poi_m`) to the `complaints` table to support the Priority Engine logic in Stage 2.
- Used `sqlite3` in node to maintain a reliable and easy-to-setup environment without relying on external servers like PostgreSQL.
- Avoided spatial extensions (like PostGIS); the application logic will handle standard coordinate calculations directly.
