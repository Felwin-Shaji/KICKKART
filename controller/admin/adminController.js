const Admin = require("../../models/userSchema");
const Order = require("../../models/orderSchema")
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const { render } = require("ejs");

const express = require('express');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('pdfkit-table'); // Extends PDFDocument
const doc = new PDFDocument();
// doc.pipe(fs.createWriteStream('test.pdf'));

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
            const { startDate, endDate, page = 1 } = req.query;  // Default to page 1 if not provided
            let filterDescription = "All Orders";

            // Create a filter object
            const filter = {};
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);

                filter.createdAt = {
                    $gte: start,
                    $lte: end,
                };

                // Calculate the difference in days
                const timeDifference = end.getTime() - start.getTime();
                const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

                // Determine the filter description
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


            // Fetch orders with pagination and filter
            const orders = await Order.find(filter)
                .populate("userId")
                .populate("items.productId")
                .sort({ createdAt: -1 }) // Sort by createdAt in descending order (latest first)


            // Fetch total order count for pagination
            const totalOrders = await Order.countDocuments(filter);

            // Calculate overall stats
            const overallSalesCount = orders.length;
            const overallSalesAmount = orders.reduce((total, order) => {
                const deliveredItems = order.items.filter(item => item.status === "Delivered");
                return total + deliveredItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            }, 0);

            const overallDiscount = orders.reduce((total, order) => total + (order.coupenOffer || 0), 0);

            // Pass data to the dashboard view
            res.render("adminDashboard", {
                orders,
                overallSalesCount,
                overallSalesAmount,
                overallDiscount,
                filterDescription,
                startDate,  // Pass startDate to the view
                endDate,    // Pass endDate to the view
                // Total pages for pagination
            });
        } catch (error) {
            console.error("Error loading dashboard:", error);
            res.redirect("/pageNotFound");
        }
    } else {
        res.redirect("/adminLogin"); // Redirect if admin is not logged in
    }
};

const salceReportPDF = (req, res) => {
    const salesData = req.body.salesData;

    const doc = new PDFDocument({ margin: 50 });
    const fileName = 'sales-report.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);

    doc.pipe(res);

    const pageHeight = 700; // Usable page height after margins
    const headerRowHeight = 30;

    const columnWidths = [30, 60, 60, 150, 50, 50, 50, 50];
    let currentY = 100;

    // Column headers
    const headers = [
        'No of', 'Date', 'Name', 'Items', 'Payment', 'Price', 'Offer', 'Coupon'
    ];

    // Function to draw headers
    const drawHeaders = () => {
        doc.fontSize(9).fillColor('black');
        headers.forEach((header, index) => {
            const xPos = 10 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
            const cellWidth = columnWidths[index];
            doc.rect(xPos, currentY, cellWidth, headerRowHeight)
                .fillAndStroke('lightgray', 'black');
            doc.fillColor('black')
                .text(header, xPos + (cellWidth / 2) - (doc.widthOfString(header) / 2), currentY + 5, {
                    width: cellWidth,
                    align: 'center',
                });
        });
        currentY += headerRowHeight;
    };

    // Function to add a new page if needed
    const checkPageBreak = (rowHeight) => {
        if (currentY + rowHeight > pageHeight) {
            doc.addPage();
            currentY = 50; // Reset position on the new page
            drawHeaders(); // Redraw the headers
        }
    };

    // Title of the report
    doc.fontSize(16).text('Sales Report', { align: 'center' });
    doc.moveDown();
    drawHeaders();

    console.log("salesData", salesData)

    // Draw data rows
    salesData.forEach((row, rowIndex) => {
        const ordersCount = rowIndex + 1;
        const date = row.date || 'N/A';
        const name = row.user || 'N/A';
        const formattedItems = row.items || 'N/A'; // Use raw items data

        // Dynamically calculate row height for "Name and Items"
        const nameAndItemsHeight = doc.heightOfString(formattedItems, {
            width: columnWidths[2] - 10, // Account for padding
        });

        const rowHeight = Math.max(headerRowHeight, nameAndItemsHeight + 10); // Add some padding

        const values = [
            ordersCount, date, name, formattedItems, row.paymentMethod || 'N/A', row.totalAmount || 'N/A', row.offerAmount || 'N/A', row.coupenAmound || 'N/A',
        ];

        checkPageBreak(rowHeight); // Check if the row fits on the current page

        values.forEach((value, index) => {
            const xPos = 10 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0);
            const cellWidth = columnWidths[index];

            doc.rect(xPos, currentY, cellWidth, rowHeight)
                .fillAndStroke(rowIndex % 2 === 0 ? 'white' : 'lightgray', 'black');

            doc.fillColor('black')
                .text(value, xPos + 5, currentY + 5, {
                    width: cellWidth - 10,
                    align: 'left',
                    lineBreak: true,
                });
        });

        currentY += rowHeight;
    });

    doc.end();
};

const salceReportEXCL = (req, res) => {
    const { salesData } = req.body;

    // Convert salesData to worksheet
    const worksheet = XLSX.utils.json_to_sheet(salesData);

    // Determine column widths
    const columnWidths = [];
    salesData.forEach((row) => {
        Object.keys(row).forEach((key, index) => {
            const cellValue = String(row[key]); // Ensure it's a string
            const currentWidth = columnWidths[index] || 0;
            columnWidths[index] = Math.max(currentWidth, cellValue.length); // Update with max width
        });
    });

    // Adjust the column widths carefully
    worksheet['!cols'] = columnWidths.map((width) => ({
        wpx: width * 4,  // Adjust the multiplier to avoid excessive width
    }));

    // Handle the items field correctly (check if it's an array)
    salesData.forEach((order) => {
        // Check if items is an array or object and format accordingly
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

  

    // Set row heights (if needed)
   

    // Create a workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send the Excel file as response
    res.send(buffer);
};



module.exports = {
    loadLogin,
    Login,
    loadDashboard,
    adminLogout,
    salceReportPDF,
    salceReportEXCL
}

