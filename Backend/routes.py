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

class ThumbnailResponse(BaseModel):
    id: str
    style_name: str
    status: str
    imagekit_url: str | None
    error_message: str | None
    variants: dict | None

class JobStatusResponse(BaseModel):
    id: str
    prompt: str
    headshot_url: str
    num_thumbnails: int
    status: str
    thumbnails: list[ThumbnailResponse]
    

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

router.post("/jobs", response_model=JobCreateResponse)
async def create_job(request: JobCreateRequest, session: Session = Depends(get_session)):
    if request.num_thumbnails < 1 or request.num_thumbnails > 3:
        raise HTTPException(status_code=400, detail="num_thumbnails must be between 1 and 3")
    
    job = Job(
        prompt=request.prompt,
        num_thumbnails=request.num_thumbnails,
        headshot_url=request.headshot_url,
        status="pending"
    )

    session.add(job)

    styles = STYLES_ORDER[:request.num_thumbnails]
    for style in styles:
        thumb = Thumbnail(
            job_id=job.id,
            style_name=style,
        )

        session.add(thumb)

    session.commit()

    # Start background task to process the job

    asyncio.create_task(process_job(job.id))

    return JobCreateResponse(job_id=job.id)

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()

    thumbnail_responses = []
    for t in thumbnails:
        variants = get_variant(t.imageKit_url) if t.imageKit_url else None
        thumbnail_responses.append(ThumbnailResponse(
            id=t.id,
            style_name=t.style_name,
            status=t.status,
            imagekit_url=t.imageKit_url,
            error_message=t.error_message,
            variants=variants
        ))

    return JobStatusResponse(
        id=job.id,
        prompt=job.prompt,
        headshot_url=job.headshot_url,
        num_thumbnails=job.num_thumbnails,
        status=job.status,
        thumbnails=thumbnail_responses
    )

