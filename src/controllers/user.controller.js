import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


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

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401,"Unauthorized request")
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

    const user=await User.findById(decodedToken?._id)

    if(!user){
        throw new apiError(401,"Invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new apiError(401,"Invalid refresh token")
    }

    const options={
        httpOnly:true,
        secure:true
     };

    const {accessToken,newRefreshToken}= await generateAccessAndRefreshToken(user._id)

     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newRefreshToken,options)
     .json(
        new apiResponse(200,{
            accessToken,refreshToken:newRefreshToken
        },"Access Token Refreshed")
     )
    } catch (error) {
        throw new apiError(401,"Something went Wrong")
    }

})

const changeCurruntPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await User.findById(req.user?._id)

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new apiError(400,"Password is incorrect")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new apiResponse(200,{},"Password change successfully"))
    

})

const getCurruntUser=asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new apiResponse(200,req.user,"Currunt user fetched successfully"))
})

const updateAccountDetail=asyncHandler(async(req,res)=>{
    const {username,email}=req.user

    if(!username || !email){
        throw new apiError(400,"All fields are required")
    }
    const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullname:fullname,
                    email:email
                }
            },
            {new:true}
        ).select("-password")

        return res.status(200)
        .json(new apiResponse(200,user,"Account details Updated"))
})

const updateAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.files?.path

    if(!avatarLocalPath){
        throw new apiError(400,"Avatar not found")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new apiError(400,"Error while uploading files")
    }

    const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar:avatar.url
                }
            },
            {new:true}
        ).select("-password")

        return res.status(400)
        .json(new apiResponse(200,user,"Avatar updated successfully"))

})

const updateCoverImage=asyncHandler(async(req,res)=>{
    const coverLocalPath=req.files?.path

    if(!coverLocalPath){
        throw new apiError(400,"Cover image not found")
    }

    const coverImage=await uploadOnCloudinary(coverLocalPath)
    if(!coverImage.url){
        throw new apiError(400,"Error while uploading files")
    }

    const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage:coverImage.url
                }
            },
            {new:true}
        ).select("-password")

        return res.status(400)
        .json(new apiResponse(200,user,"Cover Image updated successfully"))

})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username.trim()){
        throw new apiError(400,"Username doesnot exist")
    }

    // User.find({username})
    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"Subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subcriber",
                as:"SubscribedTo"
            }
        },{
            $addFields:{
                subscribersCount:{
                    $size:"$Subscribers"
                },
                subscriberedToCount:{
                    $size:"$SubscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$Subscribers.subcriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },{
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                subscriberedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    
    if(!channel?.length){
        throw new apiError(404,"Channel doesnt exist")
    }

    return res.status(200)
    .json(new apiResponse(200,channel[0],"User channel fetched successfully"))
})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user= await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"user",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },{
                        $addFields:{
                            ownwe:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    res.status(200)
    .json(new apiResponse(200,user[0].watchHistory,"Watch history fetched successfully"))
})

export { 
     registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurruntPassword,
    getCurruntUser,
    updateAccountDetail,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
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