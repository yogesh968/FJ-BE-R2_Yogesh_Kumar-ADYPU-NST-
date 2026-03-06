import prisma from "../config/db.js";

const EXCHANGE_RATES = {
    USD: 1.0,
    EUR: 1.08,
    GBP: 1.26,
    INR: 0.012,
    JPY: 0.0067
};

function convertToUSD(amount, currency) {
    if (amount === null || amount === undefined) return 0;
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
            const m = parseInt(month);
            const y = parseInt(year);
            if (!isNaN(m) && !isNaN(y)) {
                startDate = new Date(y, m - 1, 1);
                endDate = new Date(y, m, 0, 23, 59, 59, 999);
            }
        }

        // Validity check to prevent Prisma crashes on Invalid Date
        const isValidDate = (d) => d instanceof Date && !isNaN(d);

        const query = {
            where: {
                userId,
                AND: [
                    isValidDate(startDate) ? { date: { gte: startDate } } : {},
                    isValidDate(endDate) ? { date: { lte: endDate } } : {},
                    categoryId && categoryId !== 'null' && categoryId !== 'undefined' ? { categoryId } : {},
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

        // 1. Fetch Categories and all historic transactions grouped by category/currency
        let categories = await prisma.category.findMany({ where: { userId } });

        // AUTO-SEED: If no categories exist, seed them now before proceeding
        if (categories.length === 0) {
            const defaults = [
                { name: "Salary", type: "INCOME", userId },
                { name: "Investment", type: "INCOME", userId },
                { name: "Rent", type: "EXPENSE", userId },
                { name: "Groceries", type: "EXPENSE", userId },
                { name: "Utilities", type: "EXPENSE", userId },
                { name: "Entertainment", type: "EXPENSE", userId },
                { name: "Transport", type: "EXPENSE", userId }
            ];
            await prisma.category.createMany({ data: defaults, skipDuplicates: true });
            categories = await prisma.category.findMany({ where: { userId } });
        }

        const [transactionAggregates, historyStats, budgets] = await Promise.all([
            prisma.transaction.groupBy({
                by: ['categoryId', 'currency'],
                where: { userId },
                _sum: { amount: true }
            }),
            // Last 6 months history - we need dates so we fetch findMany
            prisma.transaction.findMany({
                where: {
                    userId,
                    date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
                },
                select: { amount: true, currency: true, date: true, categoryId: true }
            }),
            prisma.budget.findMany({
                where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
                include: { category: true }
            })
        ]);

        // Create quick lookup maps for category info
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        // 2. Process Global and Monthly Totals
        let total_income = 0;
        let total_expenses = 0;
        let month_income = 0;
        let month_expenses = 0;
        const breakdownMap = new Map();

        // Initialize breakdown map with zeroed categories
        categories.forEach(c => {
            breakdownMap.set(c.id, { category_name: c.name, category_type: c.type, total_amount: 0 });
        });

        // Sum up global totals from aggregates
        transactionAggregates.forEach(item => {
            const amountUSD = convertToUSD(item._sum.amount, item.currency);
            const cat = categoryMap.get(item.categoryId);
            if (cat) {
                if (cat.type === 'INCOME') total_income += amountUSD;
                else total_expenses += amountUSD;
            }
        });

        // 3. Specifically process current month breakdown
        // For precision in the breakdown chart, we fetch the month's ones specifically 
        // to simplify the map logic, or just filter findMany if it's small.
        // Let's use the groupBy from the month specifically for the Donut chart
        const monthlyAggs = await prisma.transaction.groupBy({
            by: ['categoryId', 'currency'],
            where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
            _sum: { amount: true }
        });

        monthlyAggs.forEach(item => {
            const amountUSD = convertToUSD(item._sum.amount, item.currency);
            const catData = breakdownMap.get(item.categoryId);
            if (catData) {
                catData.total_amount += amountUSD;
                if (catData.category_type === 'INCOME') month_income += amountUSD;
                else month_expenses += amountUSD;
            }
        });

        // 4. Process History (Last 6 Months)
        const historyMap = new Map();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            historyMap.set(key, { month: d.toLocaleString('default', { month: 'short' }), income: 0, expense: 0 });
        }

        historyStats.forEach(t => {
            if (!t.date) return;
            const txDate = new Date(t.date);
            if (isNaN(txDate.getTime())) return;

            const histKey = `${txDate.getFullYear()}-${txDate.getMonth()}`;
            if (historyMap.has(histKey)) {
                const amountUSD = convertToUSD(t.amount, t.currency);
                const h = historyMap.get(histKey);
                const cat = categoryMap.get(t.categoryId);
                if (cat) {
                    if (cat.type === 'INCOME') h.income += amountUSD;
                    else h.expense += amountUSD;
                }
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
