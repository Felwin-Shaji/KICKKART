const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        require: false,
        unique: true,
        sparse: true,
    }
    ,
    password: {
        type: String,
        required: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    wallet: {
        type: {
            balance: { type: Number, default: 0 },
            transactions: {
                type: [
                    {
                        type: {
                            type: String,
                            enum: ["credit", "debit"],
                            required: true,
                        },
                        amount: {
                            type: Number,
                            required: true,
                        },
                        description: {
                            type: String,
                            required: true,
                        },
                        date: {
                            type: Date,
                            default: Date.now,
                        },
                    },
                ],
                default: [],
            },
        },
        default: { balance: 0, transactions: [] },
    },
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: "Wishlist"
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    CreatedOn: {
        type: Date,
        default: Date.now,
    },
    referalCode: {
        type: String
    },
    redeemed: {
        type: Boolean
    },
    redeemedUser: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
        },
        brand: {
            type: String
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]
})

const User = mongoose.model("User", userSchema)
module.exports = User;