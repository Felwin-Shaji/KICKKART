const Coupon = require("../../models/couponSchema");

const getCouponsPage = async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.render("coupen", { coupons });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).render("error", { message: "Failed to load coupons" });
    }
};

const createCoupon = async (req, res) => {
    try {
        const { code, discountPercentage, minPurchaseAmount,maxPurchaseAmount, startDate, endDate, quantity } = req.body;

      
        if (!code || !discountPercentage || !minPurchaseAmount || !maxPurchaseAmount || !startDate || !endDate || !quantity) {
            return res.status(400).render("error", { message: "All fields are required" });
        }

        if (quantity <= 0) {
            return res.status(400).render("error", { message: "Quantity must be greater than 0" });
        }


        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).render("error", { message: "Coupon code already exists" });
        }

        const newCoupon = new Coupon({
            code,
            discountPercentage,
            minPurchaseAmount,
            maxPurchaseAmount,
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
