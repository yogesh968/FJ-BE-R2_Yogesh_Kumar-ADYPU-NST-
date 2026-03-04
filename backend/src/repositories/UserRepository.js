import prisma from "../config/db.js";

export class UserRepository {
    async createUser(data) {
        return prisma.user.create({ data });
    }

    async findByEmail(email) {
        return prisma.user.findFirst({ where: { email } });
    }

    async findById(id) {
        return prisma.user.findUnique({ where: { id } });
    }

    async updateRefreshToken(userId, refreshToken) {
        return prisma.user.update({
            where: { id: userId },
            data: { refreshToken },
        });
    }

    async updateProfile(userId, data) {
        return prisma.user.update({
            where: { id: userId },
            data,
        });
    }

    async findByGoogleId(googleId) {
        return prisma.user.findFirst({ where: { googleId } });
    }
}
