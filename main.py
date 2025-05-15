from pathlib import Path
import shutil

from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR   = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── STATIC  ( /static/… → ./static/… ) ───────────────────────────
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# ── TEMPLATES ────────────────────────────────────────────────────
templates = Jinja2Templates(directory=BASE_DIR / "templates")

# ── ROUTES ───────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("AOS.html", {"request": request})


@app.get("/{page}", response_class=HTMLResponse)
async def html_page(request: Request, page: str):
    """
    /visualize  → visualize.html  
    /about.html → about.html
    """
    if not page.endswith(".html"):
        page += ".html"

    tpl_path = (BASE_DIR / "templates" / page).resolve()

    # безопасность: не уйти выше templates
    if tpl_path.is_file() and BASE_DIR / "templates" in tpl_path.parents:
        return templates.TemplateResponse(page, {"request": request})

    raise HTTPException(status_code=404, detail="Page not found")


@app.post("/upload")
async def upload_audio(audio_file: UploadFile = File(...)):
    save_path = UPLOAD_DIR / audio_file.filename
    with save_path.open("wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)
    return JSONResponse({"success": True, "filename": audio_file.filename})
