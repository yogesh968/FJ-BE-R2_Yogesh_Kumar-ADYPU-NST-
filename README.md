# Personal Finance Tracker - Senior Backend Architect Implementation
use these credentials for better experience 
- Email: yogakumar221@gmail.com
- password : 123456



This repository contains a production-level implementation of a Personal Finance Tracker using Node.js, Express.js, and Prisma with PostgreSQL.

## 🚀 Key Features

### Backend Architecture
- **Clean Architecture**: Domain (Schemas) -> Repositories -> Services -> Controllers -> Routes.
- **Repository Pattern**: All database interactions are encapsulated in unique repository classes.
- **Dependency Injection**: Services depend on repositories, allowing for easier testing and isolation.
- **Error Handling**: Centralized error middleware using custom `ApiError` and `ApiResponse` utilities.

### Database Design
- **Normalised Schema**: Users, Categories (Income/Expense), Transactions, Budgets, Receipts.
- **Performance**: Indexes on high-traffic columns (`userId`, `date`).
- **Precision**: Uses `NUMERIC(15, 2)` (Prisma `Decimal`) for accurate financial calculations.
- **Integrity**: `ON DELETE RESTRICT` on categories preventing deletion of historical expenditure.

### Technical Stack
- **Auth**: JWT (Access & Refresh Tokens), Bcrypt, Passport.js (Google strategy).
- **Validation**: Joi (Schemas for all input payloads).
- **Communication**: SendGrid for notifications.
- **Reporting**: Aggregated SQL queries with JSON export.
- **File System**: Multer for Receipt uploads.

## 🛠️ Installation & Setup

1. **Environment Variables**:
   ```bash
   cp .env.example .env
   # Update your DATABASE_URL and JWT secrets
   ```

2. **Database Migration**:
   ```bash
   npm install
   npx prisma migrate dev --name init
   ```

3. **Running the App**:
   ```bash
   npm run dev
   or
   npm start
   ```

## 📂 Project Walkthrough

- `backend/src/repositories/`: Pure database access.
- `backend/src/services/`: Core business logic (Budget checks, aggregations).
- `backend/src/controllers/`: HTTP-level handlers.
- `backend/src/validators/`: Input validation schemas.
- `frontend/`: Basic HTML/Vanilla JS to demo API functionality.

## 🔍 Optimized Queries & Aggregations
Check `src/repositories/TransactionRepository.ts` for optimized raw SQL queries like `getDashboardSummary` and `getCategoryBreakdown`.

---
*Developed for Interview Evaluation - Senior Backend Architect Role.*
