const User = require('../models/userSchema');

const userAuth = (req, res, next) => {

    User.findById(req.session.user)
        .then(data => {
            if (data && !data.isBlocked) {
                next();
            } else {
                res.redirect('/');
            }
        })
        .catch(error => {
            console.error('Error in user auth middleware:', error);  
            res.status(500).send('Internal server error');  
        });
};


const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        User.findOne({ isAdmin: true })
            .then(data => {
                if (data) {
                    next();
                } else {
                    return res.redirect("/admin/login");
                }
            })
            .catch(error => {
                console.log("error in admin auth middle ware");
                res.status(500).send("Internal Server Error")
            })
    }
}


module.exports = {
    userAuth,
    adminAuth
}