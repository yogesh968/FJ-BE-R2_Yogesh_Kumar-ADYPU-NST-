import prisma from "../config/db.js";

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
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [incomeTotal, expenseTotal, monthlyIncome, monthlyExpense] = await Promise.all([
            prisma.transaction.aggregate({
                where: { userId, category: { type: "INCOME" } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { userId, category: { type: "EXPENSE" } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { userId, category: { type: "INCOME" }, date: { gte: startOfMonth } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { userId, category: { type: "EXPENSE" }, date: { gte: startOfMonth } },
                _sum: { amount: true }
            })
        ]);

        // Last 6 months history
        const historyStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const historyTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: historyStart }
            },
            include: { category: true }
        });

        const history = [];
        for (let i = 0; i < 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const m = date.getMonth() + 1;
            const y = date.getFullYear();

            const monthTx = historyTransactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate.getMonth() + 1 === m && txDate.getFullYear() === y;
            });

            history.push({
                month: date.toLocaleString('default', { month: 'short' }),
                income: monthTx.filter(t => t.category.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
                expense: monthTx.filter(t => t.category.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
            });
        }

        const total_income = incomeTotal._sum.amount || 0;
        const total_expenses = expenseTotal._sum.amount || 0;

        return {
            allTime: {
                total_income,
                total_expenses,
                total_savings: total_income - total_expenses
            },
            monthly: {
                month_income: monthlyIncome._sum.amount || 0,
                month_expenses: monthlyExpense._sum.amount || 0
            },
            history
        };
    }

    async getCategoryBreakdown(userId) {
        const categories = await prisma.category.findMany({
            where: { userId },
            include: {
                transactions: true
            }
        });

        return categories.map(c => ({
            category_name: c.name,
            category_type: c.type,
            total_amount: c.transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)
        }));
    }
}
