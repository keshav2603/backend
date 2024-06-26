import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema= new mongoose.Schema(
    {
        videofile:{
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
export const Video = mongoose.model("Video",videoSchema);