import { Prisma } from "@prisma/client";
import { TransactionRepository } from "../repositories/TransactionRepository.js";
import { CategoryRepository } from "../repositories/CategoryRepository.js";
import { ApiError } from "../utils/ApiHandler.js";
import prisma from "../config/db.js";
import { NotificationService } from "./NotificationService.js";
import { UserRepository } from "../repositories/UserRepository.js";

const transactionRepository = new TransactionRepository();
const categoryRepository = new CategoryRepository();
const userRepository = new UserRepository();
const notificationService = new NotificationService();

export class TransactionService {
    async addTransaction(userId, data, file) {
        if (data.amount <= 0) {
            throw new ApiError(400, "Transaction amount must be positive");
        }

        const dateObj = new Date(data.date);
        if (isNaN(dateObj.getTime())) {
            throw new ApiError(400, "Invalid transaction date");
        }

        const category = await categoryRepository.findById(data.categoryId);
        if (!category || category.userId !== userId) {
            throw new ApiError(404, "Category not found");
        }

        return prisma.$transaction(async (tx) => {
            let receiptId = null;
            if (file) {
                const receipt = await tx.receipt.create({
                    data: {
                        filePath: file.path,
                        fileType: file.mimetype,
                        userId: userId
                    }
                });
                receiptId = receipt.id;
            }

            // Cleanup data to avoid passing extra fields or duplicate userId/receiptId
            const { categoryId, description, amount, currency } = data;

            const transaction = await tx.transaction.create({
                data: {
                    amount,
                    currency,
                    description,
                    categoryId,
                    date: dateObj,
                    userId,
                    receiptId
                },
                include: { category: true, receipt: true }
            });

            // Budget check logic (simplified)
            const budget = await tx.budget.findFirst({
                where: {
                    userId,
                    categoryId: data.categoryId,
                    month: dateObj.getMonth() + 1,
                    year: dateObj.getFullYear(),
                },
            });

            if (budget) {
                const totalSpent = await tx.transaction.aggregate({
                    where: {
                        userId,
                        categoryId: data.categoryId,
                        date: {
                            gte: new Date(budget.year, budget.month - 1, 1),
                            lt: new Date(budget.year, budget.month, 1),
                        },
                    },
                    _sum: {
                        amount: true,
                    },
                });

                const spent = totalSpent._sum.amount || 0;
                if (spent + data.amount > budget.amount) {
                    console.warn(`Budget overrun for category ${category.name}`);
                    const user = await userRepository.findById(userId);
                    if (user) {
                        notificationService.sendBudgetOverrunEmail(
                            user.email,
                            category.name,
                            parseFloat(budget.amount.toString()),
                            spent + data.amount
                        );
                    }
                }
            }

            return transaction;
        });
    }

    async getAllTransactions(userId, filters) {
        return transactionRepository.findAll(userId, filters);
    }

    async updateTransaction(userId, id, data) {
        const transaction = await transactionRepository.findById(id);
        if (!transaction || transaction.userId !== userId) {
            throw new ApiError(404, "Transaction not found");
        }
        return transactionRepository.updateTransaction(id, data);
    }

    async deleteTransaction(userId, id) {
        const transaction = await transactionRepository.findById(id);
        if (!transaction || transaction.userId !== userId) {
            throw new ApiError(404, "Transaction not found");
        }
        return transactionRepository.deleteTransaction(id);
    }

    async getDashboard(userId) {
        const summary = await transactionRepository.getDashboardSummary(userId);
        return { summary, breakdown: summary.breakdown };
    }
}
