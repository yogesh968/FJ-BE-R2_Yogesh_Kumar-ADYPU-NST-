import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/UserRepository.js";
import { ApiError } from "../utils/ApiHandler.js";

const userRepository = new UserRepository();

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new ApiError(401, "No access token provided");
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userRepository.findById(decoded.id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        req.user = user;
        next();
    } catch (error) {
        next(new ApiError(401, "Unauthorized access"));
    }
};
