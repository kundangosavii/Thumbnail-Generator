import asyncio
from io import BytesIO
import base64
import httpx
from google import genai

from config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

async def generate_thumbnail(prompt: str, style_prompt: str, headshot_url: str) -> bytes:
    """
    Use Gemini API to generate a thumbnail image based on the provided prompts and headshot URL.
    Returns the generated image as raw PNG bytes.
    """

    if not client or not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")

    full_prompt= (
        f"{style_prompt}\n"
        f"user request: {prompt}\n"

        "IMPORTANT: The generated thumbnail MUST prominently features the headshot image provided in the URL, and the headshot should be the main focus of the thumbnail."
        "shown in the provided reference headshot Image. Keep their LIKENESS accurately."
    )

    # Fetch image from URL and convert to base64
    async with httpx.AsyncClient() as http_client:
        image_response = await http_client.get(headshot_url)
        image_response.raise_for_status()
        image_bytes = image_response.content
        image_base64 = base64.standard_b64encode(image_bytes).decode('utf-8')

    # Build request using proper SDK format
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-3-flash-preview",
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": full_prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64
                        }
                    }
                ]
            }
        ],
    ) 

    for part in response.parts:
        if part.text is not None:
            print(part.text)

        elif part.inline_data is not None:
            image = part.as_image()
            
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            buffer.seek(0)
            return buffer.getvalue()
    
    raise RuntimeError("No image generated in response")