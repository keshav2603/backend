import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiErrror.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "user with email or username already exists");
    }
     const avatorLocalPath = req.files?.avator[0]?.path;
     const coverimageLocalPath = req.files?.coverimage[0]?.path;
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

export {registerUser}