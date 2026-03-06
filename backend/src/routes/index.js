import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { CategoryController } from "../controllers/CategoryController.js";
import { TransactionController } from "../controllers/TransactionController.js";
import { BudgetController } from "../controllers/BudgetController.js";
import { ReportingController } from "../controllers/ReportingController.js";
import { AIController } from "../controllers/AIController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { loginRateLimiter } from "../middleware/RateLimiter.js";
import { validate } from "../middleware/ValidationMiddleware.js";
import {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    categorySchema,
    transactionSchema,
    budgetSchema
} from "../validators/Schemas.js";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import { upload, avatarUpload } from "../middleware/UploadMiddleware.js";

const router = Router();
const authController = new AuthController();
const categoryController = new CategoryController();
const transactionController = new TransactionController();
const budgetController = new BudgetController();
const reportingController = new ReportingController();
const aiController = new AIController();

// Auth routes
router.post("/auth/register", validate(registerSchema), authController.register);
router.post("/auth/login", loginRateLimiter, validate(loginSchema), authController.login);
router.post("/auth/refresh-token", authController.refreshAccessToken);
router.post("/auth/logout", authMiddleware, authController.logout);
router.get("/auth/profile", authMiddleware, authController.getProfile);
router.patch("/auth/profile", authMiddleware, validate(updateProfileSchema), authController.updateProfile);
router.post("/auth/avatar", authMiddleware, avatarUpload.single("avatar"), authController.updateAvatar);

// Google OAuth routes
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
    "/auth/google/callback",
    passport.authenticate("google", { session: false }),
    (req, res) => {
        const accessToken = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Determine redirect target based on request host
        const host = req.get('host');
        let redirectUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
            redirectUrl = "http://localhost:3000";
        }

        res.redirect(`${redirectUrl}?token=${accessToken}`);
    }
);

// Category routes
router.post("/categories", authMiddleware, validate(categorySchema), categoryController.createCategory);
router.get("/categories", authMiddleware, categoryController.getAllCategories);
router.patch("/categories/:id", authMiddleware, validate(categorySchema), categoryController.updateCategory);
router.delete("/categories/:id", authMiddleware, categoryController.deleteCategory);

// Transaction routes
router.post("/transactions", authMiddleware, upload.single("receipt"), validate(transactionSchema), transactionController.addTransaction);
router.get("/transactions", authMiddleware, transactionController.getAllTransactions);
router.patch("/transactions/:id", authMiddleware, validate(transactionSchema), transactionController.updateTransaction);
router.delete("/transactions/:id", authMiddleware, transactionController.deleteTransaction);

// Budget routes
router.post("/budgets", authMiddleware, validate(budgetSchema), budgetController.createBudget);
router.get("/budgets", authMiddleware, budgetController.getBudgets);
router.get("/budgets/status", authMiddleware, budgetController.getBudgetStatus);
router.patch("/budgets/:id", authMiddleware, validate(budgetSchema), budgetController.updateBudget);
router.delete("/budgets/:id", authMiddleware, budgetController.deleteBudget);

// Reporting routes
router.get("/reports/monthly", authMiddleware, reportingController.getMonthlyReport);
router.get("/reports/export-csv", authMiddleware, reportingController.exportCSV);
router.get("/reports/export-pdf", authMiddleware, reportingController.exportPDF);

// Dashboard
router.get("/dashboard", authMiddleware, transactionController.getDashboard);

// AI Chat
router.post("/ai/chat", authMiddleware, aiController.chat);

export default router;
