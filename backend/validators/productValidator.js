const Joi = require("joi");

const productSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Product name must be at least 2 characters",
    "any.required": "Product name is required",
  }),
  description: Joi.string().min(10).required().messages({
    "string.min": "Description must be at least 10 characters",
    "any.required": "Description is required",
  }),
  price: Joi.number().min(1).max(500000).required().messages({
    "number.min": "Price must be at least Rs 1",
    "number.max": "Price cannot exceed Rs 5,00,000",
    "any.required": "Price is required",
  }),
  discount: Joi.number().min(0).max(100).optional().messages({
    "number.min": "Discount cannot be negative",
    "number.max": "Discount cannot exceed 100%",
  }),
  // category: Joi.string()
  //   .valid("Electronics", "Clothing", "Books", "Beauty", "Sports")
  //   .optional()
  //   .messages({
  //     "any.only":
  //       "Category must be one of Electronics, Clothing, Books, Beauty, Sports",
  //   }),
  //   stock: Joi.number().min(0).max(50).required().messages({
  //     "number.min": "Stock cannot be negative",
  //     "number.max": "Stock cannot exceed 50",
  //     "any.required": "Stock is required",
  //   }),
}).unknown(true);

module.exports = { productSchema };
