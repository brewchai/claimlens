FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir fastapi uvicorn httpx pydantic python-dotenv redis asyncpg youtube-transcript-api yt-dlp tiktoken
COPY claimlens ./claimlens
EXPOSE 8080
CMD ["uvicorn", "claimlens.main:app", "--host", "0.0.0.0", "--port", "8080"]