import os
import json
import time
import hashlib
import mimetypes
import concurrent.futures as cf
from io import BytesIO
from urllib.parse import urlparse
import requests
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root (.. relative to this scripts/ folder)
_DOTENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=_DOTENV_PATH, override=False)

# Config
JSON_PATH = os.environ.get("PINS_JSON", "pinterest_surrealism_urls.json")
BUCKET = os.environ.get("S3_BUCKET_NAME")            # set in your env
PREFIX = "pinterest-surrealism"                 # destination "directory" (S3 prefix)
MAX_WORKERS = int(os.environ.get("MAX_WORKERS", "16"))
TIMEOUT = (10, 30)                              # (connect, read)
HEADERS = {"User-Agent": "Mozilla/5.0 (Pinterest Importer)"}

AWS_REGION = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION")
s3 = boto3.client("s3", region_name=AWS_REGION) if AWS_REGION else boto3.client("s3")

if not BUCKET:
    raise RuntimeError(
        "AWS_S3_BUCKET is not set. Create a .env at project root with AWS_S3_BUCKET=your-bucket and AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)."
    )

def guess_ext(content_type: str, fallback: str = ".jpg") -> str:
    if not content_type:
        return fallback
    ext = mimetypes.guess_extension(content_type.split(";")[0].strip())
    return ext or fallback

def base_name_from_url(url: str) -> str:
    p = urlparse(url)
    name = os.path.basename(p.path)
    # strip pinterest size folders like /236x/..../file.jpg → keep actual file name
    return name or hashlib.md5(url.encode()).hexdigest()

def object_exists(key: str) -> bool:
    try:
        s3.head_object(Bucket=BUCKET, Key=key)
        return True
    except ClientError as e:
        if e.response["ResponseMetadata"]["HTTPStatusCode"] == 404:
            return False
        raise

def build_key(url: str, content_type: str | None) -> str:
    base = base_name_from_url(url)
    if "." not in base:
        base += guess_ext(content_type or "", ".jpg")
    key = f"{PREFIX}/{base}"
    # if same name already exists, add short hash suffix to avoid overwrite
    if object_exists(key):
        short = hashlib.md5(url.encode()).hexdigest()[:8]
        root, ext = os.path.splitext(base)
        key = f"{PREFIX}/{root}-{short}{ext or guess_ext(content_type or '')}"
    return key

def download(url: str) -> tuple[bytes, str | None]:
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, stream=True)
    r.raise_for_status()
    content_type = r.headers.get("Content-Type")
    data = r.content if r.content else b"".join(r.iter_content(chunk_size=65536))
    return data, content_type

def upload_one(url: str) -> tuple[str, bool, str | None]:
    try:
        data, content_type = download(url)
        key = build_key(url, content_type)
        s3.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=data,
            ContentType=content_type or "image/jpeg",
        )
        print(f"UPLOADED {key}", flush=True)
        return url, True, key
    except Exception as e:
        print(f"FAILED   {url}  ({e})", flush=True)
        return url, False, None

def main():
    with open(JSON_PATH, "r") as f:
        urls = json.load(f)
    print(f"Uploading {len(urls)} images to s3://{BUCKET}/{PREFIX}/ ...")
    t0 = time.time()

    ok = 0
    with cf.ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        for _, success, _ in ex.map(upload_one, urls):
            if success:
                ok += 1

    dt = time.time() - t0
    print(f"Done. Success: {ok}/{len(urls)} in {dt:.1f}s")

if __name__ == "__main__":
    main()