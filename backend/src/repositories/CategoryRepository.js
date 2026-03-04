import prisma from "../config/db.js";

export class CategoryRepository {
    async createCategory(data) {
        return prisma.category.create({ data });
    }

    async findByUserId(userId) {
        return prisma.category.findMany({ where: { userId } });
    }

    async findById(id) {
        return prisma.category.findUnique({ where: { id } });
    }

    async updateCategory(id, data) {
        return prisma.category.update({
            where: { id },
            data,
        });
    }

    async deleteCategory(id) {
        return prisma.category.delete({ where: { id } });
    }

    async findByNameAndUserId(name, userId) {
        return prisma.category.findUnique({
            where: {
                name_userId: { name, userId },
            },
        });
    }
}
