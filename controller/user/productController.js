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
        let totalOffer = product.isOfferActive;
        console.log("totalOffer1",totalOffer)

        // if (categoryOffer >= productOffer) {
        //      totalOffer = categoryOffer
        //      console.log("totalOffer2",totalOffer);
             
        // } else {
        //      totalOffer = productOffer
        //      console.log("totalOffer3",totalOffer);
             
        // }

        console.log("totalOffer4",totalOffer)

        const varientSize = product?.variants.map((ele) => ele.size)
        const varientQuantity = product?.variants.map((ele) => ele.quantity)
        //const productPrice = (product?.salePrice)-((product?.salePrice*totalOffer)/100)

        res.render('product-details', {
            user: userData,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory,
            varientSize: varientSize,
            varientQuantity: varientQuantity,
            productPrice:product.salePrice 
        })

    } catch (error) {
        console.log("Error on fetching productdetails ", error);
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    productDetails,
}