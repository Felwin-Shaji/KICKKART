const express = require('express');
const router = express.Router();
const passport = require('passport');
const { userAuth, adminAuth } = require("../middlewares/auth")
const crypto = require('crypto');



const userController = require('../controller/user/userController');
const productController = require("../controller/user/productController")
const profileController = require("../controller/user/profileController")
const cartController = require("../controller/user/cartController");
const wishlistController = require('../controller/user/wishlistController');

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), userController.googleVerification);



router.get('/pageNotFound', userController.pageNotFound);

router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);

router.get("/verify-otp",userController.getVerifyOTP)
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

router.get('/login', userController.loadLogin);
router.post('/login', userController.Login);
router.post('/logout', userController.logout)


router.get('/',userController.loadHomePage);
router.get('/shope',userController.loadShopPage);
router.get("/filter",userController.filterProduct);
router.get("/filterPrice",userController.filterPrice)
router.post("/search",userController.searchProduct)


// product mangemtne
router.get("/productDetails",productController.productDetails)

//profile management
router.get("/forgot-password",profileController.getForgotPassWordPage);
router.post("/forgot-password-VarificationOTP",profileController.forgotEmailVarifiation);
router.get("/Verify-OTP-page",profileController.getVerifyOTPPage);
router.post("/forgotPass-verify-OTP",profileController.verifyOtp);
router.get("/reset-password",profileController.getResetPassword);
router.post("/forgot-resend-OTP",profileController.resendOtp);
router.post('/reset-password',profileController.resetPassword);
router.get("/userProfile",userAuth,profileController.userProfile);
router.post("/change-password",userAuth,profileController.changePassword);
router.get("/addAddress",userAuth,profileController.getAddAddress);
router.post("/addAddress",userAuth,profileController.addAddress);
router.get("/editAddress",userAuth,profileController.getEditAddress);
router.post("/editAddress",userAuth,profileController.editAddress); 
router.get("/deleteAddress",userAuth,profileController.deleteAddress);


//cart
router.get("/cart",userAuth,cartController.getCart)
router.post("/cart",userAuth,cartController.cart)
router.patch("/cartQuantity",userAuth,cartController.cartQuantity)
// router.post("/cartQuantity",userAuth,cartController.cartQuantity)
router.delete("/removeFromCart/:id/:size",userAuth,cartController.remove);
router.get("/checkout",userAuth,cartController.checkout)
router.post("/applyCoupen",userAuth,cartController.applyCoupen);
router.post("/create-order",userAuth,cartController.razorpayCreatOrder);
router.post("/verify-payment",userAuth,cartController.varifyPayment)

//orderController
router.post("/place-order",userAuth,cartController.placeOrder)
router.get("/order-success",userAuth,cartController.getOrderSuccessPage)
router.get("/viewOrderDetails/:orderId/:productId",userAuth,cartController.viewOrderDetails)
//router.patch("/cancel-order/:id",userAuth,cartController.cancelOrderAllCart)
router.patch("/cancel-order/:orderId/:productId",userAuth,cartController.cancelSingleItem)

//wishlistControlle
router.get("/wishlist",userAuth,wishlistController.getWishlist)
router.post("/wishlist",userAuth,wishlistController.addToWishlist)








module.exports = router;
