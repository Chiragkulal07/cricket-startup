import express from "express";

const router=express.Router();

router.post("/createleague",(req,res)=>{
    console.log("league created");
})

router.post("/create-team",(req,res)=>{
    console.log("team created")
})

router.get("/getleague",(req,res)=>{
    console.log("user created league fetched sucessfully")
});

router.get("/get-team",(req,res)=>{
    console.log("user created team fetched sucessfully")
}   );

router.post("/join-team",(req,res)=>{

    
    console.log("user joined team sucessfully ")
})


export default router;