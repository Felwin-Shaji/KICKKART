const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const Product = require("../../models/productSchema")

const nodemailer = require('nodemailer')
const env = require('dotenv').config
const bcrypt = require("bcrypt");
const validator = require("validator")
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

const loadShopPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((category) => category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const brands = await Brand.find({ isBlocked: false });

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            variants: { $elemMatch: { quantity: { $gt: 0 } } }
        }).sort({ createdAt: -1 }).skip(skip).limit(limit);


        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            variants: { $elemMatch: { quantity: { $gt: 0 } } },
        });


        const totalpages = Math.ceil(totalProducts / limit);



        const categoriesWidthIds = categories.map(category => ({ _id: category._id, name: category.name }));

        res.render("shop", {
            user: userData,
            products: products,
            category: categoriesWidthIds,
            brand: brands,
            totalProducts: totalProducts,
            currentPage: page,
            totalpages: totalpages,
        })

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;

        const category = req.query.category || req.session.category || null;
        const brand = req.query.brand || req.session.brand || null;

        req.session.category = category;
        req.session.brand = brand;

        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();

        const query = {
            isBlocked: false,
            variants: {
                $elemMatch: { quantity: { $gt: 0 } }
            }
        };

        if (category) {
            const findCategory = await Category.findOne({ _id: category });
            if (findCategory) {
                query.category = findCategory._id;
            }
        }

        if (brand) {
            const findBrand = await Brand.findOne({ _id: brand });
            if (findBrand) {
                query.brand = findBrand.brandName;
            }
        }

        let findProducts = await Product.find(query).lean();

        findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const itemsPerPage = 8;
        const currentPage = parseInt(req.query.page) || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProducts = findProducts.slice(startIndex, startIndex + itemsPerPage);

        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                    category: category ? category : null,
                    brand: brand ? brand : null,
                    searchedOn: new Date(),
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        req.session.filteredProducts = currentProducts;

        res.render("shop", {
            user: userData,
            products: currentProducts,
            category: categories,
            brand: brands,
            totalpages: totalPages,
            currentPage,
            selectedCategory: category || null,
            selectedBrand: brand || null,
        });
    } catch (error) {
        console.error("Error filtering products:", error);
        res.redirect("/pageNotFound");
    }
};

const filterPrice = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const brand = await Brand.find({}).lean();
        const category = await Category.find({ isListed: true });
        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            // category:{$in:categoryIds},
            quantity: { $gt: 0 },
        })

        const findProduct = await Product.find({
            salePrice: { $gt: req.query.gt, $lt: req.query.lt },
            isBlocked: false,
            variants: { $elemMatch: { quantity: { $gt: 0 } } }
        }).lean();


        findProduct.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        let ipage = 6
        let currentPage = parseInt(req.query.page) || 1
        let startIndex = (currentPage - 1) * ipage
        let endIndex = startIndex + ipage
        let totalPages = Math.ceil(findProduct.length / ipage)
        const currentProduct = findProduct.slice(startIndex, endIndex)
        req.session.filteredProducts = findProduct

        res.render('shop', {
            user: userData,
            products: currentProduct,
            category: category,
            totalProducts: totalProducts,
            brand: brand,
            totalpages: totalPages,
            currentPage
        })
    } catch (error) {
        console.error(error);
        res.redirect('/pagenotfound');
    }
}

const searchProduct = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         if(userId){
//         const userData = await User.findOne({ _id: userId });
//         }

//         let search = req.body
//         console.log("req.body",req.body)

//         const brands = await Brand.find({}).lean();
//         const categories = await Category.find({isListed:true}).lean()
//         const categoryId = categories.map(catrgory=> catrgory._id.toString());
        
//         let searchResult = [];
//         if(req.session.filteredProducts && req.session.filteredProducts>0){
//             searchResult = req.session.filteredProducts.filter(product => 
//                 product.productName.toLowerCase().includes(search.toLowerCase())
//             );            
//         }else {
//             searchResult =  await Product.find({
//                 productName : {$regex:".*"+search+".*",$opctions:"i"},
//                 isBlocked:false, 
//                 variants: { $elemMatch: { quantity: { $gt: 0 } } },
//                 category:{$in:categoryId}
//             })
//         }

//         searchResult.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
//         findProduct.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
//         let ipage = 6;
//         let currentPage = parseInt(req.query.page) || 1
//         let startIndex = (currentPage - 1) * ipage
//         let endIndex = startIndex + ipage
//         let totalPages = Math.ceil(findProduct.length / ipage)
//         const currentProduct = searchResult.slice(startIndex, endIndex)
//         req.session.filteredProducts = searchResult;

//         res.render('shop', {
//             user: userData,
//             products: currentProduct,
//             category: categories,
//             totalProducts: totalProducts,
//             brand: brands,
//             totalpages: totalPages,
//             currentPage,
//             count:searchResult.length,
//         })  


//     } catch (error) {

//     }
 }

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;

        const categories = await Category.find({ isListed: true })

        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            variants: { $elemMatch: { quantity: { $gt: 0 } } }
        })
            .sort({ createdAt: -1 }) // Sort by creation date in descending order
            .limit(4); // Limit to 4 products

        const varientSize = productData.flatMap(product => product.variants.map(variant => variant.size));
        const varientColor = productData.flatMap(product => product.variants.map(variant => variant.color));
        const varientQuantity = productData.flatMap(product => product.variants.map(variant => variant.quantity));

        if (user) {
            const userData = await User.findById(user)
            res.render('index', {
                user: userData,
                products: productData,
                varientSize: varientSize,
                varientColor: varientColor,
                varientQuantity: varientQuantity,
            });
        } else {
            return res.render('index', {
                products: productData,
                varientSize: varientSize,
                varientColor: varientColor,
                varientQuantity: varientQuantity,
            });
        }
    } catch (error) {
        console.error('Error loading home page:', error.message);
        res.status(500).send('Server error');
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

        console.log("req.body", req.body);

        // Check if all fields are filled
        if (!name || !phone || !email || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }

        // Validate email format
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        // Check if user already exists
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        // Generate OTP
        const otp = generateOtp();
        console.log('Signup successful, OTP sent', otp);

        // Send OTP to email
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
        }

        // Store OTP and user data in session
        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };
        req.session.otpExpiry = Date.now() + 60000; // OTP valid for 1 minute

        console.log('Signup successful, OTP sent', req.session.userOtp);

        // Response
        return res.status(200).json({ success: true, message: 'OTP sent successfully', redirectTo: '/verify-otp' });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {

    }
}

const getVerifyOTP = async (req, res) => {
    try {
        const otp = req.session.userOtp;

        if (!otp) {
            console.error("OTP expired or not found in session.");
            return res.redirect("/pageNotFound");
        }

        res.render("Verify-Otp");
    } catch (error) {
        console.error("Error at getVerifyOTP:", error.message || error);
        res.redirect("/pageNotFound");
    }
};

const verifyOtp = async (req, res) => {
    try {
        const user = req.session.userData;
        const { otp } = req.body;

        console.log("ooooo", req.body)

        if (!otp || !user) {
            console.error("Missing OTP or user data in session.");
            return res.status(400).json({
                success: false,
                message: "Session expired or invalid data. Please try again.",
            });
        }

        console.log("Received OTP:", otp);

        // Compare the entered OTP with the session-stored OTP
        if (otp === req.session.userOtp) {
            // Hash the user's password
            const passwordHash = await securePassword(user.password);

            // Save user data in the database
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            });

            await saveUserData.save();

            // Update session with the saved user data
            req.session.user = saveUserData;

            // Clear OTP from session after successful verification
            delete req.session.userOtp;
            delete req.session.userData;

            res.json({
                success: true,
                message: "OTP verified successfully.",
                redirectUrl: "/login",
            });
        } else {
            console.error("Invalid OTP entered.");
            res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again.",
            });
        }
    } catch (error) {
        console.error("Error at verifyOtp:", error.message || error);
        res.status(500).json({
            success: false,
            message: "An internal error occurred. Please try again later.",
        });
    }
};

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
                console.log('Session destruction error:', err.message);
                return res.redirect('/pageNotFound'); // Redirect to an error page
            }
            res.clearCookie('connect.sid'); // Clear session cookie
            res.redirect('/'); // Redirect to the login page or home page
        });
    } catch (error) {
        console.log("Logout error:", error);
        res.redirect('/pageNotFound'); // Handle unexpected errors
    }
};

const googleVerification = async (req, res) => {
    res.redirect('/')
}

module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup,
    getVerifyOTP,
    verifyOtp,
    googleVerification,
    resendOtp,
    loadLogin,
    Login,
    logout,
    loadShopPage,
    filterProduct,
    filterPrice,
    searchProduct,
}
