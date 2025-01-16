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
        console.log("llllllllllllllllllllllllllllllll");
        
        const user = req.session.user; // Assumes `userId` is stored in session
        console.log("user", user);

        // Ensure `user` is a valid ObjectId
        // if (!mongoose.Types.ObjectId.isValid(user)) {
        //     throw new Error("Invalid user ID");
        // }

        // Query Wishlist by userId
        let wishlist = await Wishlist.findOne({ userId: user }).populate("products.productId");

        if (!wishlist) {
            wishlist = {
                user: req.session.user,
                products: [],
            };
        }

        console.log('wishlist:', JSON.stringify(wishlist, null, 2));

        return res.render('wishlist', { wishlist });
    } catch (error) {
        console.error("Error fetching wishlist:", error.message);
        return res.redirect('/500');
    }
};


module.exports = {
    getWishlist,
    addToWishlist,
}