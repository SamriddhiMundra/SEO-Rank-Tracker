import Analysis from "../models/Analysis.js";

//analyse a url
export const analyzeUrl = async (req, res) => {
    try{
        const { url } = req.body;
        if(!url){
            return res.status(400).json({success: false, message: "URL is required" });
        }

        //validate url format
        let validUrl;
        try{
            validUrl = new URL(url.startsWith('http') ? url : `https://${url}`);

        }catch(err){
            return res.status(400).json({success: false, message: "Invalid URL format" });

        }
        //create analysis record with pending status
        const analysis = await Analysis.create({userId: req.userId,url:validUrl.href, status:"processing"});
        res.status(201).json({success: true, message: "Analysis started", analysisId: analysis._id});
        

    } catch(error){

    }
}

//get analysis by id
export const getAnalysis = async (req, res) => {

}

//get all analyses by user
export const getAnalyses = async (req, res) => {

}

//delete analysis 
export const deleteAnalysis = async (req, res) => {

}