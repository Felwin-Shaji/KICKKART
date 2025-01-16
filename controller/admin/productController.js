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
        const {
            productName,
            brand,
            description,
            regularPrice,
            category,
            variantSize,
            variantQuantity,
        } = req.body;

        // Check if the product already exists
        const productExists = await Product.findOne({ productName });

        if (productExists) {
            return res.status(400).json("Product already exists, please try with another name.");
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const originalImagePath = file.path;
                const resizedImagePath = path.join("public", "uploads", "product-images", file.filename);

                // Resize and save the image
                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);

                images.push(file.filename);
            }
        }

        // Get category ID based on category name
        const categoryDoc = await Category.findOne({ name: category });
        if (!categoryDoc) {
            return res.status(400).json("Invalid Category name");
        }

        // Prepare variants array
        const variants = variantSize.map((size, index) => ({
            size,
            quantity: parseInt(variantQuantity[index], 10),
        }));

        // Create and save the new product
        const newProduct = new Product({
            productName,
            description,
            brand,
            category: categoryDoc._id,
            regularPrice: parseFloat(regularPrice),
            productImage: images,
            variants,
            isOfferActive:categoryDoc.categoryOffer || 0,
            status: "Available",
        });

        await newProduct.save();

        res.redirect("/admin/addProducts");
    } catch (error) {
        console.error("Error saving product:", error);
        res.status(500).json("An error occurred while saving the product.");
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
        // console.log("111111", productData)

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

const blockProduct = async (req, res) => {
    try {
        let { _id } = req.query;


        await Product.updateOne({ _id: _id }, { $set: { isBlocked: true } });

        res.redirect("/admin/products")
    } catch (error) {
        console.log("error on the blockProduct function")
        res.redirect("/pageNotFound")
    }
}

const unBlockProduct = async (req, res) => {
    try {
        let { _id } = req.query;

        await Product.updateOne({ _id: _id }, { $set: { isBlocked: false } });

        res.redirect("/admin/products")
    } catch (error) {
        console.log("Error on the unBlockProduct function")
        res.redirect("/pageNotFound")
    }
}

const getEditProduct = async (req, res) => {
    try {

        let { _id } = req.query;
        const product = await Product.findOne({ _id: _id });
        const category = await Category.find({})
        const brand = await Brand.find({});

        res.render("edit-product", {
            product: product,
            cat: category,
            brand: brand
        })

    } catch (error) {
        console.log("error at getEditProduct", error)
    }
}

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        // Check for duplicate product name
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try another name." });
        }

        // Validate category
        const category = await Category.findOne({ name: data.category });
        if (!category) {
            return res.status(400).json({ error: "Invalid category name." });
        }

        // Fetch product instance
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        // Update images if provided
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);

                // Resize and save the image
                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);

                images.push(req.files[i].filename);
            }
        }

        if (images.length > 0) {
            product.productImage.push(...images);
        }

        // Update variants
        product.variants = data.variantSize.map((size, index) => ({
            size,
            quantity: data.variantQuantity[index],
        }));

        // Update other fields
        product.productName = data.productName;
        product.description = data.description;
        product.brand = data.brand;
        product.category = category._id;
        product.regularPrice = parseFloat(data.regularPrice);

        // Save the updated product (this will trigger the `pre('save')` middleware)
        await product.save();

        res.redirect("/admin/products");
    } catch (error) {
        console.error("Error at editProduct:", error);
        res.redirect("/pageNotFound");
    }
};


const deleteSingleImage = async (req, res) => {
    try {
        console.log("req.body", req.body);

        const { imageId, productId } = req.body;
        const product = await Product.findByIdAndUpdate(productId, { $pull: { productImage: imageId } });
        const imagePath = path.join("public", "uploads", "product-image", imageId);
        console.log("imagePath", imagePath)
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync({ imagePath });
            console.log(`image ${imageId} deleted successfully`);
            res.status(200).json({ sucess: true, message: "image deleted successfully" })
        } else {
            console.log(`image ${imageId} not found`);
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const addOffer = async (req, res) => {
    try {
        const productId = req.params.productId;
        const { offer } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required." });
        }

        // Find the product and populate the category
        const product = await Product.findOne({ _id: productId }).populate('category');

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        const productOffer = parseFloat(offer || 0);
        const categoryOffer = product.category?.categoryOffer || 0;

        // Determine the highest offer
        const highestOffer = Math.max(productOffer, categoryOffer);

        // Update the product instance
        product.isOfferActive = highestOffer;

        // Save the product to trigger middleware
        await product.save();

        return res.status(200).json({
            success: true,
            message: highestOffer === 0
                ? "Offer removed successfully!"
                : "Offer added/updated successfully!",
        });
    } catch (error) {
        console.error("Error adding offer:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


const removeOffer = async (req, res) => {
    // try {
    //     const productId = req.params.productId;

    //     if (!productId) {
    //         return res.status(400).json({ success: false, message: 'Product not found.' });
    //     }

    //     const product = await Product.updateOne({ _id: productId }, { $unset: { productOffer: 0 } });

    //     if (product.modifiedCount > 0) {
    //         return res.status(200).json({
    //             success: true,
    //             message: 'Offer removed successfully!',
    //         });
    //     }

    //     res.status(400).json({ success: false, message: 'No offer found to remove.' });
    // } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ success: false, message: 'Server error.' });
    // }
};

const addCategoryOffer = async (req, res) => {
    const { categoryId, offerValue } = req.body;

    try {
        // Validate request body
        if (!categoryId || offerValue === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Category ID and offer value are required.',
            });
        }

        if (isNaN(offerValue)) {
            return res.status(400).json({
                success: false,
                message: 'Offer value must be a valid number.',
            });
        }

        const percentageValue = parseFloat(offerValue);

        if (percentageValue < 0 || percentageValue > 100) {
            return res.status(400).json({
                success: false,
                message: 'Offer value must be between 0 and 100 (inclusive).',
            });
        }

        // Find and update the category
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found.',
            });
        }

        await Category.findByIdAndUpdate(categoryId, { categoryOffer: percentageValue });

        // Fetch all products in the given category
        const products = await Product.find({ category: categoryId });

        // Update each product and trigger the middleware
        const updatePromises = products.map(async (product) => {
            const productOffer = product.productOffer || 0;
            const highestOffer = Math.max(productOffer, percentageValue);

            // Update the product instance
            product.isOfferActive = highestOffer;

            // Save the product to trigger middleware
            return product.save();
        });

        await Promise.all(updatePromises);

        res.status(200).json({
            success: true,
            message: 'Category offer added successfully, and all related products updated!',
        });
    } catch (error) {
        console.error('Error adding category offer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add category offer due to a server error.',
        });
    }
};




module.exports = {
    getAddProduct,
    addProducts,
    getAllProducts,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    addOffer,
    removeOffer,
    addCategoryOffer
}