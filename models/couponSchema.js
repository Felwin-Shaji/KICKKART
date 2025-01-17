const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    discountPercentage: {
        type: Number,
        required: true
    },
    minPurchaseAmount: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    quantity:{
        type: Number,
        required:true,
        default:1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: [], // Ensure it's initialized as an empty array
    },
    

});

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
