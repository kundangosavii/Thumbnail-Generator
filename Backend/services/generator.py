import asyncio
import logging

from sqlmodel import Session, select
from database import engine
from model import Job, Thumbnail
from gemini_services import generate_thumbnail
from imagekit_services import upload_file, get_variant

logger = logging.getLogger(__name__)

STYLES = {
    "bold_dramatic": (
        "Create a bold, dramatic YouTube thumbnail with high contrast, "
        "cinematic lighting, dark moody background, and powerful composition."

        "The person's face should be prominent with a dramatic expression."
    ),
    "clean_minimal": (
        "Create a clean, minimal YouTube thumbnail with bright lighting, "
        "white/light background, modern professional aesthetic, plenty of "
        "whitespace, and sharp clean composition. The person should look "
        "approachable and professional."
    ),
    "vibrant_energetic": (
        "Create a vibrant, energetic YouTube thumbnail with colorful "
        "gradients, "
        "dynamic angles, eye-catching pop-art style colors, and energetic "
        "composition. The person should have an excited or engaging expresssion."
    )
}

STYLES_ORDER = ["bold_dramatic", "clean_minimal", "vibrant_energetic"]

async def generate_first_thumbnail(thumbnail_id: str, prompt: str, headshot_url: str):
    # DB Mark --> generating
    with Session(engine) as session:
        thum = session.get(Thumbnail, thumbnail_id)
        thum.status = "generating"
        style_name = thum.style_name
        session.add(thum)
        session.commit()

    style_prompt = STYLES[style_name]

    # AI call
    try:
        image_bytes = await generate_thumbnail(prompt, style_prompt, headshot_url)

        with Session(engine) as session:
            thum = session.get(Thumbnail, thumbnail_id)
            job_id = thum.job_id

            # upload to imagekit

            url = upload_file(
                file_bytes=image_bytes,
                file_name=f"{thumbnail_id}.png",
                folder_path=f"thumbnails/{job_id}/"
            )

            # update DB with URL and mark as uploaded
            with Session(engine) as session:
                thum = session.get(Thumbnail, thumbnail_id)
                thum.imageKit_url = url
                thum.status = "uploaded"
                session.add(thum)
                session.commit()
            logger.info(f"Thumbnail {thumbnail_id} generated and uploaded successfully.")  
    
    except Exception as e:
        logger.error(f"Error generating thumbnail {thumbnail_id}: {str(e)}")
        with Session(engine) as session:
            thum = session.get(Thumbnail, thumbnail_id)
            thum.status = "error"
            thum.error_message = str(e)[:500]  # Truncate error message to fit in DB field
            session.add(thum)
            session.commit()


async def process_job(job_id: str):
    # Mark job as processing
    # find all thumbnails for the job
    # start one worker for each thumbnail
    # wait for all workers to finish
    # Mark job as completed

    with Session(engine) as session:
        job = session.get(Job, job_id)
        job.status = "processing"
        prompt = job.prompt
        headshot_url = job.headshot_url
        session.add(job)
        session.commit()

        Thumbnails = session.exec(
            select(Thumbnail).where(Thumbnail.job_id == job_id)
        ).all()

        thumbnail_ids = [thum.id for thum in Thumbnails]

        tasks = [
            generate_first_thumbnail(thumbnail_id, prompt, headshot_url)
            for thumbnail_id in thumbnail_ids
        ]

        await asyncio.gather(*tasks, return_exceptions=True)

        with Session(engine) as session:
            Thumbnails = session.exec(
            select(Thumbnail).where(Thumbnail.job_id == job_id)
            ).all()

            all_failed = all(Thumbnail.status == "failed"  for Thumbnail in Thumbnails)

            job= session.get(Job, job_id)
            job.status = "failed" if all_failed else "completed"
            session.add(job)
            session.commit()