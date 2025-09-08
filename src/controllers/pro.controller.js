import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../models/pro.model.js";
import { Category } from "../models/cat.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { handleUploadFile, deleteFileFromCloudinary } from "../utils/cloudinary.js"; 


const getFeatured = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isFeatured: true,
    isActive: true,
    deletedAt: null,
    totalStock: { $gt: 0 }, // ✅ only products with stock
  })
    .populate("category", "name") // only get category name
    .select("name price discount images _id totalStock") // only lightweight fields
    .limit(12)
    .lean();

  const featuredProducts = products.map((p) => ({
    _id: p._id,
    name: p.name,
    price: p.price,
    discount: p.discount,
    finalPrice: Number((p.price - (p.price * p.discount) / 100).toFixed(2)),
    image: p.images?.length > 0 ? p.images[0].url : null,
    category: p.category?.name || null,
    totalStock: p.totalStock,
  }));

  res.status(200).json(
    new ApiResponse(200, featuredProducts, "Featured products fetched successfully")
  );
});

const getProDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid product ID");
  }

  const product = await Product.findOne({
    _id: id,
    isActive: true,
    deletedAt: null,
  })
    .populate("category", "name")
    .lean({ virtuals: true });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const productDetails = {
    _id: product._id,
    name: product.name,
    description: product.description,
    price: product.price,
    discount: product.discount,
    finalPrice: Number(product.finalPrice.toFixed(2)),
    images: product.images,
    category: product.category?.name || null,
    totalStock: product.totalStock,
    variants: product.variants,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };

  res.status(200).json(
    new ApiResponse(200, productDetails, "Product details fetched successfully")
  );
});

const getAllPro = asyncHandler(async (req, res) => {
  const { search, minPrice, maxPrice, category, page = 1, limit = 10 } = req.query;

  let query = {
    isActive: true,
    deletedAt: null,
    totalStock: { $gt: 0 },
  };

  // 🔹 Search by name
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  // 🔹 Price filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // 🔹 Category filter (supports both id and name)
  if (category) {
    let catDoc = null;
    if (category.match(/^[0-9a-fA-F]{24}$/)) {
      // category is ObjectId
      catDoc = await Category.findOne({ _id: category, deletedAt: null }).select("_id");
    } else {
      // category is name
      catDoc = await Category.findOne({ name: category, deletedAt: null }).select("_id");
    }
    if (catDoc) {
      query.category = catDoc._id;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, totalProducts] = await Promise.all([
    Product.find(query)
      .populate("category", "name")
      .select("name price discount images _id totalStock")
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Product.countDocuments(query),
  ]);

  const formattedProducts = products.map((p) => ({
    _id: p._id,
    name: p.name,
    price: p.price,
    discount: p.discount,
    finalPrice: Number((p.price - (p.price * p.discount) / 100).toFixed(2)),
    image: p.images?.length > 0 ? p.images[0].url : null,
    category: p.category?.name || null,
    totalStock: p.totalStock,
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        products: formattedProducts,
        pagination: {
          total: totalProducts,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalProducts / Number(limit)),
        },
      },
      "Products fetched successfully"
    )
  );
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discount, category, variants, isFeatured } =
    req.body;

  // ✅ validate required fields
  if (!name || !price || !category) {
    throw new ApiError(
      400,
      "Name, price, and category are required"
    );
  }

  // ✅ validate category exists
  const catDoc = await Category.findOne({ _id: category, deletedAt: null });
  if (!catDoc) throw new ApiError(404, "Category not found");

  // ✅ check if product with same name exists
  const existing = await Product.findOne({
    name: name.trim(),
    deletedAt: null,
  });
  if (existing) throw new ApiError(400, "Product with this name already exists");

  // ✅ upload images to cloudinary
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "At least one image is required");
  }

  const uploadedImages = [];
  for (const file of req.files) {
    const uploadRes = await handleUploadFile(file.path);
    if (uploadRes) {
      uploadedImages.push({
        url: uploadRes.secure_url,
        alt: file.originalname || "",
      });
    }
  }

  if (uploadedImages.length === 0) {
    throw new ApiError(500, "Failed to upload product images");
  }

  // ✅ create product
  const product = await Product.create({
    name,
    description,
    price,
    discount,
    category,
    images: uploadedImages,
    variants,
    isFeatured: isFeatured || false,
  });

  res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, discount, category } = req.body;

  const product = await Product.findById(id);
  if (!product || product.deletedAt) throw new ApiError(404, "Product not found");

  // optional: validate category exists
  if (category) {
    const catDoc = await Category.findById(category);
    if (!catDoc || catDoc.deletedAt) throw new ApiError(404, "Category not found");
    product.category = category;
  }

  if (name) product.name = name;
  if (description) product.description = description;
  if (price !== undefined) product.price = price;
  if (discount !== undefined) product.discount = discount;

  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

const toggleActive = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product || product.deletedAt) throw new ApiError(404, "Product not found");

  product.isActive = !product.isActive;
  await product.save();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isActive: product.isActive },
        "Product active status toggled"
      )
    );
});

const toggleFeatured = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product || product.deletedAt) throw new ApiError(404, "Product not found");

  product.isFeatured = !product.isFeatured;
  await product.save();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isFeatured: product.isFeatured },
        "Product featured status toggled"
      )
    );
});

const updateVariants = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { variants } = req.body; // array [{size,color,stock}, ...]

  if (!Array.isArray(variants))
    throw new ApiError(400, "Variants must be an array");

  const product = await Product.findById(id);
  if (!product || product.deletedAt) throw new ApiError(404, "Product not found");

  product.variants = variants;
  await product.save(); // pre-save hook recalculates totalStock

  res
    .status(200)
    .json(new ApiResponse(200, product, "Variants updated successfully"));
});

const addImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.file?.path) throw new ApiError(400, "Image file is required");

  const uploadRes = await handleUploadFile(req.file.path);
  if (!uploadRes) throw new ApiError(500, "Failed to upload image");

  const product = await Product.findById(id);
  if (!product || product.deletedAt) throw new ApiError(404, "Product not found");

  product.images.push({
    url: uploadRes.secure_url,
    alt: req.body.alt || "",
  });

  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Image added successfully"));
});

const removeImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { url } = req.body; // remove based on url

  if (!url) throw new ApiError(400, "Image URL is required");

  const product = await Product.findById(id);
  if (!product || product.deletedAt) throw new ApiError(404, "Product not found");

  const imageIndex = product.images.findIndex((img) => img.url === url);
  if (imageIndex === -1) throw new ApiError(404, "Image not found");

  await deleteFileFromCloudinary(url);

  product.images.splice(imageIndex, 1);
  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Image removed successfully"));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) throw new ApiError(404, "Product not found");
  if (product.deletedAt) throw new ApiError(400, "Product already deleted");

  product.deletedAt = new Date();
  await product.save();

  res.status(200).json(new ApiResponse(200, {}, "Product deleted successfully"));
});

const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const { search, isActive, isFeatured, includeDeleted, page = 1, limit = 10 } = req.query;

  let query = {};

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }
  if (isFeatured !== undefined) {
    query.isFeatured = isFeatured === "true";
  }
  if (includeDeleted !== "true") {
    query.deletedAt = null; // exclude deleted by default
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select("name price discount isActive isFeatured images category createdAt") // only lightweight fields
      .lean(),
    Product.countDocuments(query),
  ]);

  // 🔹 Keep only first image
  const lightProducts = products.map((p) => ({
    ...p,
    image: p.images && p.images.length > 0 ? p.images[0] : null,
    images: undefined, // remove images array
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        products: lightProducts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      "Admin products fetched successfully"
    )
  );
});

const getSingleProductAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid product ID");
  }

  const product = await Product.findById(id)
    .populate("category", "name")
    .lean({ virtuals: true });

  if (!product) throw new ApiError(404, "Product not found");

  res.status(200).json(
    new ApiResponse(200, product, "Product details fetched successfully (admin)")
  );
});


export { getFeatured, getAllPro, getProDetails, createProduct, updateProduct, toggleActive, toggleFeatured, updateVariants, addImage, removeImage, deleteProduct, getAllProductsAdmin, getSingleProductAdmin };
