import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiErrror.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefereshTokens = async( userId ) => {
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

const registerUser = asyncHandler( async (req, res) => {
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
    let avatorLocalPath;
    if(req.files && Array.isArray(req.files.avator) && req.files.avator.length>0){
        avatorLocalPath = req.files.avator[0].path;
    }
    //  const avatorLocalPath = req.files?.avator[0]?.path;
    //  const coverimageLocalPath = req.files?.coverimage[0]?.path;

    let coverimageLocalPath;
    if(req.files && Array.isArray(req.files.coverimage) &&req.files.coverimage.length>0){
        coverimageLocalPath = req.files.coverimage[0].path;
    }
    //  if(!avatorLocalPath){
    //     throw new ApiError(400, "avator image is required");
    // }
    
     const avator =await uploadOnCloudinary(avatorLocalPath);
     const coverimage =await uploadOnCloudinary(coverimageLocalPath);

    // if(!avator){
    //     throw new ApiError(400, "avator file is required"); 
    // }

    const user = await User.create({
        fullname,
        avatar: avator?.url || "",
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
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler( async (req, res) => {
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
        throw new ApiError(404, "user not found")
    }

    const ispassowrdValid = await user.isPasswordCorrect(password)
    if(!ispassowrdValid ){
        throw new ApiError(401, "passowrd is incorrect : ",ispassowrdValid)
    }
    const {assessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const  loggedInUser = await User.findById(user._id).select("-password -refreshToken");

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
                user: loggedInUser, assessToken, refreshToken
            },
            "user logged in successfully"
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {
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

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken ||req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorised request");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user =  await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "invalid refresh token");
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "refresh token is expired or used");
        }
        const options ={
            httpOnly:true,
            secure:true,
        }
        const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id);
        return res.status(200)
        .cookie("accessToken", accessToken, options).
        cookie("refreshToken", refreshToken, options).json(
            new ApiResponse(200,
                {accessToken, refreshToken},
                "access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message||"invalid refresh token")
    }   
})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword}= req.body
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(401, "old password is incorrect!!");
    }
    user.password=newPassword;
    await user.save({validateBeforeSave:false});
    return res
    .status(200)
    .json(new ApiResponse(201, {}, "password change succesfully"));
})

const getCurrentUser = asyncHandler( async(req, res) => {
    return res.status(200)
    .json(new ApiResponse(200, req.user, "current user fetch successfully!"));
})

const  updateAccountDetail = asyncHandler( async(req, res) => {
    const {fullName, email} = req.body
    if(!fullName || !email){
        throw new ApiError(401,"allfiled are required");
    } 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new :true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "account details updated"));
})

const updateUserAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "error while uploding the avatar");
    }

// TODO :   DELETING IMAGE FROM CLOUDINARY

    // const currentAvatarUrl = user.avatar;
    // const currentAvatarPublicId = currentAvatarUrl?.split('/').pop().split('.')[0];

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password");

    // if (currentAvatarPublicId) {
    //     await deleteFromCloudinary(currentAvatarPublicId);
    // }

    return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar image updated successfully"));
})

const updateUserCoverImage = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400, "error while uploding the coverImage");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverimage:coverImage.url
            }
        },
        {new:true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"));
})

const getUserChannelProflie = asyncHandler(async(req, res) => {
    const {username} = req.params;
    if(!username?.trim()){
        throw new ApiError(400, "username  is missing");
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            },
        },    
        {   
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }

            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1,
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404, "channel does not exist");
    }

    return res.status(200)
    .json(new ApiResponse(200, channel[0],"user channel fetched successfully"));
})

const getWatchHistory = asyncHandler( async(req, res)=>{
    const user =await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id),
            }
        },
        {
            $lookup:{
                from: "videos",
                localField:"watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as: "owner",
                            pipeline:[
                               { $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }}
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watchHistory fetched successfully"
        )
    )
})

export {registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
    updateAccountDetail,
    getUserChannelProflie,
    getWatchHistory


}