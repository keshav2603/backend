import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiResponse } from "./ApiResponse";
import { ApiError } from "./ApiErrror";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
})


const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath)return null;
        //uplode the file on cloudinary

         const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        //file has been sucessful uploded;
        console.log("file  is uploded on cloudinary:  ", response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // removed the local saved file temp file as the uplode operation got failed 
        return null;
    }
}

const deleteFromCloudinary= async(publicId)=>{
    try {
        const result = await cloudinary.uploader.destroy(publicId, (err, res)=>{
            return new ApiResponse(200, result,"Old avatar deleted from Cloudinary")
        })
    } catch (error) {
        throw new ApiError(400, `Error deleting old avatar from Cloudinary:  ${error}`)
    }
}
export {uploadOnCloudinary, deleteFromCloudinary};