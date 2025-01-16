//express 
const express = require('express');
const router = express.Router();

// multer
const multer = require('multer');
const storage = require("../helpers/multer");
const   uploads = multer({storage:storage})

//middlewares
const { route } = require('./userRouter');
const { userAuth, adminAuth } = require("../middlewares/auth")

//controller
const adminController = require('../controller/admin/adminController');
const coustomerController = require('../controller/admin/coustomerController')
const categoryController = require('../controller/admin/categoryController')
const brandController = require('../controller/admin/brandController')
const productController = require("../controller/admin/productController")
const orderController = require("../controller/admin/orderController")



//admin controller
router.get('/login', adminController.loadLogin)
router.post('/login', adminController.Login)
router.get('/', adminAuth, adminController.loadDashboard)
router.get('/logout', adminController.adminLogout)

//userRouter controller
router.get('/users', adminAuth, coustomerController.customerInfo)
router.get('/blockCustomer', adminAuth, coustomerController.customerBlock)
router.get('/unBlockCustomer', adminAuth, coustomerController.customerUnblock)

//category controller
router.get('/category', adminAuth, categoryController.categoryInfo)
router.post("/addCategory", adminAuth, categoryController.addCategory)
router.get("/listCategory", adminAuth, categoryController.listCategory)
router.get("/unListCategory", adminAuth, categoryController.unListCategory)
router.post("/editCategory/:id", adminAuth, categoryController.getEditCategory)

//brand controller
router.get("/brands", adminAuth,brandController.getBrandPage)
router.post("/addBrand",adminAuth, uploads.single("image"),brandController.addBrands)
router.get('/listBrand',adminAuth,brandController.listCategory)
router.delete("/deleteBrand",adminAuth,brandController.deleteBrand)

//add product 
router.get("/addProducts",adminAuth,productController.getAddProduct)
router.post("/addProducts",adminAuth,uploads.array('images',4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts)
router.get("/blockProduct",adminAuth,productController.blockProduct)
router.get("/unBlockProduct",adminAuth,productController.unBlockProduct)
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/daleteImages",adminAuth,productController.deleteSingleImage);
router.post("/add-offer/:productId",adminAuth,productController.addOffer)
router.delete('/remove-offer/:productId', adminAuth,productController.removeOffer);
router.post("/addCategoryOffer",adminAuth,productController.addCategoryOffer)


//order managenent
router.get("/orders",adminAuth,orderController.getOrder);
router.get("/orders/:id",adminAuth,orderController.orderDetails)
router.post("/orders/:orderId/:productId/status",adminAuth,orderController.apdateStatus)


module.exports = router;