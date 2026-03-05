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
        endOfMonth.setHours(23, 59, 59, 999);

        // 1. Fetch Categories first to filter by type in groupBy
        const categories = await prisma.category.findMany({ where: { userId } });
        const incomeCategoryIds = categories.filter(c => c.type === 'INCOME').map(c => c.id);
        const expenseCategoryIds = categories.filter(c => c.type === 'EXPENSE').map(c => c.id);

        // 2. Fetch Aggregated Data in parallel
        const [
            incomeTotals,
            expenseTotals,
            historyStats,
            monthlyBreakdown,
            budgets
        ] = await Promise.all([
            // Income aggregates by currency
            prisma.transaction.groupBy({
                by: ['currency'],
                where: { userId, categoryId: { in: incomeCategoryIds } },
                _sum: { amount: true }
            }),
            // Expense aggregates by currency
            prisma.transaction.groupBy({
                by: ['currency'],
                where: { userId, categoryId: { in: expenseCategoryIds } },
                _sum: { amount: true }
            }),
            // Last 6 months history
            prisma.transaction.findMany({
                where: {
                    userId,
                    date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
                },
                select: { amount: true, currency: true, date: true, categoryId: true }
            }),
            // Current month breakdown by category and currency
            prisma.transaction.groupBy({
                by: ['categoryId', 'currency'],
                where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
                _sum: { amount: true }
            }),
            prisma.budget.findMany({
                where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
                include: { category: true }
            })
        ]);

        // 3. Process Global Totals
        let total_income = 0;
        let total_expenses = 0;
        incomeTotals.forEach(item => total_income += convertToUSD(item._sum.amount, item.currency));
        expenseTotals.forEach(item => total_expenses += convertToUSD(item._sum.amount, item.currency));

        // Create quick lookup maps
        const categoryTypeMap = new Map(categories.map(c => [c.id, c.type]));

        // 4. Process Monthly Totals and Breakdown
        let month_income = 0;
        let month_expenses = 0;
        const breakdownMap = new Map();

        // Initialize breakdown map with all categories
        categories.forEach(c => {
            breakdownMap.set(c.id, { category_name: c.name, category_type: c.type, total_amount: 0 });
        });

        monthlyBreakdown.forEach(item => {
            const amountUSD = convertToUSD(item._sum.amount, item.currency);
            const catData = breakdownMap.get(item.categoryId);
            if (catData) {
                catData.total_amount += amountUSD;
                if (catData.category_type === 'INCOME') month_income += amountUSD;
                else month_expenses += amountUSD;
            }
        });

        // 5. Process History (Last 6 Months)
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
                const type = categoryTypeMap.get(t.categoryId);
                if (type === 'INCOME') h.income += amountUSD;
                else h.expense += amountUSD;
            }
        });

        // 5. Budget Comparison
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
