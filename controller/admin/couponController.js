const Coupon = require("../../models/couponSchema");

// Render coupons management page
const getCouponsPage = async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.render("coupen", { coupons });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).render("error", { message: "Failed to load coupons" });
    }
};

// Add a new coupon
const createCoupon = async (req, res) => {
    try {
        const { code, discountPercentage, minPurchaseAmount, startDate, endDate, quantity } = req.body;

        // Validate input
        if (!code || !discountPercentage || !minPurchaseAmount || !startDate || !endDate || !quantity) {
            return res.status(400).render("error", { message: "All fields are required" });
        }

        if (quantity <= 0) {
            return res.status(400).render("error", { message: "Quantity must be greater than 0" });
        }

        // Check for duplicate coupon codes
        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).render("error", { message: "Coupon code already exists" });
        }

        // Create and save the new coupon
        const newCoupon = new Coupon({
            code,
            discountPercentage,
            minPurchaseAmount,
            startDate,
            endDate,
            quantity,
        });
        await newCoupon.save();
        res.redirect("/admin/coupons");
    } catch (error) {
        console.error("Error creating coupon:", error);
        res.status(500).render("error", { message: "Failed to create coupon" });
    }
};

// Delete a coupon
const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        await Coupon.findByIdAndDelete(couponId);
        res.redirect("/admin/coupons");
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).render("error", { message: "Failed to delete coupon" });
    }
};

module.exports = {
    getCouponsPage,
    createCoupon,
    deleteCoupon,
};
