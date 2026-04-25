import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from google import genai as google_genai
from google.genai import types as google_types
from motor.motor_asyncio import AsyncIOMotorClient
from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def _get_env(*names: str, default: str = "") -> str:
    for name in names:
        value = os.environ.get(name)
        if value and value.strip():
            return value.strip()
    return default


def _normalize_provider(provider: str) -> str:
    normalized = (provider or "").strip().lower()
    aliases = {
        "gemini": "gemini",
        "google": "gemini",
        "google-genai": "gemini",
        "openai": "openai",
        "openai-compatible": "openai",
        "openai_compatible": "openai",
        "github": "openai",
        "github-models": "openai",
        "github_models": "openai",
    }
    return aliases.get(normalized, normalized)

# MongoDB connection
mongo_url = _get_env("MONGO_URL")
db_name = _get_env("DB_NAME", "code_explainer")
mongo_client = None
db = None

if mongo_url:
    try:
        mongo_client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
        db = mongo_client[db_name]
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}")
        mongo_client = None
        db = None

# LLM config
LLM_PROVIDER = _normalize_provider(_get_env("LLM_PROVIDER", "AI21-Jamba-1.5-Large"))
LLM_MODEL = _get_env(
    "LLM_MODEL",
    "jamba-1.5-large" if LLM_PROVIDER == "gemini" else "gpt-4.1-mini",
)
GEMINI_API_KEY = _get_env("GEMINI_API_KEY", "GOOGLE_API_KEY", "LLM_API_KEY")
OPENAI_API_KEY = _get_env("OPENAI_API_KEY", "LLM_API_KEY")
OPENAI_BASE_URL = _get_env("OPENAI_BASE_URL", "LLM_BASE_URL")

# The predefined code-explainer system prompt
CODE_EXPLAINER_PROMPT = """Explain the following code / script / configuration / technical content from absolute beginner level (assume I know nothing about it).

Follow ALL rules strictly:

━━━━━━━━━━━━━━━━━━━━━━━
🔹 1. LINE-BY-LINE / BLOCK-BY-BLOCK EXPLANATION
━━━━━━━━━━━━━━━━━━━━━━━

* Explain EVERY line or block in order — do NOT skip anything.
* If the language is not strictly line-based (like configs, markup, tools), break it into logical blocks and explain each.

For each line/block, explain:

* What it is
* Why it is used
* How it works internally (step-by-step, not surface level)
* Real-life example or analogy

━━━━━━━━━━━━━━━━━━━━━━━
🔹 2. DEEP INTERNAL WORKING (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━
Explain what happens behind the scenes depending on the system:

* Programming languages → execution flow, memory, call stack, runtime behavior
* Frontend → rendering, DOM, layout engine, paint process
* Backend → request/response cycle, server flow, async handling
* Databases → query parsing, execution, indexing, data retrieval
* Frameworks (React, Angular, etc.) → internal architecture and flow
* Tools / platforms (Jira, APIs, configs, etc.) → how the system processes and uses the data

Always explain step-by-step internal flow, not just definitions.

━━━━━━━━━━━━━━━━━━━━━━━
🔹 3. CLASSES / KEYWORDS / CONFIGS / SYNTAX
━━━━━━━━━━━━━━━━━━━━━━━

* Break down ALL important keywords, classes, properties, or configs
* Explain what each one does
* Explain how they work internally (not just meaning)
* If styling/animation exists → explain rendering + animation engine
* If framework-specific → explain its internal role

━━━━━━━━━━━━━━━━━━━━━━━
🔹 4. DATA FLOW / LOOPS / LOGIC
━━━━━━━━━━━━━━━━━━━━━━━

* Explain how data moves through the code/system
* For loops / maps / queries → show step-by-step transformation
* Show input → processing → output clearly

━━━━━━━━━━━━━━━━━━━━━━━
🔹 5. STRUCTURE / LAYOUT / SYSTEM DESIGN
━━━━━━━━━━━━━━━━━━━━━━━

* Explain structure (UI layout, system design, config hierarchy, etc.)
* For UI → explain flex/grid/positioning calculations
* For backend → explain flow of logic/modules
* For configs/tools → explain hierarchy and dependencies

━━━━━━━━━━━━━━━━━━━━━━━
🔹 6. SIMPLE ENGLISH (VERY IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━━

* Assume I am a complete beginner
* Use very simple English
* Avoid jargon OR explain it clearly

━━━━━━━━━━━━━━━━━━━━━━━
🔹 7. DIAGRAMS (MANDATORY WHERE HELPFUL)
━━━━━━━━━━━━━━━━━━━━━━━
Use text/ASCII diagrams to explain:

* Layout structure
* Execution flow
* Data flow
* System flow
* Rendering pipeline
* Call stack (if relevant)

━━━━━━━━━━━━━━━━━━━━━━━
🔹 8. STRICT RULES
━━━━━━━━━━━━━━━━━━━━━━━

* Do NOT skip anything
* Do NOT give shallow explanation
* Follow exact order
* Break complex parts into smaller steps

━━━━━━━━━━━━━━━━━━━━━━━
🔹 9. FULL END-TO-END FLOW
━━━━━━━━━━━━━━━━━━━━━━━
After full explanation, show complete flow:

Generic format:
Input → Processing → Internal system steps → Output

Customize based on type:

* Frontend → Code → Render → Layout → Paint → Screen
* Backend → Request → Server → Logic → DB → Response
* Database → Query → Parse → Execute → Result
* Tools/configs → Input → System interpretation → Action/output

━━━━━━━━━━━━━━━━━━━━━━━
🔹 10. REVISION NOTES (VERY IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━━
Convert the entire explanation into:

* Short bullet-point notes
* Only key concepts
* Easy to revise quickly
* Include rules, patterns, formulas if any

━━━━━━━━━━━━━━━━━━━━━━━

If anything is skipped or explained shallowly, redo it in more depth.
If you get lazy then: Follow rule 2 and 9 strictly, go deeper."""


app = FastAPI()
api_router = APIRouter(prefix="/api")


# Models
class ExplainRequest(BaseModel):
    code: str
    title: Optional[str] = None


class HistoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    code_preview: str
    created_at: str


class HistoryRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    code: str
    explanation: str
    created_at: str


def _make_title(code: str) -> str:
    first_line = next((ln.strip() for ln in code.splitlines() if ln.strip()), "Snippet")
    return (first_line[:60] + "…") if len(first_line) > 60 else first_line


def _history_collection():
    return db.explanations if db is not None else None


def _llm_key_configured() -> bool:
    if LLM_PROVIDER == "gemini":
        return bool(GEMINI_API_KEY)
    if LLM_PROVIDER == "openai":
        return bool(OPENAI_API_KEY)
    return False


async def _generate_explanation(code: str) -> str:
    print(f"DEBUG provider={LLM_PROVIDER!r}  model={LLM_MODEL!r}")
    user_content = f"Here is the content:\n\n{code}"

    # 1. --- GEMINI BLOCK ---
    if LLM_PROVIDER == "gemini":
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini Key missing")
        client = google_genai.Client(api_key=GEMINI_API_KEY)
        response = await asyncio.to_thread(
            lambda: client.models.generate_content(
                model=LLM_MODEL,
                contents=user_content,
                config=google_types.GenerateContentConfig(
                    systemInstruction=CODE_EXPLAINER_PROMPT,
                    temperature=0.2,
                    maxOutputTokens=8192,
                ),
            )
        )
        return (getattr(response, "text", "") or "").strip()

    # 2. --- OPENAI / JAMBA BLOCK ---
    elif LLM_PROVIDER == "openai":
        import httpx
        
        URL = f"{OPENAI_BASE_URL}/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY.strip()}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": LLM_MODEL,  # uses .env value directly
            "messages": [
                {"role": "system", "content": CODE_EXPLAINER_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
            "max_tokens": 8192  # Groq supports 8192
        }

        print(f">>> FINAL ATTEMPT - SENDING MODEL: {LLM_MODEL}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(URL, headers=headers, json=payload)
                
                if response.status_code != 200:
                    error_msg = response.text
                    print(f"DEBUG ERROR FROM GITHUB: {error_msg}")
                    return f"GitHub Error: {error_msg}"

                return response.json()['choices'][0]['message']['content'].strip()

            except Exception as e:
                # If this fails with 'getaddrinfo', it's 100% your Wiom WiFi blocking Azure
                print(f"CONNECTION ERROR: {str(e)}")
                raise HTTPException(status_code=502, detail="Connection failed. Switch to Mobile Hotspot.")

    else:
        raise HTTPException(status_code=400, detail="Unsupported Provider")


@api_router.get("/")
async def root():
    return {
        "message": "Code Explainer API",
        "model": LLM_MODEL,
        "provider": LLM_PROVIDER,
        "history_enabled": db is not None,
    }


@api_router.get("/health")
async def health():
    return {
        "status": "ok",
        "llm_key_configured": _llm_key_configured(),
        "provider": LLM_PROVIDER,
        "model": LLM_MODEL,
        "history_enabled": db is not None,
        "database_configured": bool(mongo_url),
    }


@api_router.post("/explain")
async def explain_code(payload: ExplainRequest):
    code = (payload.code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Code cannot be empty.")

    try:
        explanation = await _generate_explanation(code)
        if not explanation:
            raise HTTPException(status_code=502, detail="LLM provider returned an empty response.")
    except Exception as e:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"LLM API error: {str(e)}")

    record_id = str(uuid.uuid4())
    title = payload.title.strip() if payload.title and payload.title.strip() else _make_title(code)
    created_at = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": record_id,
        "title": title,
        "code": code,
        "explanation": explanation,
        "created_at": created_at,
    }
    collection = _history_collection()
    if collection is not None:
        try:
            await collection.insert_one(doc.copy())
        except Exception:
            logger.exception("History write failed")

    return {
        "id": record_id,
        "title": title,
        "explanation": explanation,
        "created_at": created_at,
    }


@api_router.get("/history", response_model=List[HistoryItem])
async def list_history():
    collection = _history_collection()
    if collection is None:
        return []

    docs = await collection.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    items = []
    for d in docs:
        code = d.get("code", "")
        preview = (code[:80] + "…") if len(code) > 80 else code
        items.append(
            HistoryItem(
                id=d["id"],
                title=d.get("title", "Snippet"),
                code_preview=preview.replace("\n", " "),
                created_at=d.get("created_at", ""),
            )
        )
    return items


@api_router.get("/history/{record_id}", response_model=HistoryRecord)
async def get_history_item(record_id: str):
    collection = _history_collection()
    if collection is None:
        raise HTTPException(status_code=503, detail="History storage is not configured.")

    doc = await collection.find_one({"id": record_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return HistoryRecord(**doc)


@api_router.delete("/history/{record_id}")
async def delete_history_item(record_id: str):
    collection = _history_collection()
    if collection is None:
        raise HTTPException(status_code=503, detail="History storage is not configured.")

    result = await collection.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True, "id": record_id}


@api_router.delete("/history")
async def clear_history():
    collection = _history_collection()
    if collection is None:
        raise HTTPException(status_code=503, detail="History storage is not configured.")

    result = await collection.delete_many({})
    return {"deleted": result.deleted_count}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[origin.strip() for origin in _get_env('CORS_ORIGINS', '*').split(',') if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    if mongo_client is not None:
        mongo_client.close()
