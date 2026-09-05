// Food Price AI - Frontend JavaScript

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});


// ============================================================
// GLOBAL STATE
// ============================================================

window.foodPriceLastRequest = null;
window.foodPricePerformance = [];
window.selectedFoodPriceModel = "lstm";


// ============================================================
// INITIALIZATION
// ============================================================

async function initializeApp() {
    setupNavigation();
    setupPredictionForm();
    setupModelSelector();
    setupMenu();

    // Load lightweight model performance information.
    // This does NOT load the actual ML model files.
    await loadModelPerformance();
}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {
    const homeButtons = document.querySelectorAll("[data-page='home']");
    
    homeButtons.forEach(button => {
        button.addEventListener("click", () => {
            showPage("home");
        });
    });

    const aboutButtons = document.querySelectorAll("[data-page='about']");
    
    aboutButtons.forEach(button => {
        button.addEventListener("click", () => {
            showPage("about");
        });
    });

    const contactButtons = document.querySelectorAll("[data-page='contact']");
    
    contactButtons.forEach(button => {
        button.addEventListener("click", () => {
            showPage("contact");
        });
    });

    const guideButtons = document.querySelectorAll("[data-page='guide']");
    
    guideButtons.forEach(button => {
        button.addEventListener("click", () => {
            showPage("guide");
        });
    });
}


function showPage(pageName) {
    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.remove("active");
    });

    const targetPage = document.getElementById(`${pageName}-page`);

    if (targetPage) {
        targetPage.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// THREE-DOT MENU
// ============================================================

function setupMenu() {
    const menuButton = document.querySelector(".menu-button");
    const menu = document.querySelector(".dropdown-menu");

    if (!menuButton || !menu) {
        return;
    }

    menuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.classList.toggle("show");
    });

    document.addEventListener("click", () => {
        menu.classList.remove("show");
    });

    menu.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}


// ============================================================
// PREDICTION FORM
// ============================================================

function setupPredictionForm() {
    const form = document.getElementById("prediction-form");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const commodityElement = document.getElementById("commodity");
        const marketElement = document.getElementById("market");
        const monthElement = document.getElementById("month");
        const yearElement = document.getElementById("year");
        const modelElement = document.getElementById("model");

        if (
            !commodityElement ||
            !marketElement ||
            !monthElement ||
            !yearElement
        ) {
            console.error("Prediction form fields are missing.");
            return;
        }

        const modelId =
            modelElement?.value ||
            window.selectedFoodPriceModel ||
            "lstm";

        const request = {
            commodity: commodityElement.value,
            market: marketElement.value,
            month: parseInt(monthElement.value),
            year: parseInt(yearElement.value),
            model_id: modelId
        };

        await makePrediction(request);
    });
}


// ============================================================
// MAKE ONE PREDICTION
// ============================================================

async function makePrediction(request) {
    try {
        showLoading();

        // Save the request so that changing the model can
        // repeat the same prediction with ONLY the new model.
        window.foodPriceLastRequest = {
            ...request
        };

        const modelId =
            request.model_id ||
            window.selectedFoodPriceModel ||
            "lstm";

        window.selectedFoodPriceModel = modelId;

        const payload = {
            commodity: request.commodity,
            market: request.market,
            month: request.month,
            year: request.year,
            model_id: modelId
        };

        console.log("Sending prediction request:", payload);

        // IMPORTANT:
        // Use /api/predict, NOT /api/predict/all.
        //
        // /api/predict/all loads every model and causes the
        // Render 512 MB instance to run out of memory.
        const response = await fetch("/api/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMessage = `Prediction failed (${response.status})`;

            try {
                const errorData = await response.json();

                if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (error) {
                console.error("Could not read error response:", error);
            }

            throw new Error(errorMessage);
        }

        const rawData = await response.json();

        console.log("Prediction response:", rawData);

        hideLoading();

        /*
         * The backend /api/predict endpoint returns ONE model result.
         *
         * The existing results page was designed around an array
         * called "predictions", so we normalize the response here.
         */
        const data = {
            ...rawData,
            default_model: rawData.model_id || modelId,
            predictions: [rawData]
        };

        window.foodPriceLastResult = data;

        displayResults(data);

    } catch (error) {
        console.error("Prediction error:", error);

        hideLoading();

        showUnavailable(
            error.message ||
            "Unable to make the prediction. Please try again."
        );
    }
}


// ============================================================
// LOADING SCREEN
// ============================================================

function showLoading() {
    const loadingPage = document.getElementById("loading-page");

    if (loadingPage) {
        loadingPage.classList.add("active");
    }

    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        if (page.id !== "loading-page") {
            page.classList.remove("active");
        }
    });

    // Keep the AI loading experience visible for at least 5 seconds.
    window.predictionLoadingStart = Date.now();
}


async function hideLoading() {
    const start = window.predictionLoadingStart || Date.now();

    const elapsed = Date.now() - start;
    const minimumLoadingTime = 5000;

    if (elapsed < minimumLoadingTime) {
        await new Promise(resolve => {
            setTimeout(
                resolve,
                minimumLoadingTime - elapsed
            );
        });
    }

    const loadingPage = document.getElementById("loading-page");

    if (loadingPage) {
        loadingPage.classList.remove("active");
    }
}


// ============================================================
// RESULTS
// ============================================================

function displayResults(data) {
    const resultsPage = document.getElementById("results-page");

    if (!resultsPage) {
        console.error("Results page not found.");
        return;
    }

    const predictions = data.predictions || [];

    if (predictions.length === 0) {
        showUnavailable("No prediction result was returned.");
        return;
    }

    const prediction = predictions[0];

    populateResultDetails(prediction);

    populateModelSelector(prediction);

    resultsPage.classList.add("active");

    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        if (page.id !== "results-page") {
            page.classList.remove("active");
        }
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// RESULT DETAILS
// ============================================================

function populateResultDetails(prediction) {
    /*
     * The exact element IDs may differ depending on the current
     * HTML. We check multiple common IDs so the frontend remains
     * compatible with the existing page.
     */

    setText(
        [
            "result-commodity",
            "prediction-commodity"
        ],
        prediction.commodity
    );

    setText(
        [
            "result-market",
            "prediction-market"
        ],
        prediction.market
    );

    setText(
        [
            "result-month",
            "prediction-month"
        ],
        formatMonth(prediction.month)
    );

    setText(
        [
            "result-year",
            "prediction-year"
        ],
        prediction.year
    );

    setText(
        [
            "result-model",
            "prediction-model",
            "selected-model"
        ],
        formatModelName(
            prediction.model_id ||
            prediction.model ||
            window.selectedFoodPriceModel
        )
    );

    const predictedPrice =
        prediction.predicted_price ??
        prediction.prediction ??
        prediction.price;

    if (predictedPrice !== undefined && predictedPrice !== null) {
        setText(
            [
                "predicted-price",
                "prediction-price",
                "result-price"
            ],
            formatPrice(predictedPrice)
        );
    }

    const actualPrice =
        prediction.actual_price ??
        prediction.actual;

    if (actualPrice !== undefined && actualPrice !== null) {
        setText(
            [
                "actual-price",
                "result-actual"
            ],
            formatPrice(actualPrice)
        );
    }

    const absoluteError =
        prediction.absolute_error ??
        prediction.error;

    if (absoluteError !== undefined && absoluteError !== null) {
        setText(
            [
                "absolute-error",
                "result-error"
            ],
            formatPrice(absoluteError)
        );
    }

    const percentageError =
        prediction.percentage_error ??
        prediction.percent_error ??
        prediction.pct_error;

    if (
        percentageError !== undefined &&
        percentageError !== null
    ) {
        setText(
            [
                "percentage-error",
                "result-percentage-error"
            ],
            `${Number(percentageError).toFixed(2)}%`
        );
    }

    displayHistoricalInformation(prediction);
}


// ============================================================
// HISTORICAL INFORMATION
// ============================================================

function displayHistoricalInformation(prediction) {
    const actualPrice =
        prediction.actual_price ??
        prediction.actual;

    const historicalSection =
        document.getElementById("historical-section");

    if (!historicalSection) {
        return;
    }

    if (
        actualPrice !== undefined &&
        actualPrice !== null &&
        actualPrice !== ""
    ) {
        historicalSection.style.display = "block";
    } else {
        historicalSection.style.display = "none";
    }
}


// ============================================================
// MODEL SELECTOR
// ============================================================

function setupModelSelector() {
    const selector =
        document.getElementById("model-selector") ||
        document.getElementById("model");

    if (!selector) {
        return;
    }

    selector.addEventListener("change", async function () {
        const selectedModel = this.value;

        if (!selectedModel) {
            return;
        }

        window.selectedFoodPriceModel = selectedModel;

        /*
         * If the user has already made a prediction, repeat the
         * exact same request using ONLY the newly selected model.
         */
        if (window.foodPriceLastRequest) {
            const newRequest = {
                ...window.foodPriceLastRequest,
                model_id: selectedModel
            };

            await makePrediction(newRequest);
        }
    });
}


// ============================================================
// POPULATE MODEL SELECTOR
// ============================================================

function populateModelSelector(prediction) {
    const selector =
        document.getElementById("model-selector") ||
        document.getElementById("model");

    if (!selector) {
        return;
    }

    const selectedModel =
        prediction?.model_id ||
        prediction?.model ||
        window.selectedFoodPriceModel ||
        "lstm";

    window.selectedFoodPriceModel = selectedModel;

    /*
     * Use performance metadata only.
     *
     * This does NOT request or load any ML model files.
     */
    const performance = window.foodPricePerformance || [];

    if (performance.length > 0) {
        selector.innerHTML = "";

        performance.forEach(model => {
            const option = document.createElement("option");

            option.value =
                model.model_id ||
                model.id ||
                model.name;

            option.textContent =
                model.display_name ||
                formatModelName(
                    model.model_id ||
                    model.id ||
                    model.name
                );

            if (option.value === selectedModel) {
                option.selected = true;
            }

            selector.appendChild(option);
        });

        return;
    }

    // Fallback list if the performance endpoint is unavailable.
    const models = [
        {
            id: "lstm",
            name: "LSTM"
        },
        {
            id: "gradient_boosting",
            name: "Gradient Boosting"
        },
        {
            id: "stacking",
            name: "Stacking"
        },
        {
            id: "linear_regression",
            name: "Linear Regression"
        },
        {
            id: "random_forest",
            name: "Random Forest"
        },
        {
            id: "neural_network",
            name: "Neural Network"
        },
        {
            id: "linear_regression_round1",
            name: "Linear Regression (Round 1)"
        },
        {
            id: "random_forest_round1",
            name: "Random Forest (Round 1)"
        }
    ];

    selector.innerHTML = "";

    models.forEach(model => {
        const option = document.createElement("option");

        option.value = model.id;
        option.textContent = model.name;

        if (model.id === selectedModel) {
            option.selected = true;
        }

        selector.appendChild(option);
    });
}


// ============================================================
// LOAD MODEL PERFORMANCE
// ============================================================

async function loadModelPerformance() {
    try {
        const response = await fetch("/api/performance");

        if (!response.ok) {
            console.warn(
                "Model performance endpoint returned:",
                response.status
            );

            return;
        }

        const data = await response.json();

        /*
         * Store performance metadata only.
         * This endpoint should not load the actual model files.
         */
        if (Array.isArray(data)) {
            window.foodPricePerformance = data;
        } else if (Array.isArray(data.models)) {
            window.foodPricePerformance = data.models;
        } else if (Array.isArray(data.performance)) {
            window.foodPricePerformance = data.performance;
        } else {
            window.foodPricePerformance = [];
        }

        console.log(
            "Loaded model performance metadata:",
            window.foodPricePerformance
        );

    } catch (error) {
        console.warn(
            "Could not load model performance:",
            error
        );
    }
}


// ============================================================
// UNAVAILABLE PAGE
// ============================================================

function showUnavailable(message) {
    const unavailablePage =
        document.getElementById("unavailable-page");

    if (unavailablePage) {
        unavailablePage.classList.add("active");
    }

    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        if (page.id !== "unavailable-page") {
            page.classList.remove("active");
        }
    });

    setText(
        [
            "unavailable-message",
            "error-message"
        ],
        message ||
        "This prediction is currently unavailable."
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function setText(elementIds, value) {
    const ids = Array.isArray(elementIds)
        ? elementIds
        : [elementIds];

    for (const id of ids) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                value !== undefined &&
                value !== null
                    ? value
                    : "";

            return;
        }
    }
}


function formatPrice(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return value;
    }

    return `${number.toFixed(2)} ETB/KG`;
}


function formatMonth(month) {
    const monthNumber = Number(month);

    if (
        !Number.isInteger(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12
    ) {
        return month;
    }

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];

    return months[monthNumber - 1];
}


function formatModelName(modelId) {
    if (!modelId) {
        return "Unknown Model";
    }

    const names = {
        "gradient_boosting": "Gradient Boosting",
        "stacking": "Stacking",
        "linear_regression": "Linear Regression",
        "random_forest": "Random Forest",
        "lstm": "LSTM",
        "neural_network": "Neural Network",
        "linear_regression_round1":
            "Linear Regression (Round 1)",
        "random_forest_round1":
            "Random Forest (Round 1)"
    };

    if (names[modelId]) {
        return names[modelId];
    }

    return modelId
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}


// ============================================================
// BACK TO HOME
// ============================================================

document.addEventListener("click", event => {
    const button = event.target.closest(
        "#back-home, .back-home, [data-action='home']"
    );

    if (!button) {
        return;
    }

    event.preventDefault();

    showPage("home");
});


// ============================================================
// DEBUGGING
// ============================================================

console.log(
    "Food Price AI frontend loaded."
);

console.log(
    "Single-model prediction endpoint: /api/predict"
);