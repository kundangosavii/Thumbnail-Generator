from imagekitio import ImageKit
from config import IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT

imageKit = ImageKit(
    private_key=IMAGEKIT_PRIVATE_KEY,
)
url_endpoint=IMAGEKIT_URL_ENDPOINT


def upload_file(file_bytes: bytes, file_name: str, folder: str, content_type: str = 'jpeg/png'):

    """Uploads a file to ImageKit and returns the URL of the uploaded file."""

    result = imageKit.files.upload(
        file=(file_name, file_bytes, content_type),
        file_name=file_name,
        folder=folder,
        is_private_file=False,
        use_unique_file_name=True
    )

    return result.url

def get_variant(base_url: str):
    """Return 3 size of image: small, medium, large"""

    return {
        "youtube" : f"{base_url}?tr=w-1280,h-720,c-maintain-ratio,fo-auto",
        "short" : f"{base_url}?tr=w-400,h-400,c-maintain-ratio,fo-auto", 
        "square" : f"{base_url}?tr=w-400,h-400,c-maintain-ratio,fo-auto"
    }

