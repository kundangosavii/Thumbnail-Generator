from contextlib import asynccontextmanager
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware
from database import create_table
from routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_table()
    yield

app = FastAPI(
    title="Thumbnail Generator",
    lifespan = lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)