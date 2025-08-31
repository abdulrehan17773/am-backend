import ApiResponse from "../utils/ApiResponse.js";

const Hello = async (req, res) => {
    res.status(200).json(
        new ApiResponse(200, "Hello World")
    )
};

// ✅ Export all handlers
export {
  Hello
};
