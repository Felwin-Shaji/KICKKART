const Wishlist = require("../../models/wishlistSchema")
const User = require("../../models/userSchema")

const addToWishlist = async (req, res) => {
    try {
        const productId = req.body.productId; // Correct variable name
        const userId = req.session.user; // Assumes `userId` is stored in session

        console.log("userId", userId);
        console.log("productId", productId);

        // Find the wishlist by userId
        let wishlist = await Wishlist.findOne({ userId });

        const product = {
            productId: productId, // Corrected key name
            addedAt: Date.now(),
        };

        if (!wishlist) {
            wishlist = new Wishlist({
                userId: userId,
                products: [product],
            });
        } else {
            const existingProductIndex = wishlist.products.findIndex(
                (item) => item.productId.toString() === productId
            );

            if (existingProductIndex === -1) {
                wishlist.products.push(product);
            } else {
                return res.status(200).json({ message: "Product already in wishlist" });
            }
        }

        await wishlist.save();

        res.status(200).json({ message: "Product added to wishlist successfully" });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ error: "An error occurred while adding to wishlist" });
    }
};


const getWishlist = async (req, res) => {
    try {
        console.log("Fetching wishlist...");

        const user = req.session.user; // Assumes `userId` is stored in session
        console.log("User:", user);

        // Query Wishlist by userId
        let wishlist = await Wishlist.findOne({ userId: user }).populate("products.productId");

        if (!wishlist) {
            wishlist = {
                user: req.session.user,
                products: [],
            };
        }

        // Calculate the sum of quantities in the variants
        wishlist.products.forEach(product => {
            if (product.productId && product.productId.variants) {
                product.totalQuantity = product.productId.variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
            } else {
                product.totalQuantity = 0;
            }
        });

        console.log('Wishlist:', JSON.stringify(wishlist, null, 2));

        return res.render('wishlist', { wishlist });
    } catch (error) {
        console.error("Error fetching wishlist:", error.message);
        return res.redirect('/500');
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.body; // Extract productId from the request body
        console.log("Product ID to remove:", productId);

        // Use $pull to remove the product from the products array
        const result = await Wishlist.updateOne(
            { userId: req.session.user }, // Match the wishlist by userId
            { $pull: { products: { productId } } } // Remove the product from the array
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({ success: true, message: "Item removed successfully" });
        } else {
            res.status(404).json({ success: false, message: "Item not found in wishlist" });
        }
    } catch (error) {
        console.error("Error removing item from wishlist:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
};




module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist
}