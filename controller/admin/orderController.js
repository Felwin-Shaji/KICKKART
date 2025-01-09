const Order = require("../../models/orderSchema");
const { find } = require("../../models/userSchema");

const getOrder = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("userId")
            .populate("items.productId");



        console.log(
            "Orders Data:",
            JSON.stringify(orders, null, 2) // Pretty-print the JSON data
        );

        res.render("order-details-page", {
            orders
        })

        console.log("orders", orders);

    } catch (error) {
        console.log("error at getOrder", getOrder);
        res.redirect("/pageNotFound")
    }
}

const orderDetails = async (req, res) => {
    try {

        const orderId = req.params.id;

        const order = await Order.findById(orderId)
            .populate("userId") // Include user details
            .populate("items.productId"); // Include product details


        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.render("view-orderFull-DetailsPage",{
            order
        })
        
    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const apdateStatus = async (req, res) => {
    try {
      const orderId = req.params.id; // Order ID from the route
      const newStatus = req.body.status; // New status from the form
  
      // Update the order's status
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { status: newStatus },
        { new: true }
      );
  
      if (!updatedOrder) {
        return res.status(404).send("Order not found.");
      }
  
      res.redirect("/admin/orders"); // Redirect to the orders page
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  

module.exports = {
    getOrder,
    orderDetails,
    apdateStatus
}