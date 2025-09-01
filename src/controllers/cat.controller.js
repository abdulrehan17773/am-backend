import { asyncHandler } from "../utils/asyncHandler.js";
import { Category } from "../models/cat.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllCat = asyncHandler(async (req, res) => {
  const categories = await Category.find({ deletedAt: null })
    .select("name") // only return needed fields

  if (categories.length === 0) {
    throw new ApiError(404, "No categories found");
  }

  res.status(200).json(
    new ApiResponse(200, categories, "Categories fetched successfully")
  );
});

const createCategoryByAdmin = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new ApiError(400, "Category name is required");
  }

  const existing = await Category.findOne({ name, deletedAt: null });
  if (existing) {
    throw new ApiError(400, "Category with this name already exists");
  }

  const category = await Category.create({ name: name.trim() });

  res.status(201).json(
    new ApiResponse(201, category, "Category created successfully")
  );
});

const updateCategoryByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const category = await Category.findOne({ _id: id, deletedAt: null });
  if (!category) {
    throw new ApiError(404, "Category not found or already deleted");
  }

  if (name) {
    // ✅ Check if another active category with same name exists
    const existingCategory = await Category.findOne({
      _id: { $ne: id }, // exclude current category
      name: name.trim(),
      deletedAt: null,
    });

    if (existingCategory) {
      throw new ApiError(400, "Category with this name already exists");
    }

    category.name = name.trim();
  }

  await category.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, category, "Category updated successfully")
  );
});

const deleteCategoryByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findOne({ _id: id, deletedAt: null });
  if (!category) {
    throw new ApiError(404, "Category not found or already deleted");
  }

  category.deletedAt = new Date();
  await category.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, null, "Category deleted successfully")
  );
});

const getAllCategoriesByAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, name } = req.query;

  const query = { deletedAt: null };
  if (name) {
    query.name = { $regex: name, $options: "i" };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [categories, total] = await Promise.all([
    Category.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Category.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        categories,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
      "Categories fetched successfully"
    )
  );
});


export { getAllCat, createCategoryByAdmin, updateCategoryByAdmin, deleteCategoryByAdmin, getAllCategoriesByAdmin};
