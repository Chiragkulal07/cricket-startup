import express from "express";

const router =express.Router();


router.get("/",(req,res)=>{
    console.log("fetching all history of score in from db .....")
});

export default router;