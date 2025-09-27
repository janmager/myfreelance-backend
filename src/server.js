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
import clientsUserRoutes from "./routes/clientsUserRoutes.js";
import clientsAdminRoutes from "./routes/clientsAdminRoutes.js";
import notesRoutes from "./routes/notesRoutes.js";
import tasksRoutes from "./routes/tasksRoutes.js";
import projectsRoutes from "./routes/projectsRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import { wakeupJob, subscriptionCheckJob } from "./config/cron.js";
import filesRoutes from "./routes/filesRoutes.js";
import contractsRoutes from "./routes/contractsRoutes.js";
import linksRoutes from "./routes/linksRoutes.js";
import limitsRoutes from "./routes/limitsRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
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
    subscriptionCheckJob.start();
    console.log('✅ [CRON] Wakeup job started');
    console.log('✅ [CRON] Subscription check job started');
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
app.use("/api/clients", clientsUserRoutes);
app.use("/api/admin/clients", clientsAdminRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/contracts", contractsRoutes);
app.use("/api/links", linksRoutes);
app.use("/api/limits", limitsRoutes);
app.use("/api/subscription", subscriptionRoutes);

// Log all routes
console.log('📋 [ROUTES] Available API endpoints:');
console.log('  - /api/users - User management');
console.log('  - /api/mailing - Email management');
console.log('  - /api/clients - Client management');
console.log('  - /api/admin/clients - Admin client management');
console.log('  - /api/notes - Notes management');
console.log('  - /api/tasks - Tasks management');
console.log('  - /api/projects - Projects management');
console.log('  - /api/search - Global search');
console.log('  - /api/files - Files management');
console.log('  - /api/contracts - Contracts management');
console.log('  - /api/links - Links management');
console.log('  - /api/limits - Limits and usage management');
console.log('  - /api/subscription - Subscription management');

app.get("/api/health", (req, res) => {
    res.send("API is working fine.");
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});