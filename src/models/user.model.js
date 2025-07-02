import mongoose from "mongoose"

import jwt from "jsonwebtoken"

import bcrypt from "bcrypt"

const userSchema = new mongoose.Schema({
    id:{
        type:Number,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },

    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },

    fullname:{
        type:Number,
        required:true,
        trim:true,
        index:true
    },

    avatar:{
        type:String,
        required:true,
    },

    coverImage:{
        type:String,
        required:true,
    },

    watchHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Video"
    }
    ],

    password:{
        type:String,
        required:[true,"Password is required"]
    },
    refreshToken:{
        type:String
    }
},{timestamps:true})

userSchema.pre("save",async function(next) {//to en
   if(!this.password.isModified("password")) {
    return next()
}
     this.password=bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password,this.password)   
}

userSchema.methods.generateRefreshToken = function(password) {
    jwt.sign({
        _id:this._id,
        email:this.email,
        fullname:this.fullname

    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
)
}

userSchema.methods.generateAccessToken = function(password) {
    jwt.sign({
        _id:this._id,
        email:this.email,
        fullname:this.fullname

    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

export const User = mongoose.model("User",userSchema)

//need pre hook from mongoose