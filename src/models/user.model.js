import mongoose from "mongoose"

import jwt from "jsonwebtoken"

import bcrypt from "bcrypt"

const userSchema = new mongoose.Schema({
    

    username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
            index: true
        },

    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },

    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true
    },

    avatar:{
        type:String,
        required:true,
    },

    coverImage:{
        type:String
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
   if(!this.isModified("password")) {
    return next()
}
     this.password=await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password,this.password)   
}

userSchema.methods.generateRefreshToken = function(password) {
    return jwt.sign({
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
    return jwt.sign({
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