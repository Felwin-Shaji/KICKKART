const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema")
//const Brand = require("../../models/brandSchema")
const Product = require("../../models/productSchema")


const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;

        const userData = await User.findById(userId)

        const { id: productId } = req.query;

        const product = await Product.findById(productId).populate('category');

        const findCategory = product.category;
        const categoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;

        const totalOffer = categoryOffer + productOffer

        const varientSize = product?.variants.map((ele)=>ele.size)
        const varientColor = product?.variants.map((ele)=>ele.color)
        const varientQuantity = product?.variants.map((ele)=>ele.quantity)

        res.render('product-details', {
            user: userData,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory,
            varientSize:varientSize,
            varientColor:varientColor,
            varientQuantity:varientQuantity,
        })

    } catch (error) {
        console.log("Error on fetching productdetails ", error);
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    productDetails,
}