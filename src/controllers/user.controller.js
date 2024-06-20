import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiErrror.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefereshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const assessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken =refreshToken;

        await user.save({validateBeforeSave:false})
        return {assessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh token");
    }
}



const registerUser = asyncHandler( async(req,res)=>{
    // get the user details fron frontend 
    //validation- not empty
    //check if user already exists: username
    // check for images ,  check for  avator
    // uplode images to cloudinary
    // create user object - cretae entry in db
    // remove passowrd and refresh token filed form responce
    // check for user creation
    // return res
    const {fullname, email, username, password} = req.body
    console.log("email: ", email);
    // if(fullname==="")
    //     {
    //         throw new ApiError(400, "fullname is required!!")
    //     }
    if(
        [fullname, email, username, password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400, "all fields are required");
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "user with email or username already exists");
    }
     const avatorLocalPath = req.files?.avator[0]?.path;
    //  const coverimageLocalPath = req.files?.coverimage[0]?.path;

    let coverimageLocalPath;
    if(req.files && Array.isArray(req.files.coverimage) &&req.files.coverimage.length>0){
        coverimageLocalPath = req.files.coverimage[0].path;
    }
    
    
    
    
     if(!avatorLocalPath){
        throw new ApiError(400, "avator image is required");
    }
    
     const avator =await uploadOnCloudinary(avatorLocalPath);
     const coverimage =await uploadOnCloudinary(coverimageLocalPath);

    if(!avator){
        throw new ApiError(400, "avator file is required"); 
    }

    const user = User.create({
        fullname,
        avator: avator.url,
        coverimage: coverimage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser =  await User.findById(user._id).select(
        "-password -refreshToken"
    )  
    if(!createdUser){
        throw new ApiError(500, "something went wrong while regestering a user");
    }
    return ApiResponse(201).json(
        new ApiResponse(200, createdUser, "user registered sucessfully")
    )
})


const loginUser = asyncHandler(async (req, res)=>{
    //req body -> data
    //username or email
    //find the user 
    //password check 
    //access and refresh token
    //send cookies 
    //response of success ful login
    const {username, email, password} = req.body

    if(!(username || email)){
        throw new ApiError(400, "username or email is required for login")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(!user){
        throw new ApiError(404, "user ot found")
    }

    const ispassowrdValid = await user.isPasswordCorrect(password)
    if(ispassowrdValid ){
        throw new ApiError(401, "passowrd is in correct")
    }
    const {assessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const  loggedInUser = await User.findById(user._id).select("-passowrd -refreshToken");

    const options ={
        httpOnly:true,
        secure:true,
    }

    return res.
    status(200).
    cookie("accessToken", assessToken, options).
    cookie("refreshToken", refreshToken, options).
    json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "user logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken:undefined
            }
            
        },
        {
            new:true
        }
    )
    const options ={
        httpOnly:true,
        secure:true,
    }
    return res.
    status(200).
    clearCookie("accessToken",options).
    clearCookie("refreshToken",options).json(
        new ApiResponse(200, {}, "user loged out successfully")
    )

})

export {registerUser, 
    loginUser,
    logoutUser
    }