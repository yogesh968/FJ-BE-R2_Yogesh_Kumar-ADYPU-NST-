import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import passport from "./config/passport.js";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from "./middleware/ErrorHandler.js";
import router from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:52048',
    process.env.FRONTEND_URL || 'https://fjproject-qlu33yqr0-yogesh-kumars-projects-b37dbb16.vercel.app'
];

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://i.pravatar.cc", "https://www.gstatic.com", "*"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "http://localhost:3000", "http://localhost:52048", "https://fj-be-r2-yogesh-kumar-adypu-nst.vercel.app", "https://fjproject.vercel.app", "https://fj-project.vercel.app", "https://fjproject-qlu33yqr0-yogesh-kumars-projects-b37dbb16.vercel.app", "https://cdn.jsdelivr.net"]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            console.log('Origin not allowed:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads
const baseUploadDir = process.env.VERCEL || process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : path.join(__dirname, "../../uploads");
app.use("/uploads", express.static(baseUploadDir));

app.use(passport.initialize());

// Express JS replacer for BigInt support
app.set("json replacer", (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
);

// Routes
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.use("/api/v1", router);

// Serve static frontend files
const frontendPath = path.join(__dirname, "../../frontend");
app.use(express.static(frontendPath));

// Redirect all other traffic to index.html (SPA logic)
app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(frontendPath, "index.html"));
    }
});

// Error handling
app.use(errorHandler);

export default app;
