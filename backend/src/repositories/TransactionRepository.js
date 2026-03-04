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
        const { startDate, endDate, categoryId, sortBy, order, page = 1, limit = 10 } = filters;

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

        // Fetch everything once for absolute consistency
        const [allTransactions, budgets, categories] = await Promise.all([
            prisma.transaction.findMany({
                where: { userId },
                include: { category: true }
            }),
            prisma.budget.findMany({
                where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
                include: { category: true }
            }),
            prisma.category.findMany({ where: { userId } })
        ]);

        // 1. All-time and Monthly Totals
        let total_income = 0;
        let total_expenses = 0;
        let month_income = 0;
        let month_expenses = 0;

        // 2. Category Breakdown (Current Month)
        const breakdownMap = new Map();
        categories.forEach(c => {
            breakdownMap.set(c.id, {
                category_name: c.name,
                category_type: c.type,
                total_amount: 0
            });
        });

        // 3. History (Last 6 Months)
        const historyMap = new Map();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            historyMap.set(key, {
                month: d.toLocaleString('default', { month: 'short' }),
                income: 0,
                expense: 0
            });
        }

        // Single pass calculation
        allTransactions.forEach(t => {
            const txDate = new Date(t.date);
            const amountUSD = convertToUSD(t.amount, t.currency);
            const type = t.category.type;

            // Global totals
            if (type === 'INCOME') total_income += amountUSD;
            else total_expenses += amountUSD;

            // Monthly breakdown & totals
            if (isSameMonth(txDate, now)) {
                if (type === 'INCOME') month_income += amountUSD;
                else {
                    month_expenses += amountUSD;
                    const catData = breakdownMap.get(t.categoryId);
                    if (catData) catData.total_amount += amountUSD;
                }
            }

            // History
            const histKey = `${txDate.getFullYear()}-${txDate.getMonth()}`;
            if (historyMap.has(histKey)) {
                const h = historyMap.get(histKey);
                if (type === 'INCOME') h.income += amountUSD;
                else h.expense += amountUSD;
            }
        });

        // Finalize budget comparison
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
