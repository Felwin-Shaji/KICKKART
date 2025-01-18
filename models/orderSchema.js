const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    items: [
        {
            productId: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: "Product", 
                required: true 
            },
            quantity: {
                 type: Number, 
                 required: true 
                },
            price: { 
                type: Number, 
                required: true 
            },
            regularPrice: { 
                type: Number, 
                required: true 
            },
            size:{
                 type: Number, 
                 required: true 
                },
            status: {
                type: String,
                enum: ["Pending", "Shipped", "Delivered", "Cancelled","Returned"],
                default: "Pending", // Default status for each product
            },
        },
    ],
    shippingAddress: {
        addressType:String,
        name: String,
        city: String,
        landMark:String,
        state:String,
        pincode: String,
        phone: String,
        altPhone:String,
    },
    paymentMethod: {
        type: String,
        enum: ["COD", "Online"],
        required: true,
    },
    coupenOffer:{
        type:Number,
        required:false
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    totalregularPrice:{
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Order = mongoose.model("Order", orderSchema)
module.exports =  Order;
