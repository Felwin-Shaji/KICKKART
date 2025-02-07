const Admin = require("../../models/userSchema");
const Order = require("../../models/orderSchema")
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const { render } = require("ejs");

const express = require('express');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('pdfkit-table');
const doc = new PDFDocument();

const errorPage = async(req,res)=>{
    res.status(404).render('adminErrorPage')
}

const loadLogin = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.render('adminLogin')
        }else{
            res.redirect('/admin')
        }
    } catch (error) {
        console.log('loadLoign is not working');
        res.redirect("/admin/errorPage");
    }
}

const Login = async (req, res) => {
    try {
        const { email, password } = req.body;

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
        res.redirect("/admin/errorPage");
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
        res.redirect("/admin/errorPage");
    }
}

const loadDashboard = async (req, res) => {
    try {
        const filter = req.query.filter;
        console.log("filterfilter", filter);

        let dateFilter = {};

        if (filter) {
            let fromDate = new Date();
            switch (filter) {
                case "1day":
                    fromDate.setDate(fromDate.getDate() - 1);
                    break;
                case "1week":
                    fromDate.setDate(fromDate.getDate() - 7);
                    break;
                case "1month":
                    fromDate.setMonth(fromDate.getMonth() - 1);
                    break;
                case "1year":
                    fromDate.setFullYear(fromDate.getFullYear() - 1);
                    break;
            }
            console.log("Filter applied from:", fromDate);
            dateFilter = { createdAt: { $gte: fromDate } };
        }

        const sales = await Order.aggregate([
            {
                $match: dateFilter
            },
            {
                $unwind: "$items"
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalSales: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
                    totalQuantity: { $sum: "$items.quantity" }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    date: "$_id",
                    totalSales: 1,
                    totalQuantity: 1,
                    _id: 0
                }
            }
        ]);

        console.log("sales", sales)


        const topProducts = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" }
        ]);

        const topCategories = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" }
        ]);

        const topBrands = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.brand",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "brands",
                    localField: "_id",
                    foreignField: "brandName",
                    as: "brandDetails"
                }
            },
            { $unwind: "$brandDetails" }
        ]);

        res.render("adminDashboard", { product: topProducts, category: topCategories, brands: topBrands, sales, filter });

    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.redirect("/admin/errorPage");
    }
};

const loadSalesReport = async (req, res) => {
    if (req.session.admin) {
        try {
            const { startDate, endDate, page = 1 } = req.query;
            let filterDescription = "All Orders";

            const filter = {
                items: {
                    $elemMatch: { status: "Delivered" },
                },
            };

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);

                filter.createdAt = {
                    $gte: start,
                    $lte: end,
                };

                const timeDifference = end.getTime() - start.getTime();
                const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

                if (daysDifference === 1) {
                    filterDescription = "Day One";
                } else if (daysDifference === 7) {
                    filterDescription = "One Week";
                } else if (daysDifference === 30 || daysDifference === 31) {
                    filterDescription = "One Month";
                } else if (daysDifference === 365 || daysDifference === 365) {
                    filterDescription = "One Year";
                } else if (daysDifference > 0 && daysDifference < 7) {
                    filterDescription = `From ${start.toLocaleDateString("en-US")} to ${end.toLocaleDateString("en-US")}`;
                } else {
                    filterDescription = `Custom Date Range: ${start.toLocaleDateString("en-US")} to ${end.toLocaleDateString("en-US")}`;
                }
            }

            const orders = await Order.find(filter)
                .populate("userId")
                .populate("items.productId")
                .sort({ createdAt: -1 })



            const totalOrders = await Order.countDocuments(filter);

            const overallSalesCount = orders.length;
            const overallSalesAmount = orders.reduce((total, order) => {
                const deliveredItems = order.items.filter(item => item.status === "Delivered");
                return total + deliveredItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            }, 0);

            const overallDiscount = orders.reduce((total, order) => total + (order.coupenOffer || 0), 0);

            res.render("adminSalesReport", {
                orders,
                overallSalesCount,
                overallSalesAmount,
                overallDiscount,
                filterDescription,
                startDate,
                endDate,
            });
        } catch (error) {
            console.error("Error loading dashboard:", error);
            res.redirect("/admin/errorPage");
        }
    } else {
        res.redirect("/admin/login");
    }
};

const salceReportPDF = (req, res) => {
    const salesData = req.body.salesData;
    const salesCount = req.body.salesCount;
    const salesAmount = req.body.salesAmount;
    const salesDiscount = req.body.salesDiscount;

    const doc = new PDFDocument({ margin: 50 });
    const fileName = 'sales-report.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);

    doc.pipe(res);

    const pageHeight = 700;
    const headerRowHeight = 30;
    const columnWidths = [45, 65, 75, 165, 60, 60, 60, 60];
    let currentY = 100;

    // Column headers
    const headers = ['No', 'Date', 'Name', 'Items', 'Payment', 'Offer', 'Coupon', 'Price'];

    // Function to draw headers
    const drawHeaders = () => {
        doc.fontSize(9).fillColor('black');
        headers.forEach((header, index) => {
            const xPos = 10 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
            const cellWidth = columnWidths[index];

            doc.rect(xPos, currentY, cellWidth, headerRowHeight).fillAndStroke('lightgray', 'black');
            doc.fillColor('black').text(header, xPos + (cellWidth / 2) - (doc.widthOfString(header) / 2), currentY + 8, {
                width: cellWidth,
                align: 'left',
            });
        });
        currentY += headerRowHeight;
    };

    // Function to add a new page if needed
    const checkPageBreak = (rowHeight) => {
        if (currentY + rowHeight > pageHeight) {
            doc.addPage();
            currentY = 50; // Reset position on new page
            drawHeaders(); // Redraw headers
        }
    };

    // Title of the report
    doc.fontSize(16).text('Sales Report', { align: 'center' });
    doc.moveDown(2); // Add space after the title

    // Draw table headers and data
    drawHeaders();
    console.log("salesData:", salesData);


    // Draw data rows
    salesData.forEach((row, rowIndex) => {
        const ordersCount = rowIndex + 1;
        const date = row.date || 'N/A';
        const name = row.user || 'N/A';
        const formattedItems = Array.isArray(row.items)
            ? row.items.join(', ')
            : (typeof row.items === 'string' ? row.items : 'N/A');

        // Calculate row height dynamically based on the item list
        const nameAndItemsHeight = doc.heightOfString(formattedItems, { width: columnWidths[3] });
        const rowHeight = Math.max(headerRowHeight, nameAndItemsHeight + 10); // Ensure a minimum height

        const values = [
            ordersCount, date, name, formattedItems, row.paymentMethod || 'N/A',
            row.offerAmount || 'N/A', row.coupenAmound || 'N/A', row.totalAmount || 'N/A',
        ];

        checkPageBreak(rowHeight); // Check if the row fits on the current page

        values.forEach((value, index) => {
            const xPos = 10 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
            const cellWidth = columnWidths[index];

            doc.rect(xPos, currentY, cellWidth, rowHeight)
                .fillAndStroke(rowIndex % 2 === 0 ? 'white' : 'lightgray', 'black');

            doc.fillColor('black').text(value, xPos + 5, currentY + 5, {
                width: cellWidth - 10,
                align: 'left',
                lineBreak: true,
            });
        });

        currentY += rowHeight;
    });

    let summaryStartY = doc.y + 40; // Get the current position after the title
    doc.fontSize(14).fillColor('black').text('Sales Summary', 50, summaryStartY, { underline: true, align: "left" });
    doc.fontSize(12).text(`Sales Count: ${salesCount}`, 50, summaryStartY + 20);
    doc.fontSize(12).text(`Sales Discount: ${salesDiscount}`, 50, summaryStartY + 40);
    doc.fontSize(12).text(`Sales Amount: ${salesAmount}`, 50, summaryStartY + 60);
    summaryStartY += 30;
    doc.moveDown(2); // Ensure space before the table


    doc.end();
};

const salceReportEXCL = (req, res) => {
    const { salesData } = req.body;

    const worksheet = XLSX.utils.json_to_sheet(salesData);

    const columnWidths = [];
    salesData.forEach((row) => {
        Object.keys(row).forEach((key, index) => {
            const cellValue = String(row[key]);
            const currentWidth = columnWidths[index] || 0;
            columnWidths[index] = Math.max(currentWidth, cellValue.length);
        });
    });

    worksheet['!cols'] = columnWidths.map((width) => ({
        wpx: width * 4,
    }));

    salesData.forEach((order) => {

        if (Array.isArray(order.items)) {
            const items = order.items.map((item) => {
                return `Product: ${item.productId.productName || "N/A"}\nQty: ${item.quantity || "N/A"}\nSize: ${item.size || "N/A"}\nStatus: ${item.status || "N/A"}`;
            }).join('\n');  // Join multiple items into a single string with line breaks
            order.items = items;  // Update the items property to be multi-line
        } else {
            if (order.items) {
                // Format single item if not an array
                order.items = `Product: ${order.items.productId?.productName || "N/A"}\nQty: ${order.items.quantity || "N/A"}\nSize: ${order.items.size || "N/A"}\nStatus: ${order.items.status || "N/A"}`;
            } else {
                // Handle empty items case
                order.items = 'No items available';
            }
        }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');


    res.send(buffer);
};

module.exports = {
    errorPage,
    loadLogin,
    Login,
    loadDashboard,
    loadSalesReport,
    adminLogout,
    salceReportPDF,
    salceReportEXCL
}

