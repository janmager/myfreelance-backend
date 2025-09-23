import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import rateLimiter from "./middleware/rateLimiter.js";
import { initializeDatabase } from "./config/db.js";
import cors from "cors";

// Set timezone to UTC for production server compatibility
// The server runs in GMT+0, so we need to handle timezone conversion in the application
process.env.TZ = 'UTC';
import usersRoute from "./routes/usersRoute.js";
import mailingRoute from "./routes/mailingRoute.js";
import { wakeupJob } from "./config/cron.js";
dotenv.config();
//
const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(rateLimiter);

let test = false;

// cron jobs
if (process.env.NODE_ENV === "production" || test) {
    wakeupJob.start();
}

const PORT = process.env.PORT || 5001;

// Initialize database
initializeDatabase().then(() => {
    console.log('✅ [DATABASE] Database initialized successfully');
}).catch(error => {
    console.error('❌ [DATABASE] Failed to initialize database:', error);
});

// Routes
app.use("/api/users", usersRoute);
app.use("/api/mailing", mailingRoute);


// Log all routes
console.log('📋 [ROUTES] Available API endpoints:');
console.log('  - /api/users - User management');

app.get("/api/health", (req, res) => {
    res.send("API is working fine.");
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});