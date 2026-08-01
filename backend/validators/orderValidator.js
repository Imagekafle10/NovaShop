const Joi = require("joi");

const orderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required().messages({
          "any.required": "Product ID is required for each item",
        }),
        qty: Joi.number().min(1).required().messages({
          "number.min": "Quantity must be at least 1",
          "any.required": "Quantity is required",
        }),
        price: Joi.number().min(1).required().messages({
          "any.required": "Price is required for each item",
        }),
      }).unknown(true), // ← allows name, imageUrl, _id etc from cart
    )
    .min(1)
    .required()
    .messages({
      "array.min": "Order must have at least one item",
      "any.required": "Items are required",
    }),
  totalAmount: Joi.number().min(1).required().messages({
    "any.required": "Total amount is required",
  }),
  address: Joi.object({
    fullName: Joi.string()
      .required()
      .messages({ "any.required": "Full name is required" }),
    street: Joi.string()
      .required()
      .messages({ "any.required": "Street is required" }),
    city: Joi.string()
      .required()
      .messages({ "any.required": "City is required" }),
    // postalCode: Joi.string()
    //   .required()
    //   .messages({ "any.required": "Postal code is required" }),
    // country: Joi.string()
    //   .required()
    //   .messages({ "any.required": "Country is required" }),
  })
    .unknown(true)
    .required()
    .messages({ "any.required": "Address is required" }),
  paymentId: Joi.string().required().messages({
    "any.required": "Payment ID is required",
  }),
}).unknown(true);

module.exports = { orderSchema };
