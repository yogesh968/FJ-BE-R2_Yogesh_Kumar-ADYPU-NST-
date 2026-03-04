import { CategoryService } from "../services/CategoryService.js";
import { ApiResponse } from "../utils/ApiHandler.js";

const categoryService = new CategoryService();

export class CategoryController {
    async createCategory(req, res, next) {
        try {
            const result = await categoryService.createCategory(req.user.id, req.body);
            res.status(201).json(new ApiResponse(201, result, "Category created successfully"));
        } catch (error) {
            next(error);
        }
    }

    async getAllCategories(req, res, next) {
        try {
            const result = await categoryService.getAllCategories(req.user.id);
            res.status(200).json(new ApiResponse(200, result, "Categories fetched successfully"));
        } catch (error) {
            next(error);
        }
    }

    async updateCategory(req, res, next) {
        try {
            const result = await categoryService.updateCategory(req.user.id, req.params.id, req.body);
            res.status(200).json(new ApiResponse(200, result, "Category updated successfully"));
        } catch (error) {
            next(error);
        }
    }

    async deleteCategory(req, res, next) {
        try {
            await categoryService.deleteCategory(req.user.id, req.params.id);
            res.status(200).json(new ApiResponse(200, null, "Category deleted successfully"));
        } catch (error) {
            next(error);
        }
    }
}
