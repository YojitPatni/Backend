import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({//for json data
    limit: "16kb"
}))

app.use(express.urlencoded({//for encoding of urls or take data from url

    extended:true,
    limit:"16kb"
}))

app.use(express.static("public"))//for pdfs save to public folder



app.use(cookieParser())




export { app }