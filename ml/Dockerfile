# Haemologix ML model service
#   docker build --platform linux/amd64 -t haemologix-ml -f ml/Dockerfile .
#   docker run -p 8000:8000 -e ML_API_SECRET=... haemologix-ml
#
# Build context is the repo root; only ml/ is copied. The tracked ml/checkpoints/
# (model versions + `active` pointer) are baked into the image, so App Runner needs
# no volume — promoting a model = commit the checkpoints + push (see ml/DEPLOY.md).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ML_MODEL_DIR=/app/checkpoints \
    API_HOST=0.0.0.0 \
    API_PORT=8000

WORKDIR /app

COPY ml/requirements.txt ./requirements.txt
# CPU-only torch keeps the image small
RUN pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

COPY ml/haemologix ./haemologix
COPY ml/serve.py ./serve.py

# Model versions + `active` pointer (tracked in git) — what this image serves.
COPY ml/checkpoints ./checkpoints

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).status==200 else 1)"

CMD ["python", "serve.py"]
