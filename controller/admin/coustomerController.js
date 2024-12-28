const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 7;


        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();


        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ],
        });


        const totalPages = Math.ceil(count / limit);


        res.render('adminCustomers', {
            userData,
            currentPage: page,
            totalPages,
            search
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const customerBlock = async (req, res) => {
    try {
        const id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });

        console.log('yyyyyyyyyyyyyyyyyyyyyyyy',req.session.user)

        if (req.session.user) {
            req.session.destroy((err) => {

            })
        }

        res.redirect("/admin/users");

    } catch (error) {
        console.log('customerBlock function is not working')
        console.log('/pageNotFound')
    }
}

const customerUnblock = async (req, res) => {
    try {

        let id = req.query.id;

        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });

        res.redirect("/admin/users");

    } catch (error) {
        console.log('customerUnblock function is not working')
        console.log('/pageNotFound')
    }
}
module.exports = { customerInfo, customerBlock, customerUnblock }
