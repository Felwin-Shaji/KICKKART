const mongoose = require("mongoose");

const Cart = require("../../models/cartSchema")
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema")
const Order = require("../../models/orderSchema")

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect("/login"); // Redirect if user is not logged in
        }

        const cartData = await Cart.findOne({ user: userId })
            .populate("items.product") // Populate product details in items
            .lean();

        console.log('cartData:', cartData);


        if (!cartData || cartData.items.length === 0) {
            return res.render("cart", { cart: { items: [], totalPrice: 0 } });
        }

        res.render("cart", { cart: cartData, user: userId });
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
                }],
                totalPrice: productItems.salePrice * quantities,
            });
        } else {
            // Check if the product with the selected size already exists in the cart
            const existingProductIndex = cart.items.findIndex(item => item.product.toString() === productId && item.size === selectedSize);

            if (existingProductIndex >= 0) {
                // If the product with the selected size exists, update the quantity and price
                const existingProduct = cart.items[existingProductIndex];
                existingProduct.price = existingProduct.quantity * productItems.salePrice;
            } else {
                // If it's a new product or size, add it to the cart as a new item
                cart.items.push({
                    product: productId,
                    quantity: quantities,
                    size: selectedSize,
                    price: productItems.salePrice * quantities,
                });
            }

            // Update total price
            cart.totalPrice = cart.items.reduce((total, item) => total + item.price, 0);
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
        const userId = req.session.user;  // Get the user ID from the session

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please log in to update cart." });
        }

        // Fetch product details
        const product = await Product.findOne({ _id: productId, isBlocked: false });

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found or blocked." });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found." });
        }

        // Find the product in the cart with the same size
        const existingProductIndex = cart.items.findIndex(item => item.product.toString() === productId && item.size === selectedSize);

        if (existingProductIndex >= 0) {
            // If the product exists in the cart, update its quantity and price
            const existingProduct = cart.items[existingProductIndex];
            existingProduct.quantity = quantity; // Update quantity
            existingProduct.price = quantity * product.salePrice; // Recalculate price
        } else {
            return res.status(404).json({ success: false, message: "Product with the selected size not found in the cart." });
        }

        // Update total price of the cart
        cart.totalPrice = cart.items.reduce((total, item) => total + item.price, 0);

        // Save the updated cart
        await cart.save();

        // Send a success response
        return res.status(200).json({
            success: true,
            message: "Cart quantity updated successfully!",
            cart,
        });

    } catch (error) {
        console.error("Error updating cart quantity:", error);
        return res.status(500).json({ success: false, message: "An error occurred while updating the cart." });
    }
};

const remove = async (req, res) => {
    try {
        const userId = req.session.user; // Assuming you're using authentication to get the logged-in user
        const productId = req.params.id; // The ID of the product to be removed
        const size = String(req.params.size);

        console.log("productSize", size);


        // Update the cart by pulling the specific product from the items array
        const updatedCart = await Cart.findOneAndUpdate(
            { user: userId }, // Find the cart for the logged-in user
            { $pull: { items: { product: productId, size: size } } }, // Match both product ID and size
            { new: true } // Return the updated cart
        );

        console.log("updatedCart", updatedCart)

        if (updatedCart) {
            // Recalculate the total price
            updatedCart.totalPrice = updatedCart.items.reduce((total, item) => {
                return total + item.quantity * item.price;
            }, 0);

            // Save the updated cart
            await updatedCart.save();

            res.status(200).json({
                success: true,
                message: "Item removed from cart successfully.",
                cart: updatedCart,
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Cart not found or item not in cart.",
            });
        }
    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while removing the item.",
        });
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
        const addresses = userAddress?.address || []; // Use optional chaining and default to an empty array


        console.log("userAddress", userAddress);

        const cart = await Cart.findOne({ user: userId }).populate("items.product");

        console.log("Cart Data:", JSON.stringify(cart, null, 2));

        if (!cart || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        res.render("checkout", {
            userId,
            cart,
            totalPrice: cart.totalPrice,
            userAddress: addresses, // Rename addresses to userAddress
        });

    } catch (error) {
        console.error("Error rendering checkout page:", error.message);
        res.status(500).send("An error occurred while loading the checkout page.");
    }
};


const placeOrder = async (req, res) => {
    try {
        const { selectedAddress, paymentMethod, terms } = req.body;
        const userId = req.session.user;

        // Validate the cart
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: 'Your cart is empty.' });
        }

        // Validate the selected address
        const addressDocument = await Address.findOne({ userId, 'address._id': selectedAddress });
        if (!addressDocument) {
            return res.status(400).json({ message: 'Selected address not found' });
        }
        const address = addressDocument.address.find(
            (addr) => addr._id.toString() === selectedAddress
        );

        // Validate payment method
        const validPaymentMethods = ["COD", "Online"];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        // Validate terms agreement
        if (terms !== 'on') {
            return res.status(400).json({ message: 'You must agree to the terms and conditions.' });
        }

        // Verify product availability
        for (const item of cart.items) {
            const product = await Product.findOne(
                { _id: item.product._id, "variants.size": item.size },
                { "variants.$": 1 } // Fetch only the matching variant
            );

            if (!product || product.variants[0].quantity < item.quantity) {
                throw new Error(
                    `Insufficient stock for product "${item.product.productName}" (size: ${item.size}).`
                );
            }
        }

        // Create the order
        const orderData = {
            userId,
            items: cart.items.map((item) => ({
                productId: item.product._id,
                quantity: item.quantity,
                size: item.size,
                price: item.price,
            })),
            shippingAddress: address,
            paymentMethod,
            termsAccepted: true,
            totalAmount: cart.totalPrice,
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

        res.render("order-complete-page");

    } catch (error) {
        console.error('Error placing order:', error);

        res.status(500).json({
            message: 'An error occurred while placing your order. Please try again.',
            error: error.message,
        });
    }
};


const viewOrderDetails = async (req,res) => {
    try {
        const orderId = req.params.id
        console.log("orderId",orderId)

        const order = await Order.findById(orderId) 

        console.log("orderDetails",order)

        res.render("orderDetailsPage",{order});
    } catch (error) {
        console.log("error",error);
        
    }
}

const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.status === "Cancelled") {
            return res.status(400).json({ error: "Order is already cancelled" });
        }

        await Order.findByIdAndUpdate(orderId, { status: "Cancelled" }, { new: true });

        for (const item of order.items) {
            const productId = item.productId;
            const size = item.size;
            const quantityToAdd = item.quantity;

            await Product.updateOne(
                { _id: productId, "variants.size": size },
                { $inc: { "variants.$.quantity": quantityToAdd } }
            );
        }

        res.status(200).json("Order cancelled successfully, and inventory updated.");
    } catch (error) {
        console.error("Error at cancelOrder:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};




module.exports = {
    getCart,
    cart,
    remove,
    cartQuantity,
    checkout,
    placeOrder,
    viewOrderDetails,
    cancelOrder
}