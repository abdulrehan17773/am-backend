import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../models/pro.model.js";
import { Category } from "../models/cat.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";


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

export { getFeatured, getAllPro, getProDetails };
