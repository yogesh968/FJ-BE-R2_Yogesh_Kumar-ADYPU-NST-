import prisma from "../config/db.js";

const EXCHANGE_RATES = {
    USD: 1.0,
    EUR: 1.08,
    GBP: 1.26,
    INR: 0.012,
    JPY: 0.0067
};

function convertToUSD(amount, currency) {
    const rate = EXCHANGE_RATES[currency] || 1.0;
    return parseFloat(amount.toString()) * rate;
}

function isSameMonth(d1, d2) {
    return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
}

export class TransactionRepository {
    async createTransaction(data) {
        return prisma.transaction.create({ data });
    }

    async findById(id) {
        return prisma.transaction.findUnique({ where: { id } });
    }

    async updateTransaction(id, data) {
        return prisma.transaction.update({
            where: { id },
            data,
        });
    }

    async deleteTransaction(id) {
        return prisma.transaction.delete({ where: { id } });
    }

    async findAll(userId, filters) {
        let { startDate, endDate, categoryId, sortBy, order, page = 1, limit = 100, month, year } = filters;

        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0); // Last day of month
            endDate.setHours(23, 59, 59, 999);
        }

        const query = {
            where: {
                userId,
                AND: [
                    startDate ? { date: { gte: startDate } } : {},
                    endDate ? { date: { lte: endDate } } : {},
                    categoryId ? { categoryId } : {},
                ],
            },
            orderBy: sortBy ? { [sortBy]: order || "desc" } : { date: "desc" },
            skip: (page - 1) * limit,
            take: Number(limit),
            include: { category: true },
        };

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany(query),
            prisma.transaction.count({ where: query.where }),
        ]);

        return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async getDashboardSummary(userId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // 1. Fetch Totals and Budgets in parallel
        const [stats, historyStats, monthlyTransactions, budgets, categories] = await Promise.all([
            // All-time totals (approximated as SUM in DB is faster than manual loops)
            prisma.transaction.groupBy({
                by: ['userId'],
                where: { userId },
                _sum: { amount: true },
            }),
            // Last 6 months history
            prisma.transaction.findMany({
                where: {
                    userId,
                    date: {
                        gte: new Date(now.getFullYear(), now.getMonth() - 5, 1)
                    }
                },
                include: { category: true }
            }),
            // Current month transactions for breakdown
            prisma.transaction.findMany({
                where: {
                    userId,
                    date: { gte: startOfMonth, lte: endOfMonth }
                },
                include: { category: true }
            }),
            prisma.budget.findMany({
                where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
                include: { category: true }
            }),
            prisma.category.findMany({ where: { userId } })
        ]);

        // 2. Process Monthly Data
        let month_income = 0;
        let month_expenses = 0;
        const breakdownMap = new Map();

        categories.forEach(c => {
            breakdownMap.set(c.id, { category_name: c.name, category_type: c.type, total_amount: 0 });
        });

        monthlyTransactions.forEach(t => {
            const amountUSD = convertToUSD(t.amount, t.currency);
            if (t.category.type === 'INCOME') {
                month_income += amountUSD;
            } else {
                month_expenses += amountUSD;
                const catData = breakdownMap.get(t.categoryId);
                if (catData) catData.total_amount += amountUSD;
            }
        });

        // 3. Process History (Last 6 Months)
        const historyMap = new Map();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            historyMap.set(key, { month: d.toLocaleString('default', { month: 'short' }), income: 0, expense: 0 });
        }

        historyStats.forEach(t => {
            const txDate = new Date(t.date);
            const histKey = `${txDate.getFullYear()}-${txDate.getMonth()}`;
            if (historyMap.has(histKey)) {
                const amountUSD = convertToUSD(t.amount, t.currency);
                const h = historyMap.get(histKey);
                if (t.category.type === 'INCOME') h.income += amountUSD;
                else h.expense += amountUSD;
            }
        });

        // 4. Calculate Global Totals (We'll use a single query for this now)
        const totals = await prisma.transaction.groupBy({
            by: ['userId'],
            where: { userId },
            _sum: { amount: true }
        });
        // Note: For multi-currency, a single group-by sum isn't 100% accurate if currencies differ.
        // But for dashboard speed, we retrieve only what we need.
        // Let's refine global totals to be more accurate but still fast.
        let total_income = 0;
        let total_expenses = 0;

        // Fetching aggregate by category type is better
        const typeTotals = await prisma.transaction.findMany({
            where: { userId },
            select: { amount: true, currency: true, category: { select: { type: true } } }
        });

        typeTotals.forEach(t => {
            const amountUSD = convertToUSD(t.amount, t.currency);
            if (t.category.type === 'INCOME') total_income += amountUSD;
            else total_expenses += amountUSD;
        });

        const budgetComparison = budgets.map(b => {
            const actual = breakdownMap.get(b.categoryId)?.total_amount || 0;
            return {
                category: b.category.name,
                budget: parseFloat(b.amount.toString()),
                actual: actual
            };
        });

        return {
            allTime: {
                total_income,
                total_expenses,
                total_savings: total_income - total_expenses
            },
            monthly: {
                month_income,
                month_expenses,
                budgetComparison
            },
            history: Array.from(historyMap.values()),
            breakdown: Array.from(breakdownMap.values()).filter(c => c.total_amount > 0)
        };
    }

    async getCategoryBreakdown(userId, month = null, year = null) {
        // This is now redundant but kept for any specific API calls
        const targetDate = (month && year) ? new Date(year, month - 1, 1) : new Date();
        const summary = await this.getDashboardSummary(userId);
        return summary.breakdown;
    }
}
