const mongoose = require("mongoose");
const env = require('dotenv').config;
const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,//'YOUR_KEY_ID',
    key_secret: process.env.RAZORPAY_SECRET, //'YOUR_KEY_SECRET',
});

const Cart = require("../../models/cartSchema")
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema")
const Order = require("../../models/orderSchema")
const Coupen = require("../../models/couponSchema")

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect("/login");
        }

        const cartData = await Cart.findOne({ user: userId })
            .populate("items.product")
            .lean();

        if (!cartData || cartData.items.length === 0) {
            return res.render("cart", { cart: { items: [], totalPrice: 0 } });
        }

        let hasInsufficientStock = false;
        let errorMessage = null;

        cartData.items = cartData.items.map((item) => {
            const variant = item.product.variants.find((variant) => variant.size === item.size);
            const stockQuantity = variant ? variant.quantity : 0;

            if (item.quantity > stockQuantity || stockQuantity === 0) {
                hasInsufficientStock = true;
            }

            return {
                ...item,
                stockQuantity,
            };
        });

        if (hasInsufficientStock) {
            errorMessage = "One or more products in your cart have insufficient stock. Please remove or reduce the quantity.";
        }

        console.log("Cart Data:", cartData);
        res.render("cart", {
            cart: cartData,
            user: userId,
            errorMessage,
        });
    } catch (error) {
        console.error("Error at getCart:", error);
        res.redirect("/pageNotFound");
    }
};

const cart = async (req, res) => {
    try {
        const { productId, selectedSize, quantity } = req.body;
        const userId = req.session.user;

        let quantities = parseInt(quantity, 10)

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please log in to add items to your cart." });
        }

        console.log("productId :", productId);
        console.log("userId :", userId);
        console.log("selectedSize :", selectedSize);
        console.log("quantity:", quantity);

        // Fetch product details
        const productItems = await Product.findOne({ _id: productId, isBlocked: false });

        if (!productItems) {
            return res.status(404).json({ success: false, message: "Product not found or blocked." });
        }

        console.log("productItems :", productItems);

        // Check if cart exists
        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            // Create a new cart if it doesn't exist
            cart = new Cart({
                user: userId,
                items: [{
                    product: productId,
                    quantity: quantities,
                    size: selectedSize,
                    price: productItems.salePrice * quantities,
                    regularPrice: productItems.regularPrice * quantities
                }],
                totalPrice: productItems.salePrice * quantities,
                totalregularPrice: productItems.regularPrice * quantities
            });
        } else {
            // Check if the product with the selected size already exists in the cart
            const existingProductIndex = cart.items.findIndex(item => item.product.toString() === productId && item.size === selectedSize);

            if (existingProductIndex >= 0) {
                // If the product with the selected size exists, update the quantity and price
                const existingProduct = cart.items[existingProductIndex];
                existingProduct.price = existingProduct.quantity * productItems.salePrice;
                existingProduct.regularPrice = existingProduct.quantity * productItems.regularPrice;
            } else {
                // If it's a new product or size, add it to the cart as a new item
                cart.items.push({
                    product: productId,
                    quantity: quantities,
                    size: selectedSize,
                    price: productItems.salePrice * quantities,
                    regularPrice: productItems.regularPrice * quantities
                });
            }

            // Update total price
            cart.totalPrice = cart.items.reduce((total, item) => total + item.price, 0);
            cart.totalregularPrice = cart.items.reduce((total, item) => total + item.regularPrice, 0);
        }

        // Save cart changes
        await cart.save();

        console.log("Cart updated:", cart);

        return res.status(200).json({
            success: true,
            redirectUrl: "/cart",
            message: "Item added to your cart successfully!",
        });
    } catch (error) {
        console.error("Error adding to cart:", error);
        return res.status(500).json({ success: false, message: "An error occurred while adding the item to the cart." });
    }
};

const cartQuantity = async (req, res) => {
    try {
        const { productId, selectedSize, quantity } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please log in to update cart." });
        }

        const product = await Product.findOne({ _id: productId, isBlocked: false });

        const productData = product.variants.reduce(item => item.size == selectedSize)

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found or blocked." });
        }

        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found." });
        }

        const existingProductIndex = cart.items.findIndex(item => item.product.toString() === productId && item.size === selectedSize);

        if (existingProductIndex >= 0) {

            const existingProduct = cart.items[existingProductIndex];

            // if (quantity > productData.quantity) {
            //     return res.status(400).json({
            //         success: false,
            //         message: `Only ${productData.quantity} items are available in stock.`,
            //     });
            // }

            existingProduct.quantity = quantity;
            existingProduct.price = quantity * product.salePrice;
            existingProduct.regularPrice = quantity * product.regularPrice;
        } else {
            return res.status(404).json({ success: false, message: "Product with the selected size not found in the cart." });
        }



        cart.totalPrice = cart.items.reduce((total, item) => total + item.price, 0);
        cart.totalregularPrice = cart.items.reduce((total, item) => total + item.regularPrice, 0);

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Cart quantity updated successfully!",
            cart: {
                items: cart.items,
                totalPrice: cart.totalPrice,
                totalregularPrice: cart.totalregularPrice
            },
        });


    } catch (error) {
        console.error("Error updating cart quantity:", error);
        return res.status(500).json({ success: false, message: "An error occurred while updating the cart." });
    }
};

const remove = async (req, res) => {
    try {
        const userId = req.session.user; // Assuming you're using authentication
        const productId = req.params.id; // The ID of the product to be removed
        const size = String(req.params.size);

        if (!userId || !productId || !size) {
            return res.status(400).json({
                success: false,
                message: "Invalid request parameters.",
            });
        }

        console.log("Removing product with size:", size);

        // Update the cart by pulling the specific product from the items array
        const updatedCart = await Cart.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { product: productId, size: size } } },
            { new: true } // Return the updated cart
        );

        if (updatedCart) {
            // Recalculate the total prices
            updatedCart.totalPrice = updatedCart.items.reduce((total, item) => total + item.price, 0);
            updatedCart.totalregularPrice = updatedCart.items.reduce((total, item) => total + item.regularPrice, 0);

            // If cart is empty, consider removing it
            if (updatedCart.items.length === 0) {
                await Cart.findByIdAndDelete(updatedCart._id);
                return res.status(200).json({
                    success: true,
                    message: "Item removed and cart cleared.",
                });
            }

            // Save the updated cart
            await updatedCart.save();

            return res.status(200).json({
                success: true,
                message: "Item removed from cart successfully.",
                cart: updatedCart,
            });
        } else {
            return res.status(404).json({
                success: false,
                message: "Cart not found or item not in cart.",
            });
        }
    } catch (error) {
        console.error("Error removing item from cart:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while removing the item.",
        });
    }
};

const applyCoupen = async (req, res) => {
    try {
        const { couponNumber, PriceBrfCoupen } = req.body;

        // Validate required fields
        if (!couponNumber || PriceBrfCoupen === undefined) {
            return res.status(400).json({ message: "Coupon code and price are required." });
        }

        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ message: "User session expired. Please log in again." });
        }

        const coupon = await Coupen.findOne({ code: couponNumber });
        if (!coupon) {
            return res.status(404).json({ message: "Invalid coupon code." });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ message: "This coupon is no longer active." });
        }

        const currentDate = new Date();
        if (currentDate < coupon.startDate || currentDate > coupon.endDate) {
            return res.status(400).json({ message: "This coupon is not valid at the moment." });
        }

        if (coupon.userId.includes(userId)) {
            return res.status(400).json({ message: "You have already used this coupon." });
        }

        if (PriceBrfCoupen < coupon.minPurchaseAmount) {
            return res.status(400).json({
                message: `Minimum purchase amount should be greater than ₹${coupon.minPurchaseAmount}.`,
            });
        }

        // Successful application
        res.status(200).json({
            message: "Coupon applied successfully!",
            discount: coupon.discountPercentage,
            couponNumber
        });
    } catch (error) {
        console.error("Error applying coupon:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
};

const checkout = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log("User ID:", userId);

        if (!userId) {
            return res.redirect("/login");
        }

        const userAddress = await Address.findOne({ userId: userId });
        const addresses = userAddress?.address || [];

        const coupons  = await Coupen.find({})


        console.log("userAddress", userAddress);

        const cart = await Cart.findOne({ user: userId }).populate("items.product")

        //console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqcartcartcartcartcart",cart)


        if (!cart || cart.items.length === 0) {
            return res.redirect("/cart");
        }



        res.render("checkout", {
            userId,
            cart,
            totalPrice: cart.totalPrice,
            totalregularPrice: cart.totalregularPrice,
            userAddress: addresses,
            coupons 
        });

    } catch (error) {
        console.error("Error rendering checkout page:", error.message);
        res.status(500).send("An error occurred while loading the checkout page.");
    }
};

const placeOrder = async (req, res) => {
    const userId = req.session.user;
    try {
        const { selectedAddress, paymentMethod, coupenCode, totalAmount, coupenOffer, totalregularPrice } = req.body;
        console.log("req.body", req.body);

        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: 'Your cart is empty.' });
        }

        const addressDocument = await Address.findOne({ userId, 'address._id': selectedAddress });
        if (!addressDocument) {
            return res.status(400).json({ message: 'Selected address not found' });
        }

        const address = addressDocument.address.find((addr) => addr._id.toString() === selectedAddress);

        const coupen = await Coupen.findOne({ code: coupenCode });
        if (coupen) {
            const today = new Date();

            if (today < coupen.startDate || today > coupen.endDate) {
                return res.status(400).json({ message: 'Coupon is not valid for this date.' });
            }

            if (totalAmount < coupen.minPurchaseAmount) {
                return res.status(400).json({ message: `Minimum purchase amount is ₹${coupen.minPurchaseAmount}.` });
            }

            if (coupen.quantity <= 0) {
                return res.status(400).json({ message: 'Coupon is no longer available.' });
            }

            if (coupen.userId.includes(userId)) {
                return res.status(400).json({ message: 'You have already used this coupon.' });
            }

            coupen.quantity -= 1;
            coupen.userId.push(userId);
            await coupen.save();
        }

        const validPaymentMethods = ["COD", "Online", "Wallet"];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        for (const item of cart.items) {
            const product = await Product.findOne(
                { _id: item.product._id, "variants.size": item.size },
                { "variants.$": 1 }
            );

            if (!product || product.variants[0].quantity < item.quantity) {
                throw new Error(
                    `Insufficient stock for product "${item.product.productName}" (size: ${item.size}).`
                );
            }
        }

        const orderData = {
            userId,
            items: cart.items.map((item) => ({
                productId: item.product._id,
                quantity: item.quantity,
                size: item.size,
                price: item.price,
                regularPrice: item.regularPrice
            })),
            shippingAddress: address,
            paymentMethod,
            coupenOffer: coupenOffer,
            totalAmount: totalAmount,
            totalregularPrice: totalregularPrice
        };

        const order = await Order.create(orderData);

        const variantData = order.items.map((item) => ({
            quantity: item.quantity,
            size: item.size,
            id: item.productId,
        }));

        const updatePromises = variantData.map((variant) =>
            Product.updateOne(
                { _id: variant.id, "variants.size": variant.size },
                { $inc: { "variants.$.quantity": -variant.quantity } }
            )
        );

        await Promise.all(updatePromises);

        await Cart.findByIdAndDelete(cart._id);

        res.redirect("/order-success");
    } catch (error) {
        console.error('Error placing order:', error);

        res.status(500).json({
            message: 'An error occurred while placing your order. Please try again.',
            error: error.message,
        });
    }
};

const razorpayCreatOrder = async (req, res) => {
    const { amount, currency } = req.body;

    try {
        const order = await razorpayInstance.orders.create({
            amount: amount * 100, // Convert amount to paise
            currency: currency || "INR",
            receipt: `receipt_${Date.now()}`,
        });

        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: "Unable to create Razorpay order" });
    }
}

const varifyPayment = async (req, res) => {

    const userId = req.session.user;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, data } = req.body;

    console.log("req.body", req.body);

    const key_secret = process.env.RAZORPAY_SECRET;
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
        try {


            const { selectedAddress, paymentMethod, coupenCode, totalAmount, coupenOffer, totalregularPrice } = data;
            const cart = await Cart.findOne({ user: userId }).populate('items.product');


            if (!cart || !cart.items || cart.items.length === 0) {
                return res.status(400).json({ message: 'Your cart is empty.' });
            }

            const addressDocument = await Address.findOne({ userId, 'address._id': selectedAddress });
            if (!addressDocument) {
                return res.status(400).json({ message: 'Selected address not found' });
            }

            const address = addressDocument.address.find(
                (addr) => addr._id.toString() === selectedAddress
            );

            const coupen = await Coupen.findOne({ code: coupenCode });


            if (coupen) {
                const today = new Date();

                // Validate coupon dates
                if (today < coupen.startDate || today > coupen.endDate) {
                    return res.status(400).json({ message: 'Coupon is not valid for this date.' });
                }

                // Validate minimum purchase amount
                if (totalAmount < coupen.minPurchaseAmount) {
                    return res.status(400).json({ message: `Minimum purchase amount is ₹${coupen.minPurchaseAmount}.` });
                }

                // Validate coupon quantity
                if (coupen.quantity <= 0) {
                    return res.status(400).json({ message: 'Coupon is no longer available.' });
                }

                // Check if user has already used the coupon
                if (coupen.userId.includes(userId)) {
                    return res.status(400).json({ message: 'You have already used this coupon.' });
                }

                // Update coupon: reduce quantity and add userId
                coupen.quantity -= 1;
                coupen.userId.push(userId);
                await coupen.save();
            }

            const validPaymentMethods = ["COD", "Online", 'Wallet'];

            console.log("")
            if (!validPaymentMethods.includes(paymentMethod)) {
                return res.status(400).json({ message: 'Invalid payment method' });
            }

            for (const item of cart.items) {
                const product = await Product.findOne(
                    { _id: item.product._id, "variants.size": item.size },
                    { "variants.$": 1 }
                );

                if (!product || product.variants[0].quantity < item.quantity) {
                    throw new Error(
                        `Insufficient stock for product "${item.product.productName}" (size: ${item.size}).`
                    );
                }
            }

            const orderData = {
                userId,
                items: cart.items.map((item) => ({
                    productId: item.product._id,
                    quantity: item.quantity,
                    size: item.size,
                    price: item.price,
                    regularPrice: item.regularPrice
                })),
                shippingAddress: address,
                paymentMethod,
                coupenOffer: coupenOffer,
                totalAmount: totalAmount,
                totalregularPrice: totalregularPrice
            };


            const order = await Order.create(orderData);


            const variantData = order.items.map((item) => ({
                quantity: item.quantity,
                size: item.size,
                id: item.productId,
            }));

            const updatePromises = variantData.map((variant) =>
                Product.updateOne(
                    { _id: variant.id, "variants.size": variant.size },
                    { $inc: { "variants.$.quantity": -variant.quantity } }
                )
            );

            await Promise.all(updatePromises);


            await Cart.findByIdAndDelete(cart._id);

            // Respond with success
            res.status(200).json({ success: true, message: "Payment verified and order placed", order });
        } catch (error) {
            console.error("Error saving order:", error);
            res.status(500).json({ success: false, message: "Failed to save order", error: error.message });
        }
    } else {
        res.status(400).json({ success: false, message: "Payment verification failed" });
    }
};

const walletOrderPayment = async (req, res) => {
    try {
        const userId = req.session.user;
        const { selectedAddress, paymentMethod, coupenCode, totalAmount, coupenOffer, totalregularPrice } = req.body;
        console.log("req.body", req.body);

        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: 'Your cart is empty.' });
        }

        const addressDocument = await Address.findOne({ userId, 'address._id': selectedAddress });
        if (!addressDocument) {
            return res.status(400).json({ message: 'Selected address not found' });
        }

        const address = addressDocument.address.find((addr) => addr._id.toString() === selectedAddress);

        const coupen = await Coupen.findOne({ code: coupenCode });
        if (coupen) {
            const today = new Date();

            if (today < coupen.startDate || today > coupen.endDate) {
                return res.status(400).json({ message: 'Coupon is not valid for this date.' });
            }

            if (totalAmount < coupen.minPurchaseAmount) {
                return res.status(400).json({ message: `Minimum purchase amount is ₹${coupen.minPurchaseAmount}.` });
            }

            if (coupen.quantity <= 0) {
                return res.status(400).json({ message: 'Coupon is no longer available.' });
            }

            if (coupen.userId.includes(userId)) {
                return res.status(400).json({ message: 'You have already used this coupon.' });
            }

            coupen.quantity -= 1;
            coupen.userId.push(userId);
            await coupen.save();
        }
        
        console.log("paymentMethodpaymentMethod",paymentMethod);
        console.log("useruseruseruseruseruseruseruseruseruser")
        if (paymentMethod === "Wallet") {
            console.log("useruseruseruseruseruseruseruseruseruser")
            const user = await User.findById(userId);
            console.log("user",user)
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (user.wallet.balance < totalAmount) {
                return res.status(400).json({ message: 'Insufficient wallet balance. Please use another payment method.' });
            }

            // Deduct the amount from the user's wallet
            user.wallet.balance -= totalAmount;
            user.wallet.transactions.push({
                type: "debit",
                amount: totalAmount,
                description: "Order payment",
            });
            await user.save();
        }

        const validPaymentMethods = ["COD", "Online", "Wallet"];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        for (const item of cart.items) {
            const product = await Product.findOne(
                { _id: item.product._id, "variants.size": item.size },
                { "variants.$": 1 }
            );

            if (!product || product.variants[0].quantity < item.quantity) {
                throw new Error(
                    `Insufficient stock for product "${item.product.productName}" (size: ${item.size}).`
                );
            }
        }

        const orderData = {
            userId,
            items: cart.items.map((item) => ({
                productId: item.product._id,
                quantity: item.quantity,
                size: item.size,
                price: item.price,
                regularPrice: item.regularPrice
            })),
            shippingAddress: address,
            paymentMethod,
            coupenOffer: coupenOffer,
            totalAmount: totalAmount,
            totalregularPrice: totalregularPrice
        };

        const order = await Order.create(orderData);

        const variantData = order.items.map((item) => ({
            quantity: item.quantity,
            size: item.size,
            id: item.productId,
        }));

        const updatePromises = variantData.map((variant) =>
            Product.updateOne(
                { _id: variant.id, "variants.size": variant.size },
                { $inc: { "variants.$.quantity": -variant.quantity } }
            )
        );

        await Promise.all(updatePromises);

        await Cart.findByIdAndDelete(cart._id);

        res.redirect("/order-success");
    } catch (error) {
        console.error('Error waller  order:', error);

        res.status(500).json({
            message: 'An error occurred while placing your order. Please try again.',
            error: error.message,
        });
    }
};


const getOrderSuccessPage = async (req, res) => {
    res.render("order-complete-page")
}

const viewOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Fetch the full order with all items and product details
        const order = await Order.findById(orderId)
            .sort({ createdAt: -1 })
            .populate("items.productId", "productName productImage salePrice")
            .lean();

        if (!order) {
            return res.status(404).send("Order not found.");
        }

        console.log("Order Details:", order);

        // Render the order details page with the full order details
        res.render("orderDetailsPage", { order });
    } catch (error) {
        console.error("Error fetching order details:", error.message);
        res.status(500).send("An error occurred while fetching order details.");
    }
};

// const cancelOrderAllCart = async (req, res) => {
//     try {
//         const orderId = req.params.id;

//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({ error: "Order not found" });
//         }

//         if (order.status === "Cancelled") {
//             return res.status(400).json({ error: "Order is already cancelled" });
//         }

//         await Order.findByIdAndUpdate(orderId, { status: "Cancelled" }, { new: true });

//         for (const item of order.items) {
//             const productId = item.productId;
//             const size = item.size;
//             const quantityToAdd = item.quantity;

//             await Product.updateOne(
//                 { _id: productId, "variants.size": size },
//                 { $inc: { "variants.$.quantity": quantityToAdd } }
//             );
//         }

//         res.status(200).json("Order cancelled successfully, and inventory updated.");
//     } catch (error) {
//         console.error("Error at cancelOrder:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// };

const cancelSingleItem = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;
        const productId = req.params.productId;

        const orderedItem = await Order.findOne(
            { _id: orderId, userId: userId, "items.productId": productId },
            { "items.$": 1, paymentMethod: 1, coupenOffer: 1, totalAmount: 1, totalregularPrice: 1, isCouponAdjusted: 1 }
        ).lean();

        if (!orderedItem || !orderedItem.items || orderedItem.items.length === 0) {
            return res.status(404).json({ message: "Order or product not found." });
        }

        const item = orderedItem.items[0];
        const { paymentMethod, coupenOffer, totalAmount, totalregularPrice, isCouponAdjusted } = orderedItem;

        if (coupenOffer > 0 && item.price < coupenOffer) {
            return res.status(400).json({
                message: "Item cannot be cancelled as its price is less than the coupon offer."
            });
        }

        const result = await Order.updateOne(
            { _id: orderId, "items.productId": productId },
            { $set: { "items.$.status": "Cancelled" } }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ message: "Failed to cancel the item." });
        }

        if (paymentMethod === "Online" || paymentMethod === "Wallet") {
            let refundAmount = item.price;

            if (!isCouponAdjusted && coupenOffer > 0) {
                refundAmount -= coupenOffer; // Deduct coupon amount only once
                await Order.updateOne({ _id: orderId }, { $set: { isCouponAdjusted: true } });
            }

            await User.updateOne(
                { _id: userId },
                {
                    $inc: { "wallet.balance": refundAmount },
                    $push: {
                        "wallet.transactions": {
                            type: "credit",
                            amount: refundAmount,
                            description: `Refund for cancelled item (Order ID: ${orderId})`,
                            date: new Date()
                        }
                    }
                }
            );

            return res.status(200).json({ message: "Item cancelled and refund processed successfully." });
        }

        if (paymentMethod === "COD") {
            return res.status(200).json({ message: "Item cancelled successfully." });
        }

    } catch (error) {
        console.error("Error cancelling item:", error.message);
        res.status(500).json({ message: "An error occurred while cancelling the item." });
    }
};


const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate("items.productId");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const doc = new PDFDocument({ margin: 10 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="invoice_${orderId}.pdf"`);        

        doc.pipe(res);

        // *Colors and Styling*
        const primaryColor = "#007BFF"; // Blue
        const textColor = "#343A40"; // Dark Gray
        const statusColors = {
            Pending: "#FFC107",
            Shipped: "#17A2B8",
            Delivered: "#28A745",
            Cancelled: "#DC3545",
            Returned: "#6C757D",
        };

        // *Header Background*
        doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
        doc.fillColor("#FFFFFF").fontSize(24).font("Helvetica-Bold").text("INVOICE", 50, 30);

        // *Order Details*
        doc.fillColor(textColor).fontSize(12).moveDown(2);
        doc.text(`Order ID: ${order._id}`, 10).moveDown(0.2);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`).moveDown(0.2);
        doc.text(`Payment Method: ${order.paymentMethod}`).moveDown();

        // *Billing Address*
        const billingAddress = order.shippingAddress || {};
        doc.fillColor("#28A745").fontSize(14).text("Billing Address:", { underline: true }).moveDown(0.5);
        doc.fillColor(textColor).fontSize(12);
        doc.text(`Name: ${billingAddress.name || "N/A"}`);
        doc.text(`City: ${billingAddress.city || "N/A"}`);
        doc.text(`State: ${billingAddress.state || "N/A"}`);
        doc.text(`Pincode: ${billingAddress.pincode || "N/A"}`);
        doc.text(`Phone: ${billingAddress.phone || "N/A"}`).moveDown();

        // *Table Headers*
        doc.fillColor("#28A745").fontSize(14).text("Order Items:", { underline: true }).moveDown(0.5);

        const colX = { no: 30, name: 90, price: 250, qty: 320, total: 400, status: 500 };
        const rowHeight = 25;

        // *Header Row Styling*
        doc.fillColor("#FFFFFF").rect(20, doc.y - 5, 570, rowHeight).fill(primaryColor);
        doc.fillColor("#FFFFFF").fontSize(12).font("Helvetica-Bold");

        // *Column Headers*
        const headerY = doc.y + 5;
        doc.text("No", colX.no, headerY, { width: 30, align: "center" });
        doc.text("Product Name", colX.name, headerY, { width: 160, align: "left" });
        doc.text("Price", colX.price, headerY, { width: 50, align: "right" });
        doc.text("Qty", colX.qty, headerY, { width: 30, align: "center" });
        doc.text("Total", colX.total, headerY, { width: 70, align: "right" });
        doc.text("Status", colX.status, headerY, { width: 70, align: "center" });

        doc.moveDown(1);
        doc.fillColor(textColor).font("Helvetica");
        let positionY = doc.y;

        let totalRefundAmount = 0;

        // *Order Items Processing*
        order.items.forEach((item, index) => {
            const bgColor = index % 2 === 0 ? "#F8F9FA" : "#E9ECEF";
            doc.rect(20, positionY - 5, 570, 20).fill(bgColor);
            doc.fillColor(textColor).fontSize(12);

            doc.text(`${index + 1}`, colX.no, positionY, { width: 30, align: "center" });
            doc.text(item.productId?.name || "Unknown Product", colX.name, positionY);
            doc.text(`Rs ${item.productId?.salePrice}`, colX.price, positionY, { width: 50, align: "right" });
            doc.text(`${item.quantity}`, colX.qty, positionY, { width: 30, align: "center" });
            doc.text(`Rs ${item.price}`, colX.total, positionY, { width: 70, align: "right" });

            // *Order Status with Color*
            const statusColor = statusColors[item.status] || "#000000";
            doc.fillColor(statusColor).text(item.status, colX.status, positionY, { width: 70, align: "center" });
            doc.fillColor(textColor); // Reset color

            // *Refund Calculation*
            if (["Cancelled", "Returned"].includes(item.status)) {
                totalRefundAmount += item.price;
            }

            positionY += 20;
        });



        // *Adjust Refund for Coupon*
        if (order.coupenOffer > 0) {
            totalRefundAmount = Math.max(0, totalRefundAmount - order.coupenOffer);
        }

        // *Total Amount - Left Aligned*
        doc.moveDown(1);
        doc.fillColor("#6C757D").lineWidth(1).moveTo(20, doc.y).lineTo(590, doc.y).stroke();
        doc.moveDown(1.5);
        doc.fillColor("#000000").fontSize(14).font("Helvetica-Bold");

        doc.text(`Subtotal: Rs ${order.totalregularPrice}`, 20, doc.y);
        doc.text(`Discount: Rs ${order.coupenOffer || 0}`, 20, doc.y);
        doc.text(`Grand Total: Rs ${order.totalAmount}`, 20, doc.y);

        if (totalRefundAmount > 0) {
            doc.text(`Total Refund: Rs ${totalRefundAmount}`, 20, doc.y);
        }

        // *Footer*
        doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Oblique").text("Thank you for shopping with us!", { align: "center" });

        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const returnOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;
        const productId = req.params.productId;

        const orderedItem = await Order.findOne(
            { _id: orderId, userId: userId, "items.productId": productId },
            { "items.$": 1, paymentMethod: 1, coupenOffer: 1, totalAmount: 1, totalregularPrice: 1 }
        ).lean();

        if (!orderedItem || !orderedItem.items || orderedItem.items.length === 0) {
            return res.status(404).json({ message: "Order or product not found." });
        }

        const item = orderedItem.items[0];
        if (item.status !== "Delivered") {
            return res.status(400).json({ message: "Only delivered items can be returned." });
        }        
            const refundAmount = item.price * item.quantity;

            const result = await Order.updateOne(
                { _id: orderId, "items.productId": productId },
                { $set: { "items.$.status": "Returned" } }
            );

            if (result.nModified === 0) {
                return res.status(400).json({ message: "Failed to return the item." });
            }

            const user = await User.findById(userId);
            if (!user.wallet || typeof user.wallet !== "object") {
                user.wallet = { balance: 0, transactions: [] };
                await user.save();
            }

            await User.updateOne(
                { _id: userId },
                {
                    $inc: { "wallet.balance": refundAmount },
                    $push: {
                        "wallet.transactions": {
                            type: "credit",
                            amount: refundAmount,
                            description: `Refund for returned item (Order ID: ${orderId})`,
                            date: new Date(),
                        },
                    },
                }
            );

            return res.status(200).json({ message: "Item returned and refund processed successfully." });

    } catch (error) {
        console.error("Error returning item:", error.message);
        res.status(500).json({ message: "An error occurred while processing the return." });
    }
};

const razorpayCreatWallet = async (req, res) => {
    try {
        const { amount } = req.body;

        const options = {
            amount: amount * 100,  // Amount in paise
            currency: 'INR',
            receipt: crypto.randomBytes(10).toString('hex'),
            payment_capture: 1
        };

        razorpayInstance.orders.create(options, (err, order) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Failed to create order" });
            }
            res.json({
                success: true,
                order_id: order.id,
                amount: amount,
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error creating Razorpay order." });
    }
}

const razorpayvarifyWallet = async (req, res) => {
    try {
        const { payment_id, order_id, amount, razorpay_signature } = req.body;

        console.log("amount", amount);

        const data = {
            razorpay_order_id: order_id,
            razorpay_payment_id: payment_id,
        };

        const secret = process.env.RAZORPAY_SECRET;
        const generated_signature = crypto.createHmac('sha256', secret)
            .update(order_id + "|" + payment_id)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            const userId = req.session.user;
            console.log("userIduserId", userId);

            const user = await User.findById(userId);
            console.log("User fetched from DB:", user);

            if (!user) {
                console.error("User not found for ID:", userId);
                return res.status(404).json({ success: false, message: "User not found" });
            }

            await User.updateOne(
                { _id: userId },
                {
                    $inc: { "wallet.balance": amount },
                    $push: {
                        "wallet.transactions": {
                            type: "credit",
                            amount: amount,
                            description: `Added money via Razorpay )`,
                            date: new Date()
                        }
                    }
                }
            );

            res.json({ success: true, message: "Money added to wallet" });
        } else {
            res.status(400).json({ success: false, message: "Invalid payment signature" });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ success: false, message: "An error occurred during verification." });
    }
};

module.exports = {
    getCart,
    cart,
    remove,
    cartQuantity,
    checkout,
    applyCoupen,
    placeOrder,
    getOrderSuccessPage,
    viewOrderDetails,
    cancelSingleItem,
    returnOrder,
    razorpayCreatOrder,
    varifyPayment,
    razorpayCreatWallet,
    razorpayvarifyWallet,
    walletOrderPayment,
    downloadInvoice
}