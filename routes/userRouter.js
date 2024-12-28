const express = require('express');
const router = express.Router();
const passport = require('passport');
const { userAuth, adminAuth } = require("../middlewares/auth")

const userController = require('../controller/user/userController');
const productController = require("../controller/user/productController")
const profileController = require("../controller/user/profileController")

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), userController.googleVerification);

router.get('/pageNotFound', userController.pageNotFound);

router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.get('/login', userController.loadLogin);
router.post('/login', userController.Login);
router.get('/logout', userController.logout)


router.get('/',userController.loadHomePage);
router.get('/shope',userController.loadShopPage);


// product mangemtne
router.get("/productDetails",productController.productDetails)

//profile management
router.get("/forgot-password",profileController.getForgotPassWordPage)
router.post("/forgotPassword-email-varification",profileController.forgotEmailVarifiation)


module.exports = router;
