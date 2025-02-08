const Order = require("../../models/orderSchema");
const { find } = require("../../models/userSchema");

const getOrder = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments(); // Total number of orders
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .populate("userId")
            .populate("items.productId")
            .skip(skip)
            .limit(limit);

        res.render("order-details-page", {
            orders,
            currentPage: page,
            totalPages,
        });

    } catch (error) {
        console.error("Error at getOrder", error);
        res.redirect("/admin/errorPage");
    }
};

const orderDetails = async (req, res) => {
    try {

        const orderId = req.params.id;

        const order = await Order.findById(orderId)
            .populate("userId") // Include user details
            .populate("items.productId"); // Include product details


        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.render("view-orderFull-DetailsPage", {
            order
        })

    } catch (error) {
        console.error("Error fetching order:", error);
        res.redirect("/admin/errorPage");
    }
}

const apdateStatus = async (req, res) => {
    try {
        const { orderId, productId} = req.params;
        const newStatus = req.body.status; 

        console.log("req.params",req.params);
         console.log("newStatus",newStatus)
        
        // Update the order's status
        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: orderId,
                "items._id": productId,
            },
            {
                $set: { "items.$.status": newStatus }, 
            },
            { new: true } 
        );

        //console.log("updatedOrder",updatedOrder);
        
        if (!updatedOrder) {
            return res.status(404).send("Order not found.");
        }

        res.redirect(`/admin/orders/${orderId}`);
    } catch (error) {
        console.error("Error updating order status:", error);
        res.redirect("/admin/errorPage");
    }
};

module.exports = {
    getOrder,
    orderDetails,
    apdateStatus
}