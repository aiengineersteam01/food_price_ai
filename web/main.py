from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .model_manager import ModelManager
from .predictor import PricePredictor
from .schemas import (
    PredictionRequest,
    PredictionResponse,
)


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
INDEX_FILE = STATIC_DIR / "index.html"


app = FastAPI(
    title="Food Commodity Price Prediction System",
    description=(
        "AI-based food commodity price prediction system "
        "using multiple trained machine learning and "
        "deep learning models."
    ),
    version="1.0.0",
)


# Serve CSS, JavaScript and other frontend files
app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


model_manager = ModelManager()

predictor = PricePredictor(
    model_manager=model_manager
)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "Food Price AI API is running.",
    }


@app.get("/api")
def api_info():
    return {
        "name": "Food Commodity Price Prediction System",
        "version": "1.0.0",
        "default_model": model_manager.default_model_id,
        "models": model_manager.get_available_models(),
    }


@app.get("/api/dataset")
def dataset_info():
    return predictor.get_dataset_info()


@app.get("/api/commodities")
def get_commodities():
    commodities = predictor.get_commodities()

    return {
        "commodities": commodities,
        "count": len(commodities),
    }


@app.get("/api/markets")
def get_markets():
    markets = predictor.get_markets()

    return {
        "markets": markets,
        "count": len(markets),
    }


@app.get("/api/commodities/{commodity}/markets")
def get_markets_for_commodity(commodity: str):
    markets = predictor.get_markets_for_commodity(
        commodity
    )

    if not markets:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No markets found for commodity "
                f"'{commodity}'."
            ),
        )

    return {
        "commodity": commodity,
        "markets": markets,
        "count": len(markets),
    }


@app.get("/api/markets/{market}/commodities")
def get_commodities_for_market(market: str):
    commodities = predictor.get_commodities_for_market(
        market
    )

    if not commodities:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No commodities found for market "
                f"'{market}'."
            ),
        )

    return {
        "market": market,
        "commodities": commodities,
        "count": len(commodities),
    }


@app.get("/api/models")
def get_models():
    return {
        "default_model": model_manager.default_model_id,
        "models": model_manager.get_performance(),
    }


@app.post(
    "/api/predict",
    response_model=PredictionResponse,
)
def predict(request: PredictionRequest):

    model_id = (
        request.model_id
        or model_manager.default_model_id
    )

    try:
        result = predictor.predict_model(
            model_id=model_id,
            commodity=request.commodity,
            market=request.market,
            target_year=request.target_year,
            target_month=request.target_month,
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(exc)}",
        ) from exc


@app.post("/api/predict/all")
def predict_all(request: PredictionRequest):

    try:
        result = predictor.predict_all(
            commodity=request.commodity,
            market=request.market,
            target_year=request.target_year,
            target_month=request.target_month,
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(exc)}",
        ) from exc


@app.get("/", include_in_schema=False)
def serve_homepage():

    if not INDEX_FILE.exists():

        raise HTTPException(
            status_code=404,
            detail="Frontend index.html not found.",
        )

    return FileResponse(INDEX_FILE)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "web.main:app",
        host="0.0.0.0",
        port=7860,
    )