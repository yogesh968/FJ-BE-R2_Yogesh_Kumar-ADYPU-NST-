import { BudgetService } from "../services/BudgetService.js";
import { ApiResponse } from "../utils/ApiHandler.js";

const budgetService = new BudgetService();

export class BudgetController {
    async createBudget(req, res, next) {
        try {
            const result = await budgetService.createBudget(req.user.id, req.body);
            res.status(201).json(new ApiResponse(201, result, "Budget created successfully"));
        } catch (error) {
            next(error);
        }
    }

    async getBudgets(req, res, next) {
        try {
            const month = req.query.month ? parseInt(req.query.month) : undefined;
            const year = req.query.year ? parseInt(req.query.year) : undefined;
            const result = await budgetService.getBudgets(req.user.id, month, year);
            res.status(200).json(new ApiResponse(200, result, "Budgets fetched successfully"));
        } catch (error) {
            next(error);
        }
    }

    async getBudgetStatus(req, res, next) {
        try {
            const month = parseInt(req.query.month);
            const year = parseInt(req.query.year);
            if (isNaN(month) || isNaN(year)) {
                res.status(400).json(new ApiResponse(400, null, "Month and year are required"));
                return;
            }
            const result = await budgetService.getBudgetStatus(req.user.id, month, year);
            res.status(200).json(new ApiResponse(200, result, "Budget status fetched successfully"));
        } catch (error) {
            next(error);
        }
    }

    async updateBudget(req, res, next) {
        try {
            const result = await budgetService.updateBudget(req.user.id, req.params.id, req.body);
            res.status(200).json(new ApiResponse(200, result, "Budget updated successfully"));
        } catch (error) {
            next(error);
        }
    }

    async deleteBudget(req, res, next) {
        try {
            await budgetService.deleteBudget(req.user.id, req.params.id);
            res.status(200).json(new ApiResponse(200, null, "Budget deleted successfully"));
        } catch (error) {
            next(error);
        }
    }
}
