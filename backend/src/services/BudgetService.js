import { BudgetRepository } from "../repositories/BudgetRepository.js";
import { CategoryRepository } from "../repositories/CategoryRepository.js";
import { ApiError } from "../utils/ApiHandler.js";

const budgetRepository = new BudgetRepository();
const categoryRepository = new CategoryRepository();

export class BudgetService {
    async createBudget(userId, data) {
        const category = await categoryRepository.findById(data.categoryId);
        if (!category || category.userId !== userId) {
            throw new ApiError(404, "Category not found");
        }

        const existing = await budgetRepository.findUnique(userId, data.categoryId, data.month, data.year);
        if (existing) {
            throw new ApiError(400, "Budget already exists for this category and month");
        }

        return budgetRepository.createBudget({ ...data, userId });
    }

    async getBudgets(userId, month, year) {
        if (month && year) {
            return budgetRepository.findByMonthYear(userId, month, year);
        }
        return budgetRepository.findByUserId(userId);
    }

    async getBudgetStatus(userId, month, year) {
        return budgetRepository.getBudgetStatus(userId, month, year);
    }

    async updateBudget(userId, id, data) {
        // Basic ownership check can be added if findById is implemented for Budget
        return budgetRepository.updateBudget(id, data);
    }

    async deleteBudget(userId, id) {
        return budgetRepository.deleteBudget(id);
    }
}
