import { AuthService } from "../services/AuthService.js";
import { ApiResponse, ApiError } from "../utils/ApiHandler.js";

const authService = new AuthService();

export class AuthController {
    async register(req, res, next) {
        try {
            const result = await authService.register(req.body);
            res.status(201).json(new ApiResponse(201, result, "User registered successfully"));
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        console.log(req.body);
        try {
            const result = await authService.login(req.body);
            res.status(200).json(new ApiResponse(200, result, "User logged in successfully"));
        } catch (error) {
            next(error);
        }
    }

    async refreshAccessToken(req, res, next) {
        try {
            const result = await authService.refreshAccessToken(req.body.refreshToken);
            res.status(200).json(new ApiResponse(200, result, "Token refreshed successfully"));
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            await authService.logout(req.user.id);
            res.status(200).json(new ApiResponse(200, null, "User logged out successfully"));
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req, res, next) {
        try {
            const result = await authService.updateProfile(req.user.id, req.body);
            res.status(200).json(new ApiResponse(200, result, "Profile updated successfully"));
        } catch (error) {
            next(error);
        }
    }

    async updateAvatar(req, res, next) {
        try {
            if (!req.file) throw new ApiError(400, "Please upload an image file");
            const result = await authService.updateAvatar(req.user.id, req.file);
            res.status(200).json(new ApiResponse(200, result, "Avatar updated successfully"));
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req, res, next) {
        try {
            const sanitizedUser = authService.sanitizeUser(req.user);
            res.status(200).json(new ApiResponse(200, sanitizedUser, "Profile fetched successfully"));
        } catch (error) {
            next(error);
        }
    }
}
