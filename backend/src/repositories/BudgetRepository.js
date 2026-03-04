import prisma from "../config/db.js";

export class BudgetRepository {
    async createBudget(data) {
        return prisma.budget.create({ data });
    }

    async findByUserId(userId) {
        return prisma.budget.findMany({
            where: { userId },
            include: { category: true },
        });
    }

    async findByMonthYear(userId, month, year) {
        return prisma.budget.findMany({
            where: { userId, month, year },
            include: { category: true },
        });
    }

    async findUnique(userId, categoryId, month, year) {
        return prisma.budget.findUnique({
            where: {
                userId_categoryId_month_year: { userId, categoryId, month, year },
            },
        });
    }

    async updateBudget(id, data) {
        return prisma.budget.update({
            where: { id },
            data,
        });
    }

    async deleteBudget(id) {
        return prisma.budget.delete({ where: { id } });
    }

    async getBudgetStatus(userId, month, year) {
        const budgets = await prisma.budget.findMany({
            where: { userId, month, year },
            include: { category: true },
        });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);

        // Fetch all relevant transactions once to avoid N+1 or complex groupBys
        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                category: {
                    type: 'EXPENSE'
                }
            }
        });

        return budgets.map((b) => {
            const spentAmount = transactions
                .filter(t => t.categoryId === b.categoryId)
                .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

            return {
                ...b,
                spent: spentAmount,
                remaining: parseFloat(b.amount.toString()) - spentAmount,
                isOverrun: spentAmount > parseFloat(b.amount.toString()),
            };
        });
    }
}
