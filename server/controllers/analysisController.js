import Analysis from "../models/Analysis.js";
import { analyzeSeoData } from "../services/geminiService.js";
import { scrapUrl } from "../services/scraperService.js";
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
        
        //Run scraping and analysis in background
        try{
            //1. scrap the url with browserbase
            const scrapeResult = await scrapUrl(validUrl.href);
            if(!scrapeResult.success){
                analysis.status = "failed";
                await analysis.save();
                return;
            }
            //2. analyze the result with gemini AI
            const aiResult = await analyzeSeoData(scrapeResult.data);
            if(!aiResult.success){
                analysis.status = "failed";
                await analysis.save();
                return;
            }
            //3. save the analysis result
            analysis.overallScore = aiResult.data.overallScore || 0;
            analysis.categories = aiResult.data.categories || {};
            analysis.metaData = scrapeResult.data.metaData || {};
            analysis.headings = scrapeResult.data.headings || {};
            analysis.links = scrapeResult.data.links || {};
            analysis.images = scrapeResult.data.images || {};
            analysis.keywords = aiResult.data.keywords || {};
            analysis.issues = aiResult.data.issues || {};
            analysis.loadTime = scrapeResult.data.loadTime || 0;
            analysis.pageSize = scrapeResult.data.pageSize || 0;
            analysis.wordCount = scrapeResult.data.wordCount || 0;
            analysis.status = "completed";
            await analysis.save();
            }
        
        catch(bgError){
            console.error("analyze url background error", bgError.message);
           try{
            analysis.status = "failed";
            await analysis.save();
           }
           catch(saveError){

           } console.error("failed to save failed status", saveError.message);
        }

    } catch(error){
        console.error("analyze url error", error.message);
        if(!res.headersSent){
            return res.status(500).json({success: false, message: "Internal server error" });
        }
        
    }
}

//get analysis by id
export const getAnalysis = async (req, res) => {
    try{
        const analysis = await Analysis.findOne({_id: req.params.id, userId: req.userId});
        if(!analysis){return res.status(404).json({success: false, message: "Analysis not found" });}
        res.status(200).json({success: true, analysis});
    }
    catch(error){
        console.error("get analysis error", error.message);
        res.status(500).json({success: false, message: "Internal server error" });
        
    }
}

//get all analyses by user
export const getAnalyses = async (req, res) => {
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const analyses = await Analysis.find({userId: req.userId}).sort({createdAt: -1}).skip(skip).limit(limit).select("-issues -keywords");
        const total = await Analysis.countDocuments({userId: req.userId});
        res.json({success: true, analyses, pagination: {page, limit, total, pages: Math.ceil(total/limit)}});


    }
    catch(error){
        console.error("get analysis error", error.message);
        res.status(500).json({success: false, message: "Internal server error" });
        
    }
}

//delete analysis 
export const deleteAnalysis = async (req, res) => {
    try{
        await Analysis.findByIdAndDelete({_id: req.params.id, userId: req.userId});
        res.status(200).json({success: true, message: "Analysis deleted"});
    }
    catch(error){
        console.error("Delete analysis error", error.message);
        res.status(500).json({success: false, message: "Internal server error" });
        
    }
}