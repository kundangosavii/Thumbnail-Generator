import asyncio
import logging

from sqlmodel import Session, select
from database import engine
from model import job, Thumbnail
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

async def generate_first_thumbnail(thumbnail_id: str, headshot_url: str):
    # DB Mark --> generating
    with Session(engine) as session:
        thum = session.get(Thumbnail, thumbnail_id)
        thum.status = "generating"
        style_name = thum.style_name
        session.add(thum)
        session.commit()

    style_prompt = STYLES[style_name]
    
    # AI call
    # upload this image
    # DB update status + DB call save URL