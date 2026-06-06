import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

//search google for a keyword and extract ranking info for a target domain
export async function rankTracker(keyword, targetDomain) {
    let browser;
    try{
        //1. initialise browserbase session and connect playwright
        const session = await bb.sessions.create({browserSettings: {blockAds: true}});
        browser = await chromium.connectOverCDP(session.connectUrl);
        const page = browser.contexts()[0].pages()[0];
        page.setDefaultNavigationTimeout(45000); //set navigation timeout 

        //2 Initial google visit and consent handling
        await page.goto("https://www.google.com", {waitUntil: "networkidle"});
        try{
            const btn = await page.$('button[id="L2AGLb"], form[action*="consent"] button');
            if(btn){
                await btn.click();
                await page.waitForTimeout(1500); //wait for consent to process
            }
        }
        catch{

        }
        let found=null,
        allResults=[];

        const cleanTarget= targetDomain.replace("www.", "").toLowerCase();

        //3. search loop: iterate through upto 5 pages of google results
        for( let gPage=0; gPage<5; gPage++){
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(keyword)}&start=${gPage*10}&num=10&hl=en&gl=us`, {waitUntil: "networkidle"});

            //4. page extraction: retry upto 3 times if results are not found to handle any loading issues
            let pageResults = [];

            for(let retry=0;retry<3;retry++){
                try{
                    await page.waitForSelector('h3', {timeout: 8000}); //wait for search results to load
                    await page.waitForTimeout(1500); //additional wait to ensure all elements are loaded
                    
                }
                catch(error){

                }
            }
               }}
    catch(error){

    }
}