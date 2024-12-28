const Brand = require("../../models/brandSchema")
const Product = require("../../models/productSchema")


const getBrandPage = async (req, res) => {
    //res.render("brand")
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit

        const brandData = await Brand.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);
        const reverseBrand = brandData.reverse();

        res.render("brand", {
            data: reverseBrand,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands,
        })

    } catch (error) {
        console.log('Error at getBrandPage');
        res.redirect("/pageNotFound");
    }
}

const addBrands = async (req, res) => {
    try {

        const { brandName, brandDescription } = req.body;

        const findBrand = await Brand.findOne({ brandName });

        if (findBrand) {
            return res.status(400).json({ success: false, message: 'Brand already exists' });
        }

        const image = req.file.filename;

        if (!image) {
            return res.status(400).json({ success: false, message: 'Brand image is required' });
        }

        const newBrand = new Brand({
            brandName: brandName,
            brandImage: image,
            description: brandDescription
        })


        await newBrand.save();
        res.status(200).json({
            success: true,
            message: 'Brand added successfully',
            newBrand,
            redirectUrl: '/admin/brands'
        });

    } catch (error) {
        console.error("Error in addBrands function:", error);
        res.status(500).json({ success: false, message: 'An error occurred while adding the brand' });
    }
}


const listCategory = async (req, res) => {
    try {
        const { _id } = req.query;

        console.log(_id)

        const brand = await Brand.findByIdAndUpdate({ _id }, [{ $set: { isBlocked: { $not: '$isBlocked' } } }], { new: true }); // Retrieve the user document

        console.log(brand)
        if (!brand) {
            return res.status(404).render('pageNOtFound', { error: "User not Found" })
        }

        res.redirect('/admin/brands')

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
};

const deleteBrand = async (req, res) => {
    try {
        const { _id } = req.query
        console.log(req.query, ',,,,,,,,', { _id });

        if (!_id) {
            console.log("Brand does not exists");
            return res.status(400).json({ success: false, redirectUrl: '/admin/deleteBrand' })
        }
        await Brand.deleteOne({ _id })
        console.log('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz');

        return res.json({ success: true, redirectUrl: 'admin/deleteBrand', message: "Brand Deleted successfully" })

    } catch (error) {
        console.error('Error deleting brand:', error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}


module.exports = {
    getBrandPage,
    addBrands,
    listCategory,
    deleteBrand,
}