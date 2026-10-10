import mongoose from "mongoose";const {Schema,model}=mongoose;const ref=name=>({type:Schema.Types.ObjectId,ref:name,required:true,index:true});
export const CATS=["Organic","Recyclable","Hazardous","E-Waste","Biomedical","General"];
export const Profile=model("Profile",new Schema({name:{type:String,default:"Demo User",trim:true,maxlength:80},kind:{type:String,enum:["Individual","Organization"],required:true},environment:{type:String,required:true},area:String},{timestamps:true}));
const ItemSchema=new Schema({object:String,category:{type:String,enum:CATS,required:true},confidence:{type:Number,min:0,max:1},action:String},{_id:false});
export const Scan=model("Scan",new Schema({profileId:ref("Profile"),environment:String,mode:String,items:[ItemSchema]},{timestamps:true}));
export const Correction=model("Correction",new Schema({profileId:ref("Profile"),predicted:{type:String,enum:CATS},corrected:{type:String,enum:CATS},confidence:Number},{timestamps:true}));
export const Pickup=model("Pickup",new Schema({profileId:ref("Profile"),collector:String,category:{type:String,enum:CATS},status:{type:String,default:"Created (prototype)"}},{timestamps:true}));
export const Chat=model("Chat",new Schema({profileId:{type:Schema.Types.ObjectId,ref:"Profile",index:true},sessionId:{type:String,index:true},messages:[{role:String,content:String,at:{type:Date,default:Date.now}}]},{timestamps:true}));
