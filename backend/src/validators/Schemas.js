import Joi from "joi";

export const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().required(),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
    email: Joi.string().email(),
    password: Joi.string().min(6),
    name: Joi.string(),
});

export const categorySchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid("INCOME", "EXPENSE").required(),
});

export const transactionSchema = Joi.object({
    amount: Joi.number().positive().required(),
    date: Joi.date().required(),
    description: Joi.string().allow(""),
    categoryId: Joi.string().required(),
    currency: Joi.string().length(3).uppercase(),
});

export const budgetSchema = Joi.object({
    categoryId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    month: Joi.number().min(1).max(12).required(),
    year: Joi.number().min(2000).required(),
});
