import asyncio
from io import BytesIO
from google import genai

from config import GENAI_API_KEY

client = genai.Client(api_key=GENAI_API_KEY)

async def generate_thumbnail(prompt: str, style_prompt: str, headshot_url: str) -> bytes:
    """
    Use Response API to generate a thumbnail image based on the provided prompts and headshot URL.
    Returns the generated image as raw PNG bytes.
    """

    full_prompt= (
        f"{style_prompt}\n"
        f"user request: {prompt}\n"

        "IMPORTANT: The generated thumbnail MUST prominently features the headshot image provided in the URL, and the headshot should be the main focus of the thumbnail."
        "shown in the provided reference headshot Image. Keep their LIKENESS accurately."
    )

    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-3.1-flash-image-preview",
        contents=[
            {"type": "text", "text": full_prompt},
            {"type": "input_image", "image_url": headshot_url}
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