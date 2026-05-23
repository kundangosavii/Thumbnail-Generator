import asyncio

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from model import Job, Thumbnail
from services.generator import process_job, STYLES_ORDER
from services.imagekit_services import upload_file, get_variant

class JobCreateRequest(BaseModel):
    prompt: str
    style_name: str
    headshot: UploadFile

class JobCreateResponse(BaseModel):
    job_id: str

class JobStatusResponse(BaseModel):
    id: str
    style_name: str
    status: str
    imagekit_url: str | None
    error_message: str | None
    variants: dict | None
    

router = APIRouter()

router.post("/upload-headshot")
async def upload_headshot(file: UploadFile = File(...)):
    content = await file.read()
    url = upload_file(
        file_bytes=content,
        file_name=file.filename,
        folder="headshots/"
    )
    return {"url": url}

