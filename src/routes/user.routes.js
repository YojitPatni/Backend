import { Router } from "express";

import { 
    changeCurruntPassword,
    getCurruntUser,
    getUserChannelProfile,
    getWatchHistory, 
    loginUser, 
    logOutUser, 
    registerUser, 
    updateAccountDetail, 
    updateAvatar, 
    updateCoverImage
 } from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import multer from "multer";


const router=Router();

router.route("/register").post(
    upload.fields([
        {name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes

router.route("/logout").post(verifyJWT, logOutUser)

router.route("/change-password").post(verifyJWT,changeCurruntPassword)

router.route("/currunt-user").get(verifyJWT,getCurruntUser)

router.route("update-account-details").patch(updateAccountDetail)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateAvatar)

router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateCoverImage)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

router.route("/history").get(verifyJWT,getWatchHistory)



export default router;