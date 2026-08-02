from fastapi import FastAPI

app = FastAPI(title="Rikkei AI Pipeline", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok"}