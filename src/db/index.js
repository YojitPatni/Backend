import mongoose from "mongoose";

import {DB_NAME} from "../constants.js";

const connectDB =async () => {
    try{
        const connectInstance=await mongoose.connect(`${process.env.MONGODB_URI}`)
        console.log(`\n MongoDb connected with DB host: ${connectInstance.connection.host} `)
    }
    catch(error){
        console.error("Error connecting to MongoDB:", error);
        process.exit(1); // Exit the process with failure.
    }   
}

export default connectDB
//always use try catch and async await for connection to database