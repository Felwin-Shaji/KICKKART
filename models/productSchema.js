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
}, { _id: false });

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
        required: false,
    },
    productImage: {
        type: [String],
        required: true,
    },
    productOffer: {
        type: Number,
        default: 0,
    },
    isOfferActive: {
        type: Number,
        default: 0,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    variants: [variantSchema],
}, { timestamps: true });


productSchema.pre('save', function (next) {
    if (this.isOfferActive) {
        this.salePrice = this.regularPrice - (this.regularPrice * this.isOfferActive / 100);
    } else {
        this.salePrice = this.regularPrice; 
    }
    next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
