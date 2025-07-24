import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"


const generateAccessAndRefreshToken=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave:false })

        return {accessToken,refreshToken}
    }
    catch(error){
        throw new apiError(500,"Something went wrong while generating token")
    }
}

const registerUser=asyncHandler(async(req,res)=>{
    const {fullname,email,username,password}= req.body
    //console.log("email: ",email);

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
    console.log(req.files)

    const avatarLocalPath=req.files?.avatar[0]?.path

    let coverLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverLocalPath=req.files.coverImage[0].path
    }

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

    const createUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createUser){
        throw new apiError(500,"Something went wrong")
    }

    return res.status(201).json(
        new apiResponse(200,createUser,"User Registered successfully")
    )

})

const loginUser=asyncHandler(async(req,res)=>{
    //take data from req body
    //user name or email
    //find user
    //check pass (validation)
    //access and refresh token
    //send cookies
    //return res
    //imp=>dont use User everywhere as it is the obj od f mongo


    const{email,username,password}=req.body

    if(!username&&!email){
        throw new apiError(400,"email or username is required")
    }
    if(!password){
        throw new apiError(400,"Password is required")
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new apiError(404,"User not found")
    }
    

    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new apiError(401,"Password incorrect")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

     const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

     const options={
        httpOnly:true,
        secure:true
     };
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",refreshToken,options)
     .json(
        new apiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },"user logged in successfully")
     )

})

const logOutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        }
    )

    const options={
        httpOnly:true,
        secure:true
     };
     return res.status(200)
     .clearCookie("accessToken",options)
     .clearCookie("refreshToken",options)
     .json(new apiResponse(200,{},"User loggedout Successfully"))
})

export { registerUser,
    loginUser,
    logOutUser
 }

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