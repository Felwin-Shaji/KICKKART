const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const Product = require("../../models/productSchema")

const nodemailer = require('nodemailer')
const env = require('dotenv').config
const bcrypt = require("bcrypt");
const { login } = require("../admin/adminController");
const { EventEmitterAsyncResource } = require("nodemailer/lib/xoauth2");

function generateOtp() {
    console.log(Math.floor(100000 + Math.random() * 900000).toString());
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')

    }
}

const loadShopPage = async (req,res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        const categories = await Category.find({isListed:true});
        const categoryIds = categories.map((category)=>category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page-1)*limit;
        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds},
            variants: {$elemMatch: { quantity: { $gt: 0 } }}
        }).sort({createdAt:-1}).skip(skip).limit(limit);

        const totalProducts =await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0},
        });

        const totalpages = Math.ceil(totalProducts/limit);

        const brands = await Brand.find({isBlocked:false});

        const categoriesWidthIds = categories.map(category=>({_id:category._id,name:category.name}));

        console.log("|||||||||||",page,totalpages)
        

        res.render("shop",{
            user:userData,
            products:products,
            category:categoriesWidthIds,
            brand:brands,
            totalProducts:totalProducts,
            currentPage:page,
            totalpages:totalpages,
        })

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;

        const categories = await Category.find({ isListed: true })
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            variants: {$elemMatch: { quantity: { $gt: 0 } }}
        })

        console.log('111111111111',productData);

        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        productData = productData.slice(0, 4);

        
        

        if (user) {
            const userData = await User.findById(user)
            console.log('user DAta', userData)
            res.render('index', { user: userData, products: productData });
        } else {
            return res.render('index',{products:productData});
        }
    } catch (error) {
        console.log('login error');
        res.status(500).send('server error')
    }
}

const loadSignup = async (req, res) => {
    try {
        const user = req.session.user
        if (!user) {
            return res.render('signup')
        }
    } catch (error) {
        console.log("Home page not loading:", error)
        res.status(500).send('Server Error');
    }
}

async function sendVerificationEmail(email, otp) {    ////nodemailer
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for port 465, false for other ports
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Verify your account',
            text: `Your OTP is ${otp}`,
            html: `your OTP : ${otp}</b>`,
        })

        return info.accepted.length > 0
    } catch (error) {
        console.log('Error sending email ', error);
        return false;
    }
}

const signup = async (req, res) => {
    try {


        const { name, phone, email, password, confirmPassword } = req.body;
        console.log('.....................................', email);


        if (password !== confirmPassword) {
            return res.render('signup', { message: 'Password do not match' });
        }

        const findUser = await User.findOne({ email })
        if (findUser) {
            return res.render('signup', { message: 'user with this email already exists ' });
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.json('email-error')
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };

        console.log('signup .....- ', req.session.user)

        console.log('Otp Sent ', otp);

        res.render('Verify-Otp')



    } catch (error) {
        console.log("Signup  error")
        res.redirect('/pageNotFound')
    }

}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {

    }
}

const verifyOtp = async (req, res) => {
    try {

        const user = req.session.user

        if (!user) {

            const { otp } = req.body;
            console.log({ otp })

            if (otp === req.session.userOtp) {
                const user = req.session.userData;
                const passwordHash = await securePassword(user.password);

                const saveUserData = new User({
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    password: passwordHash,
                })

                await saveUserData.save();
                // req.session.user = saveUserData._id
                res.json({ success: true, redirectUrl: '/login' })

                req.session.user = saveUserData;

            } else {
                res.status(400).json({ success: false, message: 'Invalid OTP , please try again' })
            }
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "an error occured" })
    }
}

const resendOtp = async (req, res) => {
    try {

        const { email } = req.session.userData
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email not found in session' })
        }
        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log('Resend Otp :', otp);
            res.status(200).json({ success: true, message: 'Otp Resend Successfully' })
        } else {
            res.status(500).json({ success: false, message: 'Failed to resend OTP. Please try again ' });
        }

    } catch (error) {
        console.error('Error resending OTP ', error);
        res.status(500).json({ success: false, message: "Internal server error. Please try again." })
    }
}

const loadLogin = async (req, res) => {

    //res.render("loginPage")
    try {

        if (!req.session.user) {
            return res.render('loginPage')
        } else {
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const Login = async (req, res) => {
    try {

        const { email, password } = req.body;

        const findUser = await User.findOne({ isAdmin: 0, email: email })



        if (!findUser) {
            // return res.render('/login',{message:'User not found'})
            return res.json({
                sucess: false,
                message: 'user not found',
                redirectUrl: '/login',
            })
        }
        if (findUser.isBlocked) {
            return res.json({
                sucess: false,
                message: " User is Blocked by admin",
                redirectUrl: '/login'
            })
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.json({
                success: false,
                message: "Incorrect password",
                redirectUrl: '/login'
            })
        }

        req.session.user = findUser._id;


        return res.json({
            success: true,
            message: "Login Successfull!",
            redirectUrl: '/'
        });


    } catch (error) {
        console.error("login error :", error)
        res.render('login', { message: "login failed please try again later" })
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log('session destruction error ', err.message);
                return res.redirect('/pageNotFound');
            }
            return res.redirect('/');
        })
    } catch (error) {
        console.log("logout error ", error);
        res.redirect('/pageNotFound');
    }
}

const googleVerification = async (req, res) => {
    res.redirect('/')
}

// const productDetails = async (req,res) => {
//     res.render("Show-product")
// }


module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    googleVerification,
    resendOtp,
    loadLogin,
    Login,
    logout,
    loadShopPage,
}
