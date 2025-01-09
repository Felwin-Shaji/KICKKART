const mongoose = require('mongoose');
const { Schema } = mongoose;

const variantSchema = new Schema({
    size: {
        type: String,
        required: false,
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
    },
},{_id:false})


const productSchema = new Schema({
    productName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    salePrice: {
        type: Number,
        required: true,
    },
    productImage: {
        type: [String],
        required: true,
    },
    productOffer: {
        type: Number,
        default: 0,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["Available", "Out of Stock", "Discontinued"],
        default: "Available",
        required: true,
    },
    variants :[variantSchema],
}, { timestamps: true });


const Product = mongoose.model("Product", productSchema)
module.exports = Product