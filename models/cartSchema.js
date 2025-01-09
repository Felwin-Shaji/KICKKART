const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
    items: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product', 
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            default: 1, 
            min: 1 
        },
        size: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true 
        }
    }],
    totalPrice: {
        type: Number,
        required: true,
        default: 0 
    },
    updatedAt: {
        type: Date,
        default: Date.now 
    }
});


// cartSchema.pre('save', function(next) {
//     this.totalPrice = this.items.reduce((total, item) => {
//         return total + item.quantity * item.price;
//     }, 0);
//     next();
// });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart