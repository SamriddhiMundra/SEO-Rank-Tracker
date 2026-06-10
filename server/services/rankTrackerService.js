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

    // Google may show a cookie/privacy consent popup.
    // We try to find the "Accept" button using either:
    // 1. A known Google button id (L2AGLb)
    // 2. Any button inside a form whose action contains "consent"

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


    // Google search URL
    //`https://www.google.com/search
    // Search query (keyword)
    // encodeURIComponent converts spaces and special characters
    // into a URL-safe format.
    // Example:
    // "best seo tools" -> "best%20seo%20tools"
    // Pagination offset:
    // Page 1 -> start=0
    // Page 2 -> start=10
    // Page 3 -> start=20
     // Number of results to show per page
    //&num=10
    // Language of search results
    //&hl=en
    // Country/region used for search results
    // Rankings can vary by country
    //&gl=us`


            //4. page extraction: retry upto 3 times if results are not found to handle any loading issues
            let pageResults = [];

            for(let retry=0;retry<3;retry++){
                try{
                    await page.waitForSelector('h3', {timeout: 8000}); //wait for search results to load
                    await page.waitForTimeout(1500); //additional wait to ensure all elements are loaded
                    pageResults = await page.evaluate(()=>Array.from(document.querySelectorAll("h3")).map((h3)=>{
                        let a = h3.closest('a');
                        if(!a){
                            let p=h3.parentElement;
                            for(let j=0;j<5 && p; j++, p=p.parentElement){
                                if(p.tagName.toLowerCase() === "a"){
                                    a=p;
                                    break;
                                }
                                const sub=p.querySelector("a[href]");
                                if(sub && sub.contains(h3)){
                                    a=sub;
                                    break;
                                }
                        }
                    }
                if(!a || !a.href.startsWith("http") || a.href.includes('google.'))return null; //skip non-http links and google internal links
                let s="",
                c=a.parentElement;
                for(let j=0; j<6 && c; j++, c=c.parentElement){
                    const txt= c.innerText || "";
                    if(txt.length > h3.innerText.length+50){
                        s= (txt.split("\n").find((l)=>l.length > 30 && !l.includes(h3.innerText.substring(0,20))) || "").trim().substring(0,300);
                        if(s)break;
                    }
                }
                return {url: a.href, domain: (new URL(a.href)).hostname.replace("www.", "").toLowerCase(), title: h3.innerText.trim(), snippet: s};
                }).filter(Boolean));
                if(pageResults.length>0)break; //if we got results, no need to retry
                await page.reload({waitUntil: "networkidle"});
                }
                catch(err){
                    if(retry===2){break;}
                    await page.reload({waitUntil: "networkidle"});
                }
            }
            if(!pageResults.length)break; //if still no results, skip to next page

            //5 Result synthesis: update global results and check for target match
            for(const r of pageResults){
                r.position = allResults.length + 1; //calculate overall position across pages
                allResults.push(r);
                if(!found && (r.domain.toLowerCase().includes(cleanTarget) || cleanTarget.includes(r.domain.toLowerCase()))){
                    found={...r,page: gPage+1};
                }
            }
            if(found)break; //if we found the target domain, no need to check further pages
            await page.waitForTimeout(2000 + Math.random()*2000); //random wait between page navigations to mimic human behavior

               }
               //6. Finalisation: close browser and extract competitiors
                await browser.close();
                const competitors= allResults.filter((r)=>!r.domain.toLowerCase().includes(cleanTarget) && !cleanTarget.includes(r.domain.toLowerCase())).slice(0,10); //top 10 competitors excluding target

                return {
                    success: true,
                    data: {
                        keyword,
                        targetDomain,
                        position: found ?.position || null,
                        page: found ?.page || null,
                        title: found ?.title || "",
                        snippet: found ?.snippet || "",
                        competitors,
                        totalResultsScanned: allResults.length
                    }
                }
            }
    catch(error){
        console.error("Rank Tracker Error:", error.message);
        if(browser){
            await browser.close().catch(()=>{});
        }
        return {
            success: false,
            error: error.message
        }
    }
}