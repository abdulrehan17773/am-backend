import { asyncHandler } from "../utils/asyncHandler.js";
import  { User }  from "../models/user.model.js";
import  { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { handleUploadFile, deleteFileFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/email.js";


const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production"
};

const generateTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // push new token
  user.refreshTokens.push({ token: refreshToken });

  // ✅ allow max 2 devices
  if (user.refreshTokens.length > 2) {
    // remove oldest token
    user.refreshTokens.shift();
  }

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler( async (req, res) => {
    // Get data from request body
    console.log("call in");
    const { fullname,phone, email, password } = req.body;

    // Check if any of the fields are empty
    if ([fullname, email,phone, password].some(field => !field || field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }


    // Check if user already exists
    const userExists = await User.findOne({email: email.toLowerCase()});
    if(userExists){
        res.status(409);
        throw new ApiError(409, "User already exists");
    }

    // create new user
    const createUser = await User.create({fullname, phone, email: email.toLowerCase(), password, avatar:"https://res.cloudinary.com/dfnyh1dnu/image/upload/v1738077224/logo_ghgifr.webp"});

    // check user created successfully ans remove extra data
    const userCreated = await User.findById(createUser._id).select("-password -refreshTokens -__v -createdAt -updatedAt -deletedAt -otp -otp_time");
    if(!userCreated){
        res.status(500);
        throw new ApiError(500);
    }

    await sendEmail(userCreated.email, `Account Verification ${createUser.otp}`, `Sign-up successfully! Your OTP is ${createUser.otp}`)

    
    // return success message
    return res.status(201).json(
        new ApiResponse(201, userCreated, "User created successfully")
    )

});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // check if email and password are provided
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // find user
  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (!userExists) {
    throw new ApiError(404, "User not found");
  }

  // match password
  const passwordMatched = await userExists.comparePassword(password);
  if (!passwordMatched) {
    throw new ApiError(401, "Invalid password");
  }

  // check verification
  if (!userExists.verify) {
    return res.status(200).json(
      new ApiResponse(200, null, "Verification required")
    );
  }

  // generate tokens
  const { accessToken, refreshToken } = await generateTokens(userExists._id);

  // get sanitized user (without sensitive fields)
  const loginUser = await User.findById(userExists._id).select(
    "-password -refreshTokens -__v -createdAt -updatedAt -deletedAt -otp -otp_time"
  );

  if (!loginUser) {
    throw new ApiError(500, "Server error");
  }

  // send login email
  await sendEmail(loginUser.email, `Login`, `Login successfully!`);

  // return response with cookies
  return res.status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loginUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new ApiError(400, "No refresh token found in cookies");
  }

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { refreshTokens: { token: refreshToken } } // remove only current device session
  });

  res.status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

const tokenUpdate = asyncHandler(async (req, res) => {
  // get token from cookie or header
  const oldrefreshToken =
    req.cookies?.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!oldrefreshToken) {
    throw new ApiError(401, "Unauthorized Token");
  }

  let uid;
    try {
    ({ uid } = jwt.verify(oldrefreshToken, process.env.REFRESH_TOKEN_STRING));
    } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
    }
  // get user
  const user = await User.findOne({ uid }).select("+refreshTokens");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // verify token exists in refreshTokens array
  const tokenExists = user.refreshTokens.some(
    (rt) => rt.token === oldrefreshToken
  );
  if (!tokenExists) {
    throw new ApiError(401, "Unauthorized Token");
  }

  // generate new tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Token updated successfully"
      )
    );
});

const currentUser = asyncHandler( async (req, res) => {
    const user = req.user;

    return res.status(200).json(
        new ApiResponse(200, user, "User fetched successfully")
    )
});

const verifyUser = asyncHandler(async (req, res) => {
  const { otp, email } = req.body;

  if (!otp || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otpTime = user.otp_time;
  const currentTime = Date.now();

  if (currentTime > otpTime) {
    throw new ApiError(401, "OTP expired");
  }

  if (user.otp != otp) {
    throw new ApiError(401, "Invalid OTP");
  }

  // update user verification
  user.otp = null;
  user.otp_time = null;
  user.verify = true;
  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findOne({ email }).select(
    "-password -refreshTokens -__v -createdAt -updatedAt -deletedAt -otp -otp_time"
  );

  const { accessToken, refreshToken } = await generateTokens(user._id);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser, accessToken, refreshToken },
        "Token verification successful"
      )
    );
});

const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { otp, otp_time } = await user.defineOtp();

  user.otp = otp;
  user.otp_time = otp_time;
  await user.save({ validateBeforeSave: false });

  await sendEmail(
    user.email,
    `Resend OTP ${user.otp}`,
    `Your OTP is ${user.otp}`
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "OTP sent successfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { fullname, phone } = req.body;
  const user = req.user;

  if (!fullname && !phone) {
    throw new ApiError(400, "At least one field (name or phone) is required");
  }

  let updated = false;

  if (fullname && user.fullname !== fullname) {
    user.fullname = fullname;
    updated = true;
  }

  if (phone && user.phone !== phone) {
    user.phone = phone;
    updated = true;
  }

  if (!updated) {
    throw new ApiError(400, "No changes detected");
  }

  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(user._id).select(
    "-password -refreshTokens -__v -createdAt -updatedAt -deletedAt -otp -otp_time"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

const updateCurrency = asyncHandler(async (req, res) => {
  const { currency } = req.body;
  const user = req.user;

  if (!currency) {
    throw new ApiError(400, "Currency is required");
  }

  const allowedCurrencies = ["USD", "GBP", "EUR", "PKR"];
  if (!allowedCurrencies.includes(currency)) {
    throw new ApiError(400, "Invalid currency");
  }

  if (user.currency === currency) {
    throw new ApiError(400, "Please select a different currency");
  }

  user.currency = currency;
  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(user._id).select(
    "-password -refreshTokens -__v -createdAt -updatedAt -deletedAt -otp -otp_time"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Currency updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const user = req.user;
  const avatar = req.file;
  const oldAvatar = user.avatar;

  if (!avatar) {
    res.status(400);
    throw new ApiError(400, "Please upload an image");
  }

  // 🔹 Upload new avatar
  const uploadedAvatar = await handleUploadFile(avatar.path);
  if (!uploadedAvatar?.url) {
    res.status(500);
    throw new ApiError(500, "Image upload failed");
  }

  // 🔹 Update user
  user.avatar = uploadedAvatar.url;
  const updatedUser = await user.save({ validateBeforeSave: false });

  // 🔹 Delete old avatar (skip default)
  if (
    oldAvatar &&
    oldAvatar !==
      "https://res.cloudinary.com/dfnyh1dnu/image/upload/v1738077224/logo_ghgifr.webp"
  ) {
    await deleteFileFromCloudinary(oldAvatar);
  }

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "Avatar updated successfully")
  );
});

const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { uid } = req.user;

  if (!oldPassword || !newPassword) {
    res.status(400);
    throw new ApiError(400, "All fields are required");
  }

  if (oldPassword === newPassword) {
    res.status(400);
    throw new ApiError(400, "Please enter a different password");
  }

  // 🔹 Fetch user WITH password (because select: false in schema)
  const user = await User.findOne({ uid }).select("+password");

  if (!user) {
    res.status(404);
    throw new ApiError(404, "User not found");
  }

  // 🔹 Verify old password
  const passwordMatched = await user.comparePassword(oldPassword);
  if (!passwordMatched) {
    res.status(401);
    throw new ApiError(401, "Invalid old password");
  }

  // 🔹 Clear all previous sessions (logout from all devices)
  user.refreshTokens = [];

  // 🔹 Set new password (pre-save hook will hash it)
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // 🔹 Generate new tokens for current session
  const { refreshToken, accessToken } = await generateTokens(user._id);

  // 🔹 Prepare safe user object
  const updatedUser = await User.findById(user._id).select(
    "-password -refreshTokens -__v -createdAt -updatedAt -deletedAt -otp -otp_time"
  );

  // 🔹 Send email
  await sendEmail(
    updatedUser.email,
    `Change Password`,
    `Your password was updated successfully!`
  );

  // 🔹 Send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { updatedUser, accessToken, refreshToken },
        "Password updated successfully"
      )
    );
});

const sendForgetPassword = asyncHandler( async (req, res) => {
    const {email} = req.body;
    
    if(!email){
        res.status(400);
        throw new ApiError(400, "Please enter your email")
    }
    
    const user = await User.findOne({email});
    if(!user){
        res.status(404);
        throw new ApiError(404, "User not found");
    }
    
    const {otp, otp_time} = await user.defineOtp();
    
    user.otp = otp;
    user.otp_time = otp_time;
    await user.save({ validateBeforeSave: false });
    
    await sendEmail(user.email, `Forget Password`, `Update your password using this link http://127.0.0.1:4000/api/v1/users/forget/${user.email}/${user.otp}`)
    
    res.status(200).json(
        new ApiResponse(200, null, "Email sent successfully")
    )

});

const checkExpiryForget = asyncHandler( async (req, res) => {
    const {email, token} = req.params;

    if(!email || !token) {
        res.status(400);
        throw new ApiError(400, "missing Data");
    }

    const user = await User.findOne({email});

    if(!user){
        res.status(404);
        throw new ApiError(404, "User not found");
    }

    const currentTime = Date.now();

    if(currentTime > user.otp_time){
        res.status(401);
        throw new ApiError(401, "OTP expired");
    }

    if (user.otp !== Number(token)) {
        res.status(401);
        throw new ApiError(401, "Invalid OTP");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "OTP verified successfully")
    )
});

const forgetPassword = asyncHandler( async (req, res) => {
    const {email, token, newPassword} = req.body;

    if(!newPassword || !email || !token){
        res.status(400);
        throw new ApiError(400, "Missing Data");
    }
    
    
    const newUser = await User.findOne({email});

    if(!newUser){
        res.status(404);
        throw new ApiError(404, "User not found");
    }
    const passwordMatched = await newUser.comparePassword(newPassword);
    
    const currentTime = Date.now();

    if(currentTime > newUser.otp_time){
        res.status(401);
        throw new ApiError(401, "OTP expired");
    }

    if(newUser.otp != Number(token)){
        res.status(401);
        throw new ApiError(401, "Invalid otp");
    }

    if(passwordMatched){
        res.status(400);
        throw new ApiError(400, "Please enter different password");
    }

    newUser.password = newPassword;
    newUser.otp = null;
    newUser.otp_time = null;
    newUser.verify = true;
    await newUser.save({validateBeforeSave: false})
    
    await sendEmail(newUser.email, `Change Password`, `Your password Updated successfully!`)

    res.status(200).json(
        new ApiResponse(200, null, "Password updated successfully")
    )
    
});

const createUserByAdmin = asyncHandler(async (req, res) => {
  const { fullname, email, phone, role, password } = req.body;

  if (!fullname || !email || !role || !password) {
    res.status(400);
    throw new ApiError(400, "Missing required fields");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new ApiError(400, "User already exists with this email");
  }

  const newUser = await User.create({
    fullname,
    email,
    phone,
    role,
    password,
    verify: true, // Admin-created users are auto-verified
  });

  if (!newUser) {
    res.status(500);
    throw new ApiError(500, "User creation failed");
  }

  res.status(201).json(
    new ApiResponse(201, newUser, "User created successfully")
  );
});

const updateUserByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullname, phone, role, verify } = req.body;

  // 🔹 Find only active (non-deleted) users
  const user = await User.findOne({ _id: id, deletedAt: null });
  if (!user) {
    res.status(404);
    throw new ApiError(404, "User not found or already deleted");
  }

  if (fullname) user.fullname = fullname;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (verify !== undefined) user.verify = verify;

  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, user, "User updated successfully")
  );
});

const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new ApiError(404, "User not found");
  }

  if (user.deletedAt) {
    res.status(400);
    throw new ApiError(400, "User already deleted");
  }

  user.deletedAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, null, "User deleted successfully")
  );
});

const getAllUsersByAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, email, role, verify } = req.query;

  const query = { deletedAt: null }; // only active users

  if (email) {
    query.email = { $regex: email, $options: "i" }; // case-insensitive
  }

  if (role) {
    query.role = role;
  }

  if (verify !== undefined) {
    query.verify = verify === "true"; // convert string to boolean
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password -refreshTokens -__v -otp -otp_time") // exclude sensitive fields
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }), // latest first
    User.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    }, "Users fetched successfully")
  );
});


export { registerUser, loginUser, logout, tokenUpdate, currentUser, verifyUser, resendOtp, updateProfile, updateCurrency, updateAvatar, updatePassword,forgetPassword, sendForgetPassword, checkExpiryForget, createUserByAdmin, updateUserByAdmin, deleteUserByAdmin, getAllUsersByAdmin };