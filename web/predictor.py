from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from .model_manager import ModelManager


class PricePredictor:
    """
    Handles feature engineering and prediction for all trained models.

    Models supported:

        Round 1:
            - Linear Regression
            - Random Forest

        Round 2:
            - Linear Regression
            - Random Forest
            - Gradient Boosting
            - Stacking

        Deep Learning:
            - Neural Network
            - LSTM

    The prediction pipeline reproduces the preprocessing used
    during model training.
    """

    FEATURE_COLS = [
        "market",
        "commodity",
        "lag_1",
        "lag_2",
        "lag_3",
        "rolling_mean_3",
        "rolling_std_3",
        "month",
        "quarter",
        "year",
    ]

    NUMERIC_COLS = [
        "lag_1",
        "lag_2",
        "lag_3",
        "rolling_mean_3",
        "rolling_std_3",
        "month",
        "quarter",
        "year",
    ]

    ROUND1_MODEL_IDS = {
        "linear_regression_round1",
        "random_forest_round1",
    }

    CLASSICAL_MODEL_IDS = {
        "linear_regression_round1",
        "random_forest_round1",
        "linear_regression",
        "random_forest",
        "gradient_boosting",
        "stacking",
    }

    # ---------------------------------------------------------
    # Initialization
    # ---------------------------------------------------------

    def __init__(
        self,
        project_root: str | Path | None = None,
        model_manager: ModelManager | None = None,
    ):
        if project_root is None:
            project_root = (
                Path(__file__).resolve().parent.parent
            )

        self.project_root = Path(project_root)

        if model_manager is None:
            model_manager = ModelManager(
                self.project_root
            )

        self.model_manager = model_manager

        # Load original dataset.
        self.raw_df = self._load_raw_data()

        # Build both versions of the cleaned dataset.
        #
        # Round 1 reproduces the original cleaning.
        # Round 2 includes the notebook's bug fixes.
        self.food_df_round1 = self._clean_pipeline(
            self.raw_df,
            apply_bug_fixes=False,
        )

        self.food_df_round2 = self._clean_pipeline(
            self.raw_df,
            apply_bug_fixes=True,
        )

        # Load preprocessing artifacts.
        self.preprocessor_round1 = (
            self._load_joblib(
                "models/round1/preprocessor_round1.joblib"
            )
        )

        self.preprocessor_round2 = (
            self._load_joblib(
                "models/round2/preprocessor_round2.joblib"
            )
        )

        self.scaler_numeric = (
            self._load_joblib(
                "models/deep_learning/scaler_numeric.joblib"
            )
        )

        # The deep-learning models use the categorical
        # encoder from the Round 2 preprocessing pipeline.
        self.cat_encoder = (
            self.preprocessor_round2
            .named_transformers_["cat"]
        )

    # ---------------------------------------------------------
    # Dataset loading
    # ---------------------------------------------------------

    def _load_raw_data(self) -> pd.DataFrame:
        """
        Load the original WFP food-price dataset.
        """

        path = (
            self.project_root
            / "data"
            / "wfp_food_prices_sorted.csv"
        )

        if not path.exists():
            raise FileNotFoundError(
                f"Food price dataset not found: {path}"
            )

        df = pd.read_csv(path)

        if "date" not in df.columns:
            raise ValueError(
                "Dataset does not contain a 'date' column."
            )

        return df

    # ---------------------------------------------------------
    # Cleaning pipeline
    # ---------------------------------------------------------

    def _clean_pipeline(
        self,
        df: pd.DataFrame,
        apply_bug_fixes: bool = True,
    ) -> pd.DataFrame:
        """
        Reproduce the cleaning pipeline from the training notebook.

        Round 1:
            apply_bug_fixes=False

        Round 2:
            apply_bug_fixes=True
        """

        df = df.copy()

        # -----------------------------------------------------
        # Round 2 Rice correction
        # -----------------------------------------------------

        if apply_bug_fixes:
            rice_mask = (
                (df["commodity"] == "Rice (imported)")
                & (df["pricetype"] == "Retail")
                & (df["market"] == "Gode")
                & (
                    df["date"].between(
                        "2018-06-01",
                        "2018-08-31",
                    )
                )
            )

            df.loc[
                rice_mask,
                "price",
            ] = (
                df.loc[
                    rice_mask,
                    "price",
                ]
                / 100
            )

        # -----------------------------------------------------
        # Round 2 Sugar correction
        # -----------------------------------------------------

        if apply_bug_fixes:
            sugar_mask = (
                (df["commodity"] == "Sugar")
                & (df["pricetype"] == "Retail")
                & (df["date"] == "2022-11-15")
                & (
                    df["market"].isin(
                        [
                            "Moyale",
                            "Jijiga",
                            "Filtu",
                            "Charati",
                            "Dolo Ado",
                        ]
                    )
                )
                & (df["price"] > 1000)
            )

            df.loc[
                sugar_mask,
                "price",
            ] = (
                df.loc[
                    sugar_mask,
                    "price",
                ]
                / 100
            )

        # -----------------------------------------------------
        # Round 2 Coffee correction
        # -----------------------------------------------------

        if apply_bug_fixes:
            mechara_mask = (
                (df["commodity"] == "Coffee")
                & (df["pricetype"] == "Retail")
                & (df["market"] == "Mechara")
                & (df["date"] == "2024-01-15")
            )

            df.loc[
                mechara_mask,
                "price",
            ] = (
                df.loc[
                    mechara_mask,
                    "price",
                ]
                / 10
            )

        # -----------------------------------------------------
        # Retail data only
        # -----------------------------------------------------

        retail_df = df[
            df["pricetype"] == "Retail"
        ].copy()

        # -----------------------------------------------------
        # 100 KG conversion
        # -----------------------------------------------------

        is_wheat_100kg = (
            (retail_df["commodity"] == "Wheat")
            & (retail_df["unit"] == "100 KG")
        )

        other_100kg = (
            (retail_df["unit"] == "100 KG")
            & (~is_wheat_100kg)
        )

        if apply_bug_fixes:

            # Round 2:
            # Wheat before 2020 is relabeled as KG
            # without dividing the price.
            wheat_pre2020 = (
                is_wheat_100kg
                & (
                    retail_df["date"]
                    < "2020-01-01"
                )
            )

            # Round 2:
            # Wheat from 2020 onward is divided by 100.
            wheat_2020plus = (
                is_wheat_100kg
                & (
                    retail_df["date"]
                    >= "2020-01-01"
                )
            )

            retail_df.loc[
                wheat_pre2020,
                "unit",
            ] = "KG"

            retail_df.loc[
                wheat_2020plus,
                "price",
            ] = (
                retail_df.loc[
                    wheat_2020plus,
                    "price",
                ]
                / 100
            )

            retail_df.loc[
                wheat_2020plus,
                "unit",
            ] = "KG"

        else:

            # Round 1:
            # All Wheat 100 KG prices are divided by 100.
            retail_df.loc[
                is_wheat_100kg,
                "price",
            ] = (
                retail_df.loc[
                    is_wheat_100kg,
                    "price",
                ]
                / 100
            )

            retail_df.loc[
                is_wheat_100kg,
                "unit",
            ] = "KG"

        # -----------------------------------------------------
        # Other 100 KG commodities
        # -----------------------------------------------------

        retail_df.loc[
            other_100kg,
            "price",
        ] = (
            retail_df.loc[
                other_100kg,
                "price",
            ]
            / 100
        )

        retail_df.loc[
            other_100kg,
            "unit",
        ] = "KG"

        # -----------------------------------------------------
        # Remove non-food commodities
        # -----------------------------------------------------

        non_food_categories = [
            "Exchange rate (unofficial)",
            "Fuel (kerosene)",
            "Fuel (petrol-gasoline)",
            "Fuel (diesel)",
            "Wage (non-qualified labour)",
            "Wage (qualified labour)",
            "Wage (casual labour)",
            "Livestock (Sheep)",
            "Livestock (Goat)",
            "Livestock (bull)",
            "Livestock (camel)",
            "Livestock (cattle)",
            "Livestock (ox)",
            "Livestock (donkey)",
        ]

        food_df = retail_df[
            ~retail_df["commodity"].isin(
                non_food_categories
            )
        ].copy()

        # -----------------------------------------------------
        # Date conversion
        # -----------------------------------------------------

        food_df["date"] = pd.to_datetime(
            food_df["date"]
        )

        # -----------------------------------------------------
        # Prefer actual over aggregate
        # -----------------------------------------------------

        food_df["priceflag_rank"] = (
            food_df["priceflag"].map(
                {
                    "actual": 0,
                    "aggregate": 1,
                }
            )
        )

        food_df = food_df.sort_values(
            [
                "date",
                "market",
                "commodity",
                "priceflag_rank",
            ]
        )

        # -----------------------------------------------------
        # Remove duplicate market/commodity/date rows
        # -----------------------------------------------------

        food_df = food_df.drop_duplicates(
            subset=[
                "date",
                "market",
                "commodity",
            ],
            keep="first",
        )

        food_df = food_df.drop(
            columns=["priceflag_rank"]
        )

        # -----------------------------------------------------
        # Keep pairs with at least 24 observations
        # -----------------------------------------------------

        pair_counts = (
            food_df
            .groupby(
                [
                    "market",
                    "commodity",
                ]
            )
            .size()
        )

        eligible_pairs = pair_counts[
            pair_counts >= 24
        ].index

        food_df = food_df.set_index(
            [
                "market",
                "commodity",
            ]
        )

        food_df = food_df[
            food_df.index.isin(
                eligible_pairs
            )
        ]

        food_df = food_df.reset_index()

        return food_df

    # ---------------------------------------------------------
    # Monthly lag validation
    # ---------------------------------------------------------

    @staticmethod
    def _validated_lag(
        group_df: pd.DataFrame,
        position: int,
        periods: int,
        date_col: str = "date",
        value_col: str = "price",
        tolerance_days: int = 3,
    ) -> float:
        """
        Retrieve a lag only when the historical observation
        represents the expected monthly interval.

        This prevents a missing month from being incorrectly
        treated as a valid lag.
        """

        previous_position = (
            position - periods
        )

        if previous_position < 0:
            return np.nan

        current_date = group_df.iloc[
            position
        ][date_col]

        previous_date = group_df.iloc[
            previous_position
        ][date_col]

        expected_days = periods * 30.44

        actual_gap = (
            current_date - previous_date
        ).days

        lower = (
            expected_days
            - (
                10
                + tolerance_days * periods
            )
        )

        upper = (
            expected_days
            + (
                10
                + tolerance_days * periods
            )
        )

        if not (
            lower
            <= actual_gap
            <= upper
        ):
            return np.nan

        return float(
            group_df.iloc[
                previous_position
            ][value_col]
        )

    # ---------------------------------------------------------
    # Build prediction features
    # ---------------------------------------------------------

    def _build_inference_row(
        self,
        food_df: pd.DataFrame,
        market: str,
        commodity: str,
        source_date: pd.Timestamp,
    ) -> pd.DataFrame:
        """
        Build the feature row required by the trained models.

        The source date is the previous month's observation.

        Example:

            Target: August 2026
            Source: July 2026

        The lags are therefore calculated relative to July.
        """

        pair_df = food_df[
            (food_df["market"] == market)
            & (
                food_df["commodity"]
                == commodity
            )
        ].copy()

        if pair_df.empty:
            raise ValueError(
                f"No historical data found for "
                f"market='{market}' and "
                f"commodity='{commodity}'."
            )

        pair_df = pair_df.sort_values(
            "date"
        ).reset_index(drop=True)

        matching = pair_df.index[
            pair_df["date"] == source_date
        ].tolist()

        if not matching:
            raise ValueError(
                f"No observation exists for "
                f"{market} / {commodity} "
                f"on {source_date.strftime('%Y-%m-%d')}. "
                f"Choose a target month whose previous "
                f"month has available data."
            )

        position = matching[-1]

        # -----------------------------------------------------
        # Lag features
        # -----------------------------------------------------

        lag_1 = self._validated_lag(
            pair_df,
            position,
            1,
        )

        lag_2 = self._validated_lag(
            pair_df,
            position,
            2,
        )

        lag_3 = self._validated_lag(
            pair_df,
            position,
            3,
        )

        if any(
            pd.isna(x)
            for x in [
                lag_1,
                lag_2,
                lag_3,
            ]
        ):
            raise ValueError(
                f"Insufficient valid monthly history for "
                f"{market} / {commodity} "
                f"to predict {source_date.strftime('%Y-%m')}."
            )

        # -----------------------------------------------------
        # Rolling statistics
        # -----------------------------------------------------

        lag_values = np.array(
            [
                lag_1,
                lag_2,
                lag_3,
            ],
            dtype=float,
        )

        rolling_mean_3 = float(
            np.mean(lag_values)
        )

        rolling_std_3 = float(
            np.std(
                lag_values,
                ddof=1,
            )
        )

        # -----------------------------------------------------
        # Date features
        #
        # These reproduce the features used by the
        # trained prediction pipeline.
        # -----------------------------------------------------

        month = int(
            source_date.month
        )

        quarter = int(
            source_date.quarter
        )

        year = int(
            source_date.year
        )

        # -----------------------------------------------------
        # Create feature row
        # -----------------------------------------------------

        row = pd.DataFrame(
            [
                {
                    "market": market,
                    "commodity": commodity,
                    "lag_1": lag_1,
                    "lag_2": lag_2,
                    "lag_3": lag_3,
                    "rolling_mean_3": (
                        rolling_mean_3
                    ),
                    "rolling_std_3": (
                        rolling_std_3
                    ),
                    "month": month,
                    "quarter": quarter,
                    "year": year,
                }
            ]
        )

        return row

    # ---------------------------------------------------------
    # Load preprocessing artifacts
    # ---------------------------------------------------------

    def _load_joblib(
        self,
        relative_path: str,
    ):
        """
        Load a joblib artifact from the project root.
        """

        path = (
            self.project_root
            / relative_path
        )

        if not path.exists():
            raise FileNotFoundError(
                f"Required preprocessing file not found: "
                f"{path}"
            )

        return joblib.load(path)

    # ---------------------------------------------------------
    # Classical ML prediction
    # ---------------------------------------------------------

    def _predict_classical(
        self,
        model_id: str,
        feature_row: pd.DataFrame,
        round_number: int,
    ) -> float:
        """
        Predict using a classical machine-learning model.
        """

        if round_number == 1:
            preprocessor = (
                self.preprocessor_round1
            )
        else:
            preprocessor = (
                self.preprocessor_round2
            )

        X = preprocessor.transform(
            feature_row[
                self.FEATURE_COLS
            ]
        )

        model = self.model_manager.get_model(
            model_id
        )

        prediction = model.predict(X)

        return float(
            np.asarray(
                prediction
            ).reshape(-1)[0]
        )

    # ---------------------------------------------------------
    # Neural network prediction
    # ---------------------------------------------------------

    def _predict_neural_network(
        self,
        feature_row: pd.DataFrame,
    ) -> float:
        """
        Predict using the trained feed-forward neural network.
        """

        numeric_scaled = (
            self.scaler_numeric.transform(
                feature_row[
                    self.NUMERIC_COLS
                ]
            )
        )

        categorical = (
            self.cat_encoder.transform(
                feature_row[
                    [
                        "market",
                        "commodity",
                    ]
                ]
            )
        )

        if hasattr(
            categorical,
            "toarray",
        ):
            categorical = (
                categorical.toarray()
            )

        X = np.hstack(
            [
                categorical,
                numeric_scaled,
            ]
        )

        model = self.model_manager.get_model(
            "neural_network"
        )

        prediction = model.predict(
            X,
            verbose=0,
        )

        return float(
            np.asarray(
                prediction
            ).reshape(-1)[0]
        )

    # ---------------------------------------------------------
    # LSTM prediction
    # ---------------------------------------------------------

    def _predict_lstm(
        self,
        feature_row: pd.DataFrame,
    ) -> float:
        """
        Predict using the trained LSTM model.

        The LSTM receives:

            sequence:
                lag_3, lag_2, lag_1

            static features:
                market
                commodity
                month
                quarter
                year
        """

        numeric_scaled = (
            self.scaler_numeric.transform(
                feature_row[
                    self.NUMERIC_COLS
                ]
            )
        )

        # NUMERIC_COLS indexes:
        #
        # 0 = lag_1
        # 1 = lag_2
        # 2 = lag_3
        #
        # Reverse to:
        #
        # lag_3 -> lag_2 -> lag_1
        sequence = (
            numeric_scaled[
                :,
                [2, 1, 0],
            ]
            .reshape(
                -1,
                3,
                1,
            )
        )

        categorical = (
            self.cat_encoder.transform(
                feature_row[
                    [
                        "market",
                        "commodity",
                    ]
                ]
            )
        )

        if hasattr(
            categorical,
            "toarray",
        ):
            categorical = (
                categorical.toarray()
            )

        # NUMERIC_COLS indexes:
        #
        # 5 = month
        # 6 = quarter
        # 7 = year
        static_numeric = (
            numeric_scaled[
                :,
                [5, 6, 7],
            ]
        )

        static_features = np.hstack(
            [
                categorical,
                static_numeric,
            ]
        )

        model = self.model_manager.get_model(
            "lstm"
        )

        prediction = model.predict(
            [
                sequence,
                static_features,
            ],
            verbose=0,
        )

        return float(
            np.asarray(
                prediction
            ).reshape(-1)[0]
        )

    # ---------------------------------------------------------
    # Actual price lookup
    # ---------------------------------------------------------

    def _get_actual_price(
        self,
        food_df: pd.DataFrame,
        market: str,
        commodity: str,
        target_date: pd.Timestamp,
    ) -> float | None:
        """
        Look up the actual observed price for the target date.

        The same cleaned dataset used by the selected model
        is used for the actual-value lookup.

        Returns:
            float:
                Actual observed price if available.

            None:
                If the target date is not present in the
                cleaned dataset.
        """

        matching = food_df[
            (food_df["market"] == market)
            & (
                food_df["commodity"]
                == commodity
            )
            & (
                food_df["date"]
                == target_date
            )
        ]

        if matching.empty:
            return None

        return float(
            matching.iloc[0]["price"]
        )

    # ---------------------------------------------------------
    # Single-model prediction
    # ---------------------------------------------------------

    def predict_model(
        self,
        model_id: str,
        commodity: str,
        market: str,
        target_year: int,
        target_month: int,
    ) -> dict[str, Any]:
        """
        Generate a prediction for one model.

        The selected target month is the month being predicted.

        Example:

            target_year = 2026
            target_month = 8

        means:

            Target date = 2026-08-15
            Source date = 2026-07-15

        If the target month already exists in the dataset,
        the actual price is also returned.
        """

        # -----------------------------------------------------
        # Validate month
        # -----------------------------------------------------

        if not 1 <= int(target_month) <= 12:
            raise ValueError(
                "target_month must be between 1 and 12."
            )

        # -----------------------------------------------------
        # Build target/source dates
        # -----------------------------------------------------

        target_date = pd.Timestamp(
            year=int(target_year),
            month=int(target_month),
            day=15,
        )

        source_date = (
            target_date
            - pd.DateOffset(
                months=1
            )
        )

        # -----------------------------------------------------
        # Select correct cleaned dataset
        # -----------------------------------------------------

        if model_id in self.ROUND1_MODEL_IDS:

            food_df = (
                self.food_df_round1
            )

            round_number = 1

        else:

            food_df = (
                self.food_df_round2
            )

            round_number = 2

        # -----------------------------------------------------
        # Build feature row
        # -----------------------------------------------------

        feature_row = (
            self._build_inference_row(
                food_df=food_df,
                market=market,
                commodity=commodity,
                source_date=source_date,
            )
        )

        # -----------------------------------------------------
        # Generate prediction
        # -----------------------------------------------------

        if model_id in self.CLASSICAL_MODEL_IDS:

            prediction = (
                self._predict_classical(
                    model_id=model_id,
                    feature_row=feature_row,
                    round_number=round_number,
                )
            )

        elif model_id == "neural_network":

            prediction = (
                self._predict_neural_network(
                    feature_row
                )
            )

        elif model_id == "lstm":

            prediction = (
                self._predict_lstm(
                    feature_row
                )
            )

        else:

            raise ValueError(
                f"Unsupported model: {model_id}"
            )

        # -----------------------------------------------------
        # Find actual target-month price
        # -----------------------------------------------------

        actual_price = (
            self._get_actual_price(
                food_df=food_df,
                market=market,
                commodity=commodity,
                target_date=target_date,
            )
        )

        # -----------------------------------------------------
        # Calculate prediction error
        # -----------------------------------------------------

        if actual_price is not None:

            absolute_error = abs(
                prediction - actual_price
            )

            if actual_price != 0:

                percentage_error = (
                    absolute_error
                    / abs(actual_price)
                    * 100
                )

            else:

                percentage_error = None

        else:

            absolute_error = None
            percentage_error = None

        # -----------------------------------------------------
        # Return complete prediction result
        # -----------------------------------------------------

        return {
            "model_id": model_id,

            "model_name": (
                self.model_manager
                .get_model_name(
                    model_id
                )
            ),

            "prediction": prediction,

            "actual_price": actual_price,

            "actual_available": (
                actual_price is not None
            ),

            "absolute_error": (
                absolute_error
            ),

            "percentage_error": (
                percentage_error
            ),

            "unit": "ETB/KG",

            "commodity": commodity,

            "market": market,

            "target_year": int(
                target_year
            ),

            "target_month": int(
                target_month
            ),

            "target_date": (
                target_date.strftime(
                    "%Y-%m-%d"
                )
            ),

            "source_date": (
                source_date.strftime(
                    "%Y-%m-%d"
                )
            ),

            "features": {
                "lag_1": float(
                    feature_row.iloc[0][
                        "lag_1"
                    ]
                ),

                "lag_2": float(
                    feature_row.iloc[0][
                        "lag_2"
                    ]
                ),

                "lag_3": float(
                    feature_row.iloc[0][
                        "lag_3"
                    ]
                ),

                "rolling_mean_3": float(
                    feature_row.iloc[0][
                        "rolling_mean_3"
                    ]
                ),

                "rolling_std_3": float(
                    feature_row.iloc[0][
                        "rolling_std_3"
                    ]
                ),

                "month": int(
                    feature_row.iloc[0][
                        "month"
                    ]
                ),

                "quarter": int(
                    feature_row.iloc[0][
                        "quarter"
                    ]
                ),

                "year": int(
                    feature_row.iloc[0][
                        "year"
                    ]
                ),
            },
        }

    # ---------------------------------------------------------
    # Predict using all available models
    # ---------------------------------------------------------

    def predict_all(
        self,
        commodity: str,
        market: str,
        target_year: int,
        target_month: int,
    ) -> dict[str, Any]:
        """
        Run the selected commodity, market, and target date
        through every available model.
        """

        results = []

        for model_info in (
            self.model_manager
            .get_available_models()
        ):

            model_id = (
                model_info["model_id"]
            )

            if not model_info["available"]:
                continue

            try:

                result = (
                    self.predict_model(
                        model_id=model_id,
                        commodity=commodity,
                        market=market,
                        target_year=target_year,
                        target_month=target_month,
                    )
                )

                results.append(
                    result
                )

            except Exception as exc:

                results.append(
                    {
                        "model_id": model_id,

                        "model_name": (
                            model_info[
                                "model_name"
                            ]
                        ),

                        "prediction": None,

                        "actual_price": None,

                        "actual_available": False,

                        "absolute_error": None,

                        "percentage_error": None,

                        "error": str(exc),
                    }
                )

        # -----------------------------------------------------
        # Identify default model result
        # -----------------------------------------------------

        default_model_id = (
            self.model_manager
            .default_model_id
        )

        default_result = None

        for result in results:

            if (
                result.get("model_id")
                == default_model_id
                and result.get(
                    "prediction"
                )
                is not None
            ):

                default_result = result
                break

        # -----------------------------------------------------
        # Return complete comparison
        # -----------------------------------------------------

        return {
            "commodity": commodity,

            "market": market,

            "target_year": int(
                target_year
            ),

            "target_month": int(
                target_month
            ),

            "default_model": (
                default_model_id
            ),

            "default_prediction": (
                default_result
            ),

            "predictions": results,
        }

    # ---------------------------------------------------------
    # Commodity list
    # ---------------------------------------------------------

    def get_commodities(
        self,
    ) -> list[str]:
        """
        Return all commodities available for prediction.
        """

        return sorted(
            self.food_df_round2[
                "commodity"
            ]
            .dropna()
            .unique()
            .tolist()
        )

    # ---------------------------------------------------------
    # Market list
    # ---------------------------------------------------------

    def get_markets(
        self,
    ) -> list[str]:
        """
        Return all markets available for prediction.
        """

        return sorted(
            self.food_df_round2[
                "market"
            ]
            .dropna()
            .unique()
            .tolist()
        )

    # ---------------------------------------------------------
    # Markets for commodity
    # ---------------------------------------------------------

    def get_markets_for_commodity(
        self,
        commodity: str,
    ) -> list[str]:
        """
        Return markets with historical data
        for the selected commodity.
        """

        df = self.food_df_round2[
            self.food_df_round2[
                "commodity"
            ]
            == commodity
        ]

        return sorted(
            df["market"]
            .dropna()
            .unique()
            .tolist()
        )

    # ---------------------------------------------------------
    # Commodities for market
    # ---------------------------------------------------------

    def get_commodities_for_market(
        self,
        market: str,
    ) -> list[str]:
        """
        Return commodities with historical data
        for the selected market.
        """

        df = self.food_df_round2[
            self.food_df_round2[
                "market"
            ]
            == market
        ]

        return sorted(
            df["commodity"]
            .dropna()
            .unique()
            .tolist()
        )

    # ---------------------------------------------------------
    # Dataset information
    # ---------------------------------------------------------

    def get_dataset_info(
        self,
    ) -> dict[str, Any]:
        """
        Return basic information about the cleaned dataset.
        """

        dates = self.food_df_round2[
            "date"
        ]

        return {
            "raw_rows": int(
                len(self.raw_df)
            ),

            "cleaned_rows": int(
                len(
                    self.food_df_round2
                )
            ),

            "commodities": int(
                self.food_df_round2[
                    "commodity"
                ].nunique()
            ),

            "markets": int(
                self.food_df_round2[
                    "market"
                ].nunique()
            ),

            "first_date": (
                dates.min().strftime(
                    "%Y-%m-%d"
                )
            ),

            "last_date": (
                dates.max().strftime(
                    "%Y-%m-%d"
                )
            ),
        }