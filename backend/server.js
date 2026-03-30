import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import dashboardrouter from "./dashboardroute/dashboardroute.js";
import auctionrouter from "./auctionroute/auctionroute.js";
import initializeSocket from "./socket/socketManager.js";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(bodyParser.json());
app.use("/dashbaord", dashboardrouter);
app.use("/auction", auctionrouter);

const io = initializeSocket(server);

app.get("/", (req, res) => {
    res.send("server is running properly");
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`server is running in http://localhost:${PORT}`);
});