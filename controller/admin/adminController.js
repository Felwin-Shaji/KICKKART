const Admin = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const { render } = require("ejs");


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
            res.render("adminDashboard");
        } catch (error) {
            res.redirect("/pageNotFound")
        }
    }
}

module.exports = {
    loadLogin,
    Login,
    loadDashboard,
    adminLogout
}

