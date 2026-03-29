import express from "express";
import bodyParser from "body-parser";
import cors from "cors"
import dashboardrouter from "./dashboardroute/dashboardroute.js"

const app=express();

app.use(cors());
app.use(bodyParser.json());
app.use("/dashbaord",dashboardrouter);

app.get("/",(req,res)=>{

    res.send("server is running properly")
});

app.listen(3000,()=>{

    console.log("server is running in http://localhost:3000")
})