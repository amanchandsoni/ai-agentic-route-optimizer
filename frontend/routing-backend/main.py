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
# NOTE: Better to move these to environment variables / a .env file instead of hardcoding.
TAVILY_API_KEY = "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"
os.environ["MISTRAL_API_KEY"] = "Llajz8xCst7GkxTZT8mMAoZOYe24Dzkm"

# =====================================================================
# TRUSTED MATHEMATICAL GROUND-TRUTH MATRIX (FOR ZERO FLUCTUATION)
# =====================================================================
TRUSTED_DISTANCES = {
    ("siwan", "barauli"): 14,
    ("barauli", "gopalganj"): 20,
    ("siwan", "gopalganj"): 34,
    ("boring road, patna", "mahavir mandir, hajipur"): 22,
    ("patna", "hajipur"): 20,
    ("gaya junction", "purnia terminal"): 370,
}


def sanitize_and_fix_segment(segment_from, segment_to, AI_weight):
    """
    Normalizes the names and applies the exact ground-truth values
    if the parameters match our trusted spatial dictionary.
    """
    src = segment_from.split('(')[0].strip().lower()
    dest = segment_to.split('(')[0].strip().lower()

    if (src, dest) in TRUSTED_DISTANCES:
        return TRUSTED_DISTANCES[(src, dest)]
    if (dest, src) in TRUSTED_DISTANCES:
        return TRUSTED_DISTANCES[(dest, src)]

    return AI_weight


class RouteQuery(BaseModel):
    source: str
    destination: str


@app.get("/")
async def root():
    # Simple health-check route so hitting "/" doesn't show a confusing 404.
    return {"status": "ok", "message": "Routing engine is running. Visit /docs for API docs."}


@app.post("/api/fetch-route-matrix")
async def fetch_route_matrix(query: RouteQuery):
    try:
        # Step 1: Multiple targeted Tavily queries to cross-verify the number
        # instead of relying on a single fuzzy search (this is what caused
        # random/inflated distances for long state-to-state queries).
        tavily_url = "https://api.tavily.com/search"
        search_queries = [
            f"{query.source} to {query.destination} distance by road km shortest route",
            f"{query.source} to {query.destination} driving distance National Highway km",
            f"Google Maps {query.source} {query.destination} road distance km",
        ]

        raw_chunks = []
        for q in search_queries:
            payload = {
                "api_key": TAVILY_API_KEY,
                "query": q,
                "search_depth": "advanced",
                "max_results": 5,
            }
            resp = requests.post(tavily_url, json=payload, timeout=30)
            resp.raise_for_status()
            for r in resp.json().get("results", []):
                content = r.get("content", "")
                if content:
                    raw_chunks.append(content)

        raw_text_data = "\n---\n".join(raw_chunks)

        if not raw_text_data:
            raise HTTPException(status_code=404, detail="Internet par is route ka real data nahi mila!")

        # Step 2: Mistral AI Initialization
        llm = ChatMistralAI(model="mistral-large-latest", temperature=0)

        # ULTRA STRICT COMMAND GUARDRAILS — tuned to stop the model from
        # inventing fake waypoints/segments for long-distance (state-to-state)
        # queries, which was producing wrong totals for e.g. Delhi -> Punjab.
        system_prompt = (
            "You are a precise Indian road-distance lookup engine. Your ONLY job is to determine the shortest "
            f"realistic by-road driving distance in KM from '{query.source}' to '{query.destination}', using the "
            "web data provided below.\n\n"
            "STRICT OPERATIONAL RULES:\n"
            "1. DEFAULT TO A SINGLE SEGMENT: Unless the source data explicitly names real, well-known intermediate "
            "   cities/towns that lie directly on the standard driving route (e.g. a highway junction town), output "
            "   ONLY ONE segment: from the source directly to the destination, with the shortest commonly cited "
            "   total road distance. Do NOT invent intermediate nodes just to break the route into pieces.\n"
            "2. NEVER FABRICATE PLACES: Every 'from'/'to' value must be a real place name that actually appears in "
            "   the web data below. Do not guess, hallucinate, or approximate a town name.\n"
            "3. NUMERIC CONSISTENCY CHECK: If the web data contains multiple different KM figures for the same "
            "   route, choose the value that appears most frequently across sources (the consensus number). If no "
            "   clear majority exists, choose the smallest plausible figure that still looks like a real road "
            "   distance (i.e. prefer the shortest verified route over a longer alternate route).\n"
            "4. NO ROUNDING GAMES: Report the distance as a whole number of KM exactly as most sources state it. Do "
            "   not average dissimilar numbers together.\n"
            f"5. GEOGRAPHIC ISOLATION: Do NOT include unrelated distant cities unless they are a real, named stop "
            f"   on the direct route between '{query.source}' and '{query.destination}'.\n"
            "6. NO DISCURSIVE FILLER: Return ONLY a valid JSON object. No markdown code fences, no explanation, no "
            "   headers.\n\n"
            "Strict JSON Structure Format (single-segment example):\n"
            "{\n"
            '  "segments": [\n'
            f'    {{"from": "{query.source}", "to": "{query.destination}", "weight": 250}}\n'
            "  ]\n"
            "}\n\n"
            f"Web Search Raw Metadata Source Cluster:\n{raw_text_data}"
        )

        ai_response = llm.invoke(system_prompt)

        # Clean any accidental markdown backticks out safely
        raw_content = ai_response.content if isinstance(ai_response.content, str) else str(ai_response.content)
        clean_json_str = raw_content.replace("```json", "").replace("```", "").strip()

        try:
            parsed_matrix = json.loads(clean_json_str)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=502,
                detail=f"AI model se valid JSON nahi mila. Raw response: {clean_json_str[:300]}",
            )

        # Step 3: Run ground-truth calibration algorithm layer
        if "segments" in parsed_matrix:
            for segment in parsed_matrix["segments"]:
                original_weight = int(segment.get("weight", 0))
                calibrated_weight = sanitize_and_fix_segment(segment["from"], segment["to"], original_weight)
                segment["weight"] = calibrated_weight

        return parsed_matrix

    except HTTPException:
        raise
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Tavily API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)