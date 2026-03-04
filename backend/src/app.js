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

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://i.pravatar.cc", "https://www.gstatic.com", `http://localhost:${process.env.PORT || 3000}`],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "http://localhost:3000"]
        }
    }
}));

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Express JS replacer for BigInt support
app.set("json replacer", (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
);

// Routes
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
