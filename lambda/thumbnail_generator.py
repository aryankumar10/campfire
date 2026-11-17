import io
import os
import urllib.parse
import boto3
from PIL import Image

s3 = boto3.client("s3")

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"}
THUMBNAIL_SIZE = (300, 300)
THUMBNAIL_QUALITY = 75


def handler(event, context):
    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

        if not key.startswith("uploads/"):
            continue

        _, ext = os.path.splitext(key.lower())
        if ext not in SUPPORTED_EXTENSIONS:
            continue

        process_thumbnail(bucket, key)


def process_thumbnail(bucket: str, key: str):
    response = s3.get_object(Bucket=bucket, Key=key)
    image_bytes = response["Body"].read()

    with Image.open(io.BytesIO(image_bytes)) as img:
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=THUMBNAIL_QUALITY, optimize=True)
        buf.seek(0)

    thumbnail_key = key.replace("uploads/", "thumbnails/", 1)
    base_without_ext, _ = os.path.splitext(thumbnail_key)
    thumbnail_key = base_without_ext + ".jpg"

    s3.put_object(
        Bucket=bucket,
        Key=thumbnail_key,
        Body=buf,
        ContentType="image/jpeg",
        CacheControl="max-age=604800",
    )
