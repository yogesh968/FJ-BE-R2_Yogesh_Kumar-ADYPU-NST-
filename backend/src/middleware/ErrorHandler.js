import { ApiError } from "../utils/ApiHandler.js";
import Joi from "joi";

export const errorHandler = (
    err,
    req,
    res,
    next
) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }

    if (Joi.isError(err)) {
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: err.details.map((d) => d.message),
        });
    }

    // Handle Prisma errors
    if (err.code === "P2002") {
        return res.status(400).json({
            success: false,
            message: "Unique constraint failed",
            errors: [err.meta?.target],
        });
    }

    console.error(err);

    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};
