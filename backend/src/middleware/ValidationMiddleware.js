import { ApiError } from "../utils/ApiHandler.js";

export const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map((details) => details.message).join(", ");
            throw new ApiError(400, errorMessage);
        }
        next();
    };
};
