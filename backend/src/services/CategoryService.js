import { CategoryRepository } from "../repositories/CategoryRepository.js";
import { ApiError } from "../utils/ApiHandler.js";

const categoryRepository = new CategoryRepository();

export class CategoryService {
    async createCategory(userId, data) {
        const existing = await categoryRepository.findByNameAndUserId(data.name, userId);
        if (existing) {
            throw new ApiError(400, "Category already exists");
        }
        return categoryRepository.createCategory({ ...data, userId });
    }

    async getAllCategories(userId) {
        return categoryRepository.findByUserId(userId);
    }

    async updateCategory(userId, id, data) {
        const category = await categoryRepository.findById(id);
        if (!category || category.userId !== userId) {
            throw new ApiError(404, "Category not found");
        }
        return categoryRepository.updateCategory(id, data);
    }

    async deleteCategory(userId, id) {
        const category = await categoryRepository.findById(id);
        if (!category || category.userId !== userId) {
            throw new ApiError(404, "Category not found");
        }
        // Prisma will throw an error if onDelete: Restrict and there are transactions
        try {
            return await categoryRepository.deleteCategory(id);
        } catch (err) {
            if (err.code === "P2003") {
                throw new ApiError(400, "Cannot delete category with existing transactions");
            }
            throw err;
        }
    }
}
