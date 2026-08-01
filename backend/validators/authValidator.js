const Joi = require("joi");

const tenYearsAgo = new Date();
tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name cannot exceed 50 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email",
    "any.required": "Email is required",
  }),
  password: Joi.string()
    .min(6)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters",
      "string.max": "Password cannot exceed 100 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      "any.required": "Password is required",
    }),

  phone: Joi.string()
    .pattern(/^(97|98)\d{8}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone must be a valid Nepal number",
      "any.required": "Phone number is required",
    }),

  gender: Joi.string()
    .valid("male", "female", "other", "prefer_not")
    .required()
    .messages({
      "any.only": "Gender must be male, female, other or prefer_not",
      "any.required": "Gender is required",
    }),

  dob: Joi.date().max(tenYearsAgo).min("1900-01-01").required().messages({
    "date.max": "You must be at least 10 years old to register",
    "date.min": "Please enter a valid date of birth",
    "date.base": "Please enter a valid date of birth",
    "any.required": "Date of birth is required",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

module.exports = { registerSchema, loginSchema };
