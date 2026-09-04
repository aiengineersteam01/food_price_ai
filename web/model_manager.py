from pathlib import Path
from typing import Any

import joblib
import pandas as pd


class ModelManager:
    """
    Loads and manages all trained models used by the food price
    prediction web application.

    Models included:
        - Round 1 - Linear Regression
        - Round 1 - Random Forest
        - Round 2 - Linear Regression
        - Round 2 - Random Forest
        - Round 2 - Gradient Boosting
        - Round 2 - Stacking
        - Deep Learning - LSTM
        - Deep Learning - Neural Network
    """

    MODEL_DEFINITIONS = {
        # ---------------------------------------------------------
        # ROUND 2 CLASSICAL MODELS
        # ---------------------------------------------------------
        "gradient_boosting": {
            "name": "Round 2 - Gradient Boosting",
            "path": "models/round2/gradient_boosting.joblib",
            "type": "joblib",
            "round": "Round 2",
            "category": "Classical Machine Learning",
        },

        "stacking": {
            "name": "Round 2 - Stacking",
            "path": "models/round2/stacking.joblib",
            "type": "joblib",
            "round": "Round 2",
            "category": "Classical Machine Learning",
        },

        "linear_regression": {
            "name": "Round 2 - Linear Regression",
            "path": "models/round2/linear_regression.joblib",
            "type": "joblib",
            "round": "Round 2",
            "category": "Classical Machine Learning",
        },

        "random_forest": {
            "name": "Round 2 - Random Forest",
            "path": "models/round2/random_forest.joblib",
            "type": "joblib",
            "round": "Round 2",
            "category": "Classical Machine Learning",
        },

        # ---------------------------------------------------------
        # DEEP LEARNING MODELS
        # ---------------------------------------------------------
        "lstm": {
            "name": "Deep Learning - LSTM",
            "path": "models/deep_learning/lstm.keras",
            "type": "keras",
            "round": "Deep Learning",
            "category": "Deep Learning",
        },

        "neural_network": {
            "name": "Deep Learning - Neural Network",
            "path": "models/deep_learning/neural_network.keras",
            "type": "keras",
            "round": "Deep Learning",
            "category": "Deep Learning",
        },

        # ---------------------------------------------------------
        # ROUND 1 CLASSICAL MODELS
        # ---------------------------------------------------------
        "linear_regression_round1": {
            "name": "Round 1 - Linear Regression",
            "path": "models/round1/linear_regression_round1.joblib",
            "type": "joblib",
            "round": "Round 1",
            "category": "Classical Machine Learning",
        },

        "random_forest_round1": {
            "name": "Round 1 - Random Forest",
            "path": "models/round1/random_forest_round1.joblib",
            "type": "joblib",
            "round": "Round 1",
            "category": "Classical Machine Learning",
        },
    }

    # The website uses LSTM as the default because it had the
    # lowest MAE in the notebook's final comparison.
    DEFAULT_MODEL_ORDER = [
        "lstm",
        "gradient_boosting",
        "stacking",
        "linear_regression",
        "neural_network",
        "random_forest",
        "linear_regression_round1",
        "random_forest_round1",
    ]

    def __init__(self, project_root: str | Path | None = None):
        """
        Initialize the model manager.

        If project_root is not supplied, the project root is assumed
        to be the directory containing the web/ folder.
        """

        if project_root is None:
            project_root = Path(__file__).resolve().parent.parent

        self.project_root = Path(project_root)

        self.models: dict[str, Any] = {}

        # Load model performance information.
        self.performance = self._load_performance()

        # Load every available trained model.
        self._load_all_models()

        if not self.models:
            raise RuntimeError(
                "No trained models could be loaded. "
                "Please check the models directory."
            )

        # Select the default model.
        self.default_model_id = self._select_default_model()

    # =============================================================
    # PERFORMANCE
    # =============================================================

    def _load_performance(self) -> pd.DataFrame:
        """
        Load final model comparison results.
        """

        path = (
            self.project_root
            / "models"
            / "final_comparison.csv"
        )

        if not path.exists():
            raise FileNotFoundError(
                f"Final model comparison file not found: {path}"
            )

        df = pd.read_csv(path)

        # Normalize column names.
        df.columns = [
            str(column)
            .strip()
            .lower()
            .replace(" ", "_")
            for column in df.columns
        ]

        return df

    def get_performance(self) -> list[dict[str, Any]]:
        """
        Return performance information for all recognized models.

        The result includes:
            model_id
            model_name
            mae
            mse
            rmse
            r2
            available
            round
            category
        """

        model_column = self._find_column(
            [
                "model",
                "model_name",
                "name",
            ]
        )

        if model_column is None:
            return []

        result = []

        for _, row in self.performance.iterrows():

            model_label = str(row[model_column])

            model_id = self._performance_row_to_model_id(
                model_label
            )

            if model_id is None:
                continue

            definition = self.MODEL_DEFINITIONS.get(
                model_id,
                {},
            )

            result.append(
                {
                    "model_id": model_id,
                    "model_name": self.get_model_name(model_id),
                    "mae": self._safe_float(
                        row,
                        "mae",
                    ),
                    "mse": self._safe_float(
                        row,
                        "mse",
                    ),
                    "rmse": self._safe_float(
                        row,
                        "rmse",
                    ),
                    "r2": self._safe_float(
                        row,
                        "r2",
                    ),
                    "available": model_id in self.models,
                    "round": definition.get(
                        "round"
                    ),
                    "category": definition.get(
                        "category"
                    ),
                }
            )

        return result

    # =============================================================
    # MODEL LOADING
    # =============================================================

    def _load_all_models(self) -> None:
        """
        Load all trained models defined in MODEL_DEFINITIONS.
        """

        for model_id, definition in self.MODEL_DEFINITIONS.items():

            path = self.project_root / definition["path"]

            if not path.exists():
                print(
                    f"[ModelManager] Model file not found: "
                    f"{path}"
                )
                continue

            try:

                if definition["type"] == "joblib":

                    model = joblib.load(path)

                elif definition["type"] == "keras":

                    model = self._load_keras_model(path)

                else:

                    raise ValueError(
                        f"Unsupported model type: "
                        f"{definition['type']}"
                    )

                self.models[model_id] = model

                print(
                    f"[ModelManager] Loaded: "
                    f"{model_id} -> {path}"
                )

            except Exception as exc:

                print(
                    f"[ModelManager] Failed to load "
                    f"{model_id}: {exc}"
                )

    @staticmethod
    def _load_keras_model(path: Path):
        """
        Load a Keras model from a .keras file.
        """

        import tensorflow as tf

        return tf.keras.models.load_model(path)

    # =============================================================
    # DEFAULT MODEL
    # =============================================================

    def _select_default_model(self) -> str:
        """
        Select the default model.

        The model with the lowest MAE is preferred when performance
        information is available.

        Otherwise DEFAULT_MODEL_ORDER is used.
        """

        model_column = self._find_column(
            [
                "model",
                "model_name",
                "name",
            ]
        )

        mae_column = self._find_column(
            [
                "mae",
            ]
        )

        if model_column is not None and mae_column is not None:

            available_rows = []

            for _, row in self.performance.iterrows():

                model_id = self._performance_row_to_model_id(
                    str(row[model_column])
                )

                if model_id not in self.models:
                    continue

                try:
                    mae = float(
                        row[mae_column]
                    )

                except (
                    TypeError,
                    ValueError,
                ):
                    continue

                available_rows.append(
                    (
                        mae,
                        model_id,
                    )
                )

            if available_rows:

                available_rows.sort(
                    key=lambda item: item[0]
                )

                return available_rows[0][1]

        # Fallback order.
        for model_id in self.DEFAULT_MODEL_ORDER:

            if model_id in self.models:
                return model_id

        # Final fallback.
        return next(
            iter(self.models)
        )

    # =============================================================
    # GET MODEL
    # =============================================================

    def get_model(
        self,
        model_id: str | None = None,
    ):
        """
        Return a loaded model.

        If model_id is None, return the default model.
        """

        if model_id is None:
            model_id = self.default_model_id

        if model_id not in self.models:

            available = ", ".join(
                self.models.keys()
            )

            raise ValueError(
                f"Model '{model_id}' is not available. "
                f"Available models: {available}"
            )

        return self.models[model_id]

    # =============================================================
    # MODEL INFORMATION
    # =============================================================

    def get_model_name(
        self,
        model_id: str,
    ) -> str:
        """
        Return the human-readable model name.
        """

        definition = self.MODEL_DEFINITIONS.get(
            model_id
        )

        if definition is None:
            return model_id

        return definition["name"]

    def get_model_info(
        self,
        model_id: str,
    ) -> dict[str, Any]:
        """
        Return detailed information about one model.
        """

        if model_id not in self.MODEL_DEFINITIONS:

            raise ValueError(
                f"Unknown model: {model_id}"
            )

        definition = self.MODEL_DEFINITIONS[
            model_id
        ]

        return {
            "model_id": model_id,
            "model_name": definition["name"],
            "round": definition["round"],
            "category": definition["category"],
            "available": model_id in self.models,
            "is_default": (
                model_id == self.default_model_id
            ),
            "path": definition["path"],
        }

    def get_available_models(
        self,
    ) -> list[dict[str, Any]]:
        """
        Return information about every model.

        This includes models that failed to load, with
        available=False.
        """

        return [
            {
                "model_id": model_id,
                "model_name": self.get_model_name(
                    model_id
                ),
                "available": model_id in self.models,
                "is_default": (
                    model_id == self.default_model_id
                ),
                "round": definition["round"],
                "category": definition["category"],
            }

            for model_id, definition
            in self.MODEL_DEFINITIONS.items()
        ]

    # =============================================================
    # HELPERS
    # =============================================================

    def _find_column(
        self,
        candidates: list[str],
    ) -> str | None:
        """
        Find the first matching column in the performance
        DataFrame.
        """

        columns = set(
            self.performance.columns
        )

        for candidate in candidates:

            if candidate in columns:
                return candidate

        return None

    @staticmethod
    def _safe_float(
        row: pd.Series,
        column: str,
    ) -> float | None:
        """
        Safely convert a DataFrame value to float.
        """

        if column not in row.index:
            return None

        try:
            return float(
                row[column]
            )

        except (
            TypeError,
            ValueError,
        ):
            return None

    # =============================================================
    # CSV MODEL NAME -> INTERNAL MODEL ID
    # =============================================================

    def _performance_row_to_model_id(
        self,
        model_label: str,
    ) -> str | None:
        """
        Convert the human-readable model name from
        final_comparison.csv into the internal model ID.

        Examples:

            Deep Learning - LSTM
                -> lstm

            Round 2 - Gradient Boosting
                -> gradient_boosting

            Round 1 - Random Forest
                -> random_forest_round1
        """

        label = (
            model_label
            .strip()
            .lower()
        )

        mapping = {
            # Deep Learning
            "deep learning - lstm":
                "lstm",

            "deep learning - neural network":
                "neural_network",

            # Round 2
            "round 2 - gradient boosting":
                "gradient_boosting",

            "round 2 - stacking":
                "stacking",

            "round 2 - linear regression":
                "linear_regression",

            "round 2 - random forest":
                "random_forest",

            # Round 1
            "round 1 - linear regression":
                "linear_regression_round1",

            "round 1 - random forest":
                "random_forest_round1",
        }

        return mapping.get(label)