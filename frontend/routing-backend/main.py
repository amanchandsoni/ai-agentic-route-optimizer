import os
import requests
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_mistralai import ChatMistralAI

app = FastAPI(title="AI-Powered Agentic Routing Engine")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Keys Configuration
TAVILY_API_KEY = "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"
os.environ["MISTRAL_API_KEY"] = "Llajz8xCst7GkxTZT8mMAoZOYe24Dzkm"

# =====================================================================
# TRUSTED MATHEMATICAL GROUND-TRUTH MATRIX (FOR ZERO FLUCTUATION)
# =====================================================================
# Standard core localized and highway routes with absolute locked distance values
TRUSTED_DISTANCES = {
    ("siwan", "barauli"): 14,
    ("barauli", "gopalganj"): 20,
    ("siwan", "gopalganj"): 34,
    ("boring road, patna", "mahavir mandir, hajipur"): 22,
    ("patna", "hajipur"): 20,
    ("gaya junction", "purnia terminal"): 370
}

def sanitize_and_fix_segment(segment_from, segment_to, AI_weight):
    """
    Normalizes the names and applies the exact ground-truth values 
    if the parameters match our trusted spatial dictionary.
    """
    # Extract baseline name tokens (e.g., "Siwan(Bihar)" -> "siwan")
    src = segment_from.split('(')[0].strip().lower()
    dest = segment_to.split('(')[0].strip().lower()
    
    # Check forward and reverse mappings inside the trusted dataset
    if (src, dest) in TRUSTED_DISTANCES:
        return TRUSTED_DISTANCES[(src, dest)]
    if (dest, src) in TRUSTED_DISTANCES:
        return TRUSTED_DISTANCES[(dest, src)]
        
    return AI_weight # Returns raw parsed weight if not found in lookup dict

class RouteQuery(BaseModel):
    source: str
    destination: str

@app.post("/api/fetch-route-matrix")
async def fetch_route_matrix(query: RouteQuery):
    try:
        # Step 1: Specific Route Search Query for Tavily
        search_prompt = (
            f"What is the exact actual surface road driving distance in KM between '{query.source}' and '{query.destination}' via intermediate highway transit nodes? "
            f"Provide precision telemetry data from official logistics map resources."
        )
        
        tavily_url = "https://api.tavily.com/search"
        payload = {
            "api_key": TAVILY_API_KEY,
            "query": search_prompt,
            "search_depth": "advanced"
        }
        
        response = requests.post(tavily_url, json=payload)
        search_results = response.json().get("results", [])
        raw_text_data = "\n".join([r["content"] for r in search_results])

        if not raw_text_data:
            raise HTTPException(status_code=404, detail="Internet par is route ka real data nahi mila!")

        # Step 2: Mistral AI Initialization
        llm = ChatMistralAI(model="mistral-large-latest", temperature=0)
        
        # ULTRA STRICT COMMAND GUARDRAILS TO PREVENT 2-3 KM DISCREPANCIES
        system_prompt = (
            "You are an elite GIS and military logistics coordinator. Your absolute directive is to analyze the provided web data "
            f"and map out ONLY the direct sequential route segments from '{query.source}' to '{query.destination}'.\n\n"
            "STRICT OPERATIONAL GUARDRAILS:\n"
            "1. MATHEMATICAL PRECISION: You must analyze the true highway milestones. Do NOT approximate distances. If sources state varying distances, pick the most consistent official road infrastructure data.\n"
            f"2. GEOGRAPHIC ISOLATION: Do NOT include any distant cities of India (like Mumbai, Delhi, Visakhapatnam) unless they lie directly on the driving line between '{query.source}' and '{query.destination}'.\n"
            f"3. LOCAL DATA INTEGRITY: If the query is localized inside a state or city region, focus ONLY on immediate connected local checkpoints, junctions, or adjacent towns (e.g., Barauli, Gandhi Setu). No external scaling.\n"
            "4. NO DISCURSIVE FILLER: Return ONLY a valid JSON object. Absolutely no markdown blocks (Do not include ```json), no conversational filler text, no headers, and no descriptions.\n\n"
            "Strict JSON Structure Format:\n"
            "{\n"
            '  "segments": [\n'
            f'    {{"from": "{query.source}", "to": "Intermediate Node A", "weight": 14}},\n'
            f'    {{"from": "Intermediate Node A", "to": "{query.destination}", "weight": 20}}\n'
            "  ]\n"
            "}\n\n"
            f"Web Search Raw Metadata Source Cluster:\n{raw_text_data}"
        )

        ai_response = llm.invoke(system_prompt)
        
        # Clean any accidental markdown backticks out safely
        clean_json_str = ai_response.content.replace("```json", "").replace("```", "").strip()
        
        parsed_matrix = json.loads(clean_json_str)
        
        # Step 3: Run ground-truth calibration algorithm layer
        if "segments" in parsed_matrix:
            for segment in parsed_matrix["segments"]:
                original_weight = int(segment.get("weight", 0))
                # Cross check and enforce zero fluctuation rules
                calibrated_weight = sanitize_and_fix_segment(segment["from"], segment["to"], original_weight)
                segment["weight"] = calibrated_weight

        return parsed_matrix

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)