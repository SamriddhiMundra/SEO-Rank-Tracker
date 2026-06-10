//add a keyword to track
import KeywordTracking from "../models/keywordTracking.js";
import { keywordTracking } from "../services/keywordTrackingService.js";
export const addKeyword = async (req, res) => {
    try{
        const { keyword, url } = req.body;
        if(!keyword || !url){
            return res.status(400).json({success: false, message: "Keyword and URL are required" });
        }
        //Extract domain from URL
        let domain;
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            domain = urlObj.hostname.replace("www.", "");
        } catch (err) {
            return res.status(400).json({ success: false, message: "Invalid URL format" });
        }

        //check if keyword is already being tracked for this user and domain
        const existing = await KeywordTracking.findOne({ userId: req.userId, keyword: keyword.toLowerCase().trim(), domain });
        if(existing){
            return res.status(400).json({ success: false, message: "Keyword is already being tracked for this domain" });
        }

        //create tracking entry
        const tracking = await KeywordTracking.create({
            userId: req.userId,
            keyword: keyword.toLowerCase().trim(),
            url: url.startsWith('http') ? url : `https://${url}`,
            domain,
            status: "checking",
        });
        res.status(201).json({ success: true, message: "Keyword tracking started", data: tracking });
        keywordTracking(tracking);
        
    }
    catch(err){
        console.error("Add Keyword Error:", err.message);
        if(err.code === 11000){ //duplicate key error
            return res.status(400).json({ success: false, message: "Keyword is already being tracked for this domain" });
        }
         res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//get all tracked keywords for a user
export const getKeywords = async (req, res) => {
    try{
        const keywords = await KeywordTracking.find({ userId: req.userId }).sort({ createdAt: -1 }).select("-rankHistory");
        res.status(200).json({ success: true, keywords });
    }
    catch(err){
        console.error("Get Keywords Error:", err.message);
         res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//get single keyword with full history
export const getKeyword = async (req, res) => {
    try{
        const tracking = await KeywordTracking.findOne({ _id: req.params.id, userId: req.userId });
        if(!tracking){
            return res.status(404).json({ success: false, message: "Keyword tracking not found" });
        }
        res.status(200).json({ success: true, tracking });
    }
    catch(err){
        console.error("Get Keyword Error:", err.message);
         res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//manually refresh a keyword's ranking 
export const refreshKeyword = async (req, res) => {
    try{
        const tracking = await KeywordTracking.findOne({ _id: req.params.id, userId: req.userId });
        if(!tracking){
            return res.status(404).json({ success: false, message: "Keyword tracking not found" });
        }
        tracking.status = "checking";
        await tracking.save();
        res.status(200).json({ success: true, message: "Rank check started" });
        keywordTracking(tracking);
    }
    catch(err){
        console.error("Refresh Keyword Error:", err.message);
         res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//delete keyword tracking
export const deleteKeyword = async (req, res) => {
    try{
        const tracking = await KeywordTracking.findByIdAndDelete({ _id: req.params.id, userId: req.userId });
        if(!tracking){
            return res.status(404).json({ success: false, message: "Keyword tracking not found" });
        }
        res.status(200).json({ success: true, message: "Keyword tracking deleted" });
    }
    catch(err){
        console.error("Delete Keyword Error:", err.message);
         res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//Toggle tracking active/inactive
export const toggleTracking = async (req, res) => {  
    try{
        const tracking = await KeywordTracking.findOne({ _id: req.params.id, userId: req.userId });
        if(!tracking){
            return res.status(404).json({ success: false, message: "Keyword tracking not found" });
        }
        tracking.active = !tracking.active;
        await tracking.save();
        res.status(200).json({ success: true, tracking });
    }
    catch(err){
        console.error("Toggle Tracking Error:", err.message);
         res.status(500).json({ success: false, message: "Internal server error" });
    }
}