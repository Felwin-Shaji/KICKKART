const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema")

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const { skip } = require("node:test");

const getAddProduct = async (req, res) => {
    try {

        const categoryData = await Category.find({ isListed: true });
        const brandData = await Brand.find({ isBlocked: false });
        res.render("add-Product-Page", {
            cat: categoryData,
            brand: brandData
        });

    } catch (error) {
        console.log('Error in getAddProduct page');
        res.redirect("/pageNotFound");
    }

}

const addProducts = async (req, res) => {
    try {
        //const products = req.body;
        const { productName, brand, description, regularPrice, salePrice, category, variantSize, variantColor, variantQuantity } = req.body;
        console.log("Request Body: 11111111111111111", req.body);
        //console.log('2222222222222222',products);
        

        // Check if the product already exists
        const productExists = await Product.findOne({
            productName: productName,
        });

        if (!productExists) {
            const images = [];

            // Process uploaded images
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                    await sharp(originalImagePath)
                        .resize({ width: 440, height: 440 })
                        .toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            // Get category ID based on category name
            const categoryId = await Category.findOne({ name: category });
            if (!categoryId) {
                return res.status(400).json("Invalid Category name");
            }

            // Prepare variants array
            const variants = [];
            for (let i = 0; i < variantSize.length; i++) {
              variants.push({
                size: variantSize[i],
                color: variantColor[i],
                quantity: variantQuantity[i]
              });
            }

            // Create new product
            const newProduct = new Product({
                productName: productName,
                description: description,
                brand: brand,
                category: categoryId._id,
                regularPrice: parseFloat(regularPrice),
                salePrice: parseFloat(salePrice),
                productImage: images,
                variants: variants,
                status: "Available",
            });

            await newProduct.save();

            res.redirect("/admin/addProducts");
        } else {
            return res.status(400).json("Product already exists, please try with another name.");
        }
    } catch (error) {
        console.error("Error saving product:", error);
        return res.redirect("/pageNotFound");
    }
};


const getAllProducts = async (req, res) => {
    try {

        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;


        const productQuery = {
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ],
        };

        const productData = await Product.find(productQuery)
            .limit(limit)
            .skip((page - 1) * limit)
            .populate("category")
            .exec();
        console.log("111111", productData)

        const count = await Product.countDocuments(productQuery);

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        if (category && brand) {
            res.render("Product-page", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                brand: brand,
            });
        } else {

            res.redirect("/pageNotFound");
        }
    } catch (error) {
        console.error("Error fetching products:", error);
        res.redirect("/pageNotFound");
    }
};

const blockProduct = async (req,res) => {
    try {
        let {_id} = req.query;

    
        await Product.updateOne({_id:_id},{$set:{isBlocked:true}});
        
        res.redirect("/admin/products")
    } catch (error) {
        console.log("error on the blockProduct function")
        res.redirect("/pageNotFound") 
    }
}

const unBlockProduct = async (req,res) => {
    try {
        let {_id} = req.query;

        await Product.updateOne({_id:_id},{$set:{isBlocked:false}});

        res.redirect("/admin/products")
    } catch (error) {
        console.log("Error on the unBlockProduct function")
        res.redirect("/pageNotFound") 
    }
}

const getEditProduct = async (req,res) => {
    try {
        
        let {_id} = req.query;
        const product = await Product.findOne({_id:_id});
        const category = await Category.find({})
        const brand = await Brand.find({});
        console.log("lllllllllllllllllllll",category)
        res.render("edit-product",{
            product:product,
            cat:category,
            brand:brand
        })

    } catch (error) {
        
    }
}

const updateProduct=async (req,res)=>{
    try {
        const id = req.params.id;
        console.log("id",id)
        const product = await Product.findOne({_id:id});
        console.log("product")

        const data = req.body;
        console.log(data)
        const existingProduct= await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })
        console.log(existingProduct)

        if(existingProduct){
            return res.status(400).json({error:"Product is allready exist, Please try again with another name "})
        }

        console.log("exist")

        const image=[];
        console.log("image")

        if(req.files && req.files.length>0){
            for(let i=0;i<req.files.length;i++){
                image.push(req.files[i].filename)
            }

        }

        const updateFields={
            productName:data.productName,
            description:data.description,
            brand:data.brand,
            category:product.category,
            regularPrice:product.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            size:data.size,
            color:data.color
        }
        console.log("hai")
        if(req.files.length>0){
            updateFields.$push={productImage:{$each:image}}
        }
        console.log("hello")
        await Product.findByIdAndUpdate(id,updateFields,{new:true});
        res.redirect('/admin/products')

    } catch (error) {
        // console.error(error);
        res.redirect('/pagenotfound')

    }
}

module.exports = {
    getAddProduct,
    addProducts,
    getAllProducts,
    blockProduct,
    unBlockProduct,
    updateProduct,
    getEditProduct
}