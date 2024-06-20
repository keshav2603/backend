import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

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

export {uploadOnCloudinary};