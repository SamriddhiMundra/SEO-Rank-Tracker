import { rankTracker } from "./rankTrackerService.js";
export async function keywordTracking(tracking) {
    try{
        let result;

        //try upto 2 times for reliability
        for(let attempt=0; attempt<2; attempt++){
            result = await rankTracker(tracking.keyword, tracking.domain);
            if(result.success && result.data.totalResultsScanned > 0){
                break; //if we got a valid result, no need to retry
            }
            if(attempt<2) await new Promise((r)=> setTimeout(r, result.success ? 3000 : 5000)); //wait longer if the previous attempt failed
        }
        if(result.success){
            const prev = tracking.currentPosition;
            const today = new Date();
            today.setHours(0,0,0,0); //normalize to start of day

            tracking.currentPosition = result.data.position;
            tracking.currentPage = result.data.page;
            tracking.competitors = result.data.competitors;
            tracking.lastChecked = new Date();
            tracking.status = "completed";

            //update stats
            tracking.positionChange = prev && result.data.position ? prev-result.data.position : 0;
            if(result.data.position && (!tracking.bestPosition || result.data.position < tracking.bestPosition)){
                tracking.bestPosition = result.data.position;
            }

            //update history
            const historyEntry = {
                date: today,
                position: result.data.position,
                page: result.data.page,
                title: result.data.title,
                snippet: result.data.snippet
            };
            const idx=tracking.rankHistory.findIndex(h=> h.date.toDateString() === today.toDateString());
            if(idx>=0){
                tracking.rankHistory[idx] = historyEntry; //update today's entry
            }
            else tracking.rankHistory.push(historyEntry); //add new entry

        }
        else{
            tracking.status = "failed";
        }
        await tracking.save();
        return result;
    }
    catch(err){
        console.error("Rank Update Error:", err.message);
        tracking.status = "failed";
        await tracking.save().catch(()=>{});
        return {
            success: false,
            error: err.message
        };
    }
}