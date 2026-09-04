from typing import Optional

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    commodity: str = Field(
        ...,
        description="Food commodity to predict.",
    )

    market: str = Field(
        ...,
        description="Market where the commodity is sold.",
    )

    target_year: int = Field(
        ...,
        ge=2000,
        le=2100,
        description="Year of the target month.",
    )

    target_month: int = Field(
        ...,
        ge=1,
        le=12,
        description="Month to predict.",
    )

    model_id: Optional[str] = Field(
        default=None,
        description=(
            "Model to use. If omitted, the default "
            "model is used."
        ),
    )


class PredictionResponse(BaseModel):
    model_id: str
    model_name: str

    prediction: float

    actual_price: Optional[float] = None
    actual_available: bool = False

    absolute_error: Optional[float] = None
    percentage_error: Optional[float] = None

    unit: str

    commodity: str
    market: str

    target_year: int
    target_month: int

    target_date: str
    source_date: str

    features: dict


class ModelPerformance(BaseModel):
    model_id: str
    model_name: str

    mae: float
    mse: float
    rmse: float
    r2: float

    available: bool
    round: int
    category: str