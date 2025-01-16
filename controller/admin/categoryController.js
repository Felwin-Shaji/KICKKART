const Category = require("../../models/categorySchema")


const categoryInfo = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 5; 
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 }) // Sort by most recent
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments()

        const totalPages = Math.ceil(totalCategories / limit);

        res.render('category', {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.redirect("/pageNotFound")
    }
}

const addCategory = async (req, res) => {
    const { name, description } = req.body


    try {

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ success: false, redirectUrl: '/login', message: "Category already exists" });
        }

        const newCategory = new Category({
            name,
            description,
        })

        await newCategory.save()
        return res.json({ success: true, redirectUrl: '/login', message: "category added sucessfully " })


    } catch (error) {
        return res.status(500).json({ success: false, redirectUrl: '/login', error: "Internal Server error" })
    }
}

const getEditCategory = async (req, res) => {
    try {
        const categoryId = req.params.id; 
        const { name, description } = req.body; 

        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required.' });
        }

        // Update the category in the database
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { name, description },
            { new: true } // Return the updated document
        );

        console.log("updatedCategory",updatedCategory)

        if (!updatedCategory) {
            return res.status(404).json({ error: 'Category not found.' });
        }

        res.json({
            success: true,
            message: 'Category updated successfully.',
            category: updatedCategory
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

const listCategory = async (req, res) => {
    try {
        let _id = req.query;
        await Category.updateOne({ _id: _id }, { $set: { isListed: false } })
        res.redirect("/admin/category")
    } catch (error) {
        console.error("listCategory error");
        res.redirect('/pageNotFound')
    }
}
const unListCategory = async (req, res) => {
    try {
        let _id = req.query;
        await Category.updateOne({ _id: _id }, { $set: { isListed: true } })
        res.redirect("/admin/category")
    } catch (error) {
        console.error("unListCategory error");
        res.redirect('/pageNotFound')
    }
}

module.exports = { categoryInfo, addCategory, listCategory, unListCategory, getEditCategory }