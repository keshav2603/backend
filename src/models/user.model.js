import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new mongoose.Schema(
    {
        username:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname:{
            type: String,
            required: true,
            index:true,
            trim: true,
        },
        avatar:{
            type: String, // cloudinary url
            required:true,
        },
        coverimage:{
            type: String, // cloudinary url    
        },
        watchHistory:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref: "Vedio"
            }
        ],
        password:{
            type: String,
            required:[true, "password is required"],
        },
        refreshToken:{
            type:String,
        }
},{timestamps:true});


userSchema.pre("save", async function (next) {
    if(!this.isModified("password"))return next();
    this.password = bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect= async function
(password){

}

export const User = mongoose.model("User",userSchema);