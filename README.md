# CivicResolve - Hackathon MVP

CivicResolve connects citizens and municipal officers for faster resolution of civic issues like potholes and broken streetlights.

## Technology Stack
- **Frontend**: React.js, Tailwind CSS, Vite, React Router, Socket.io-client
- **Backend**: Node.js, Express, Multer, Jimp (pHash calculation), Socket.io
- **Database**: SQLite (local `database/db.sqlite`)

## Folder Structure
- `database/`: SQLite database initialization and seeding.
- `backend/`: Express server for API routing, static serving, uploads handling, and WebSocket real-time events.
- `frontend/`: The React SPA source code.
- `uploads/`: Directory where uploaded citizen and authority report images are stored.

## Installation & Setup

1. **Install Root / Database dependencies**:
   ```bash
   cd d:\hackathon
   npm install
   cd database
   node seed.js
   ```
2. **Install Backend dependencies**:
   ```bash
   cd d:\hackathon\backend
   npm install
   ```
3. **Install Frontend dependencies**:
   ```bash
   cd d:\hackathon\frontend
   npm install
   npm run build
   ```

## Running the Application

Since this is an integrated single-port hackathon setup, you only need to run the backend, which will serve both the APIs and the built frontend SPA.

```bash
cd d:\hackathon\backend
node server.js
```

The application will be running at `http://localhost:3000`.

## Demo Accounts (from database seed)
- **Citizen / Reporter**: `jane@example.com` / `password123`
- **Authority / Officer**: `admin@civicresolve.gov` / `password123`

## Demo Flow
1. Login as `jane@example.com` and use the Citizen Dashboard to report an issue. Upload an image, add a title and description.
2. Open another browser/tab, login as `admin@civicresolve.gov`. You will immediately see the issue appear due to Socket.io updates.
3. Observe the Priority Engine score calculated on the Authority Dashboard.
4. The Authority assigns the issue to themselves, updates status to `in_progress`, and then uploads an "After Repair" image to resolve it.
5. In the Citizen tab, the issue status immediately updates to show it is resolved, and asks for confirmation.
6. The Citizen clicks "Confirm Fix", updating the final status to `completed`.
