import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"


const registerUser=asyncHandler(async(req,res)=>{
    const {fullname,email,username,password}= req.body
    console.log("email: ",email);

    // if(fullName === "" ){
    //     throw new apiError(400,"Full name is required")
    // }
    // or you can do

    if(
        [fullname,email,username,password].some(
            (field)=>field?.trim()===""
        )
    ){
        throw new apiError(400,"All fields are required")
    }

    const exist=await User.findOne({
        $or:[{ email },{ username }]
    })

    if(exist){
        throw new apiError(409,"User with email or username already exist")
    }

    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverLocalPath=req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new apiError(400,"Avatar not found")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverLocalPath)

    if(!avatar){
        throw new apiError(400,"Avatar not found")
    }

    const user =await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createUser=User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createUser){
        throw new apiError(500,"Something went wrong")
    }

    return res.status(201).json(
        new apiResponse(200,createUser,"User Registered successfully")
    )

})

export { registerUser }

/*
Steps follow to register a user
1.	get its data like user name pass email etc from sign up according to modals
2.	validation not empty, some() , include()
3.	check if user already exist with email or username
4.	check for images and avatar
5.	upload them to cloudinary,check for avatar
6.	create user obj => create entry in db
7.	remove pass and refresh token field
8.	check for user creation
9.	return res
*/