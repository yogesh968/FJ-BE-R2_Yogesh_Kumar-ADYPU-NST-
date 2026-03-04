import { TransactionService } from "../services/TransactionService.js";
import { ApiResponse } from "../utils/ApiHandler.js";

const transactionService = new TransactionService();

export class TransactionController {
    async addTransaction(req, res, next) {
        try {
            const data = {
                ...req.body,
                amount: parseFloat(req.body.amount || 0)
            };
            const result = await transactionService.addTransaction(req.user.id, data, req.file);
            res.status(201).json(new ApiResponse(201, result, "Transaction added successfully"));
        } catch (error) {
            next(error);
        }
    }

    async getAllTransactions(req, res, next) {
        try {
            const filters = req.query;
            const result = await transactionService.getAllTransactions(req.user.id, filters);
            res.status(200).json(new ApiResponse(200, result, "Transactions fetched successfully"));
        } catch (error) {
            next(error);
        }
    }

    async updateTransaction(req, res, next) {
        try {
            const result = await transactionService.updateTransaction(req.user.id, req.params.id, req.body);
            res.status(200).json(new ApiResponse(200, result, "Transaction updated successfully"));
        } catch (error) {
            next(error);
        }
    }

    async deleteTransaction(req, res, next) {
        try {
            await transactionService.deleteTransaction(req.user.id, req.params.id);
            res.status(200).json(new ApiResponse(200, null, "Transaction deleted successfully"));
        } catch (error) {
            next(error);
        }
    }

    async getDashboard(req, res, next) {
        try {
            const result = await transactionService.getDashboard(req.user.id);
            res.status(200).json(new ApiResponse(200, result, "Dashboard meta fetched successfully"));
        } catch (error) {
            next(error);
        }
    }
}
