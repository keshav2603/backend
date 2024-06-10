import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const vedioSchema= new mongoose.Schema(
    {
        vediofile:{
            type:String, //cloudinary url
            reqiured: true,
        },
        thumbnail:{
            type:String, //cloudinary url
            reqiured: true,
        },
        title:{
            type:String, 
            reqiured: true,
        },
        discription:{
            type:String, 
            reqiured: true,
        },
        duration:{
            type:Number,  //cloudinary url
            reqiured: true,
        },
        views:{
            type:Number,
            default:0,
        },
        isPublished:{
            type:Boolean,
            default: true,
        },
        owner:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
        

},{timestamps:true});


vedioSchema.plugin(mongooseAggregatePaginate);
export const Vedio = mongoose.model("Vedio",vedioSchema);