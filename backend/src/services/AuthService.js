import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/UserRepository.js";
import { CategoryRepository } from "../repositories/CategoryRepository.js";
import { ApiError } from "../utils/ApiHandler.js";

const userRepository = new UserRepository();
const categoryRepository = new CategoryRepository();

export class AuthService {
    async register(userData) {
        const { email, password, name } = userData;
        const existingUser = await userRepository.findByEmail(email);

        if (existingUser) {
            throw new ApiError(400, "User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userRepository.createUser({
            email,
            password: hashedPassword,
            name,
        });

        // Seed default categories
        await this.seedDefaultCategories(user.id);

        const accessToken = this.generateAccessToken(user.id);
        const refreshToken = this.generateRefreshToken(user.id);

        await userRepository.updateRefreshToken(user.id, refreshToken);

        return { user: this.sanitizeUser(user), accessToken, refreshToken };
    }

    async login(loginData) {
        const { email, password } = loginData;
        const user = await userRepository.findByEmail(email);

        if (!user || !user.password) {
            throw new ApiError(404, "User not found or using OAuth");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new ApiError(401, "Invalid credentials");
        }

        const accessToken = this.generateAccessToken(user.id);
        const refreshToken = this.generateRefreshToken(user.id);

        await userRepository.updateRefreshToken(user.id, refreshToken);

        // Ensure categories exist (important after database switch)
        const userCats = await categoryRepository.findByUserId(user.id);
        if (userCats.length === 0) {
            await this.seedDefaultCategories(user.id);
        }

        return { user: this.sanitizeUser(user), accessToken, refreshToken };
    }

    async refreshAccessToken(token) {
        let payload;
        try {
            payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        } catch (err) {
            throw new ApiError(401, "Invalid refresh token");
        }

        const user = await userRepository.findById(payload.id);
        if (!user || user.refreshToken !== token) {
            throw new ApiError(401, "Unauthorized access");
        }

        const accessToken = this.generateAccessToken(user.id);
        return { accessToken };
    }

    async logout(userId) {
        return userRepository.updateRefreshToken(userId, null);
    }

    async updateProfile(userId, data) {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
        const updatedUser = await userRepository.updateProfile(userId, data);
        return this.sanitizeUser(updatedUser);
    }

    async updateAvatar(userId, file) {
        const avatarPath = `/uploads/avatars/${file.filename}`;
        const updatedUser = await userRepository.updateProfile(userId, { avatar: avatarPath });
        return this.sanitizeUser(updatedUser);
    }

    generateAccessToken(id) {
        return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    }

    generateRefreshToken(id) {
        return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
    }

    sanitizeUser(user) {
        const { password, refreshToken, ...rest } = user;
        return rest;
    }

    async seedDefaultCategories(userId) {
        const defaults = [
            { name: "Salary", type: "INCOME" },
            { name: "Investment", type: "INCOME" },
            { name: "Rent", type: "EXPENSE" },
            { name: "Groceries", type: "EXPENSE" },
            { name: "Utilities", type: "EXPENSE" },
            { name: "Entertainment", type: "EXPENSE" },
            { name: "Transport", type: "EXPENSE" }
        ];

        for (const cat of defaults) {
            await categoryRepository.createCategory({ ...cat, userId }).catch(() => { });
        }
    }
}
