const Admin = require("../../models/userSchema");
const Order = require("../../models/orderSchema")
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const { render } = require("ejs");
const PDFDocument = require('pdfkit');
const doc = new PDFDocument();

const loadLogin = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.render('adminLogin')
        }
    } catch (error) {
        console.log('loadLoign is not working');
        res.redirect('/admin')
    }
}

const Login = async (req, res) => {
    try {
        console.log(req.body)
        const { email, password } = req.body;
        console.log('...............', password);
        // const admindemo = await User.findOne({ email, isAdmin:true });
        // console.log('Hardcoded Query Result:', admindemo);

        const admin = await Admin.findOne({ email, isAdmin: true });
        console.log(admin);
        console.log(admin.email)

        if (admin) {


            const passwordMatch = await bcrypt.compare(password, admin.password)
            if (passwordMatch) {
                req.session.admin = true;
                return res.json({ success: true, redirectUrl: "/admin", message: "Login successful!" });

            } else {
                res.json({ success: false, message: "Invalid credentials." });
            }
        } else {
            return res.redirect('/login');
        }

    } catch (error) {
        console.log('cannot get admin login ');
    }
}

const adminLogout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log('session destruction error ', err.message);
                return res.redirect('/pageNotFound');
            }
            return res.redirect('/admin/login');
        })
    } catch (error) {
        console.log("logout error ", error);
        res.redirect('/pageNotFound');
    }
}


const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            // Extract query parameters for filtering
            const { startDate, endDate } = req.query;

            // Create a filter object
            const filter = {};
            if (startDate && endDate) {
                filter.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }

            // Fetch orders with the filter
            const orders = await Order.find(filter)
            .populate("userId")
            .populate("items.productId")
            .sort({ createdAt: -1 }); // Sort by createdAt in descending order (latest first)
        

            console.log("Filtered Orders:", orders);

            // Calculate overall stats
            const overallSalesCount = orders.length;

            const overallSalesAmount = orders.reduce((total, order) => {
                const deliveredItems = order.items.filter(item => item.status === "Delivered");
                return total + deliveredItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            }, 0);

            const overallDiscount = orders.reduce((total, order) => total + (order.coupenOffer || 0), 0);

            console.log("Overall Stats:", overallSalesCount, overallSalesAmount, overallDiscount);

            // Pass data to the dashboard view
            res.render("adminDashboard", {
                orders,
                overallSalesCount,
                overallSalesAmount,
                overallDiscount,
            });
        } catch (error) {
            console.error("Error loading dashboard:", error);
            res.redirect("/pageNotFound");
        }
    } else {
        res.redirect("/adminLogin"); // Redirect if admin is not logged in
    }
};

const filterDashboard = async (req,res) => {
    try {
        
    } catch (error) {
        
    }
}

module.exports = {
    loadLogin,
    Login,
    loadDashboard,
    adminLogout,
    filterDashboard
}

