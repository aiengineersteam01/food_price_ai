console.log("Food Price AI JavaScript file loaded.");

document.addEventListener("DOMContentLoaded", function () {

    console.log("Food Price AI JavaScript initialized.");

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const startButton =
        document.getElementById("start-prediction-button");

    const predictButton =
        document.getElementById("predict-button");

    const newPredictionButton =
        document.getElementById("new-prediction-button");

    const returnToPredictionButton =
        document.getElementById("return-to-prediction-button");

    const menuButton =
        document.getElementById("menu-button");

    const dropdownMenu =
        document.getElementById("dropdown-menu");

    const commoditySelect =
        document.getElementById("commodity");

    const marketSelect =
        document.getElementById("market");

    const monthSelect =
        document.getElementById("target-month");

    const yearSelect =
        document.getElementById("target-year");

    const formError =
        document.getElementById("form-error");

    const modelSelect =
        document.getElementById("result-model-select");


    /* =====================================================
       GLOBAL STATE
       ===================================================== */

    window.selectedFoodPriceModel =
        window.selectedFoodPriceModel ||
        "lstm";

    window.foodPricePerformance =
        window.foodPricePerformance ||
        [];

    window.foodPriceLastRequest =
        window.foodPriceLastRequest ||
        null;

    window.foodPriceLastResult =
        window.foodPriceLastResult ||
        null;


    /* =====================================================
       APPLICATION PAGES
       ===================================================== */

    const pageNames = [
        "home",
        "prediction",
        "loading",
        "results",
        "unavailable",
        "about",
        "guide",
        "contact"
    ];


    function getPage(name) {

        return (
            document.getElementById(name + "-page") ||
            document.getElementById(name)
        );
    }


    function showPage(name) {

        console.log("Showing page:", name);

        pageNames.forEach(function (pageName) {

            const page = getPage(pageName);

            if (page) {
                page.classList.remove("active");
                page.classList.add("hidden");
            }
        });


        const page = getPage(name);

        if (page) {

            page.classList.remove("hidden");
            page.classList.add("active");

        } else {

            console.warn("Page not found:", name);
        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    /* =====================================================
       INITIAL PAGE
       ===================================================== */

    showPage("home");


    /* =====================================================
       START PREDICTION
       ===================================================== */

    if (startButton) {

        startButton.addEventListener(
            "click",
            function () {

                console.log("Start Prediction clicked.");

                clearError();

                showPage("prediction");
            }
        );
    }


    /* =====================================================
       THREE DOT MENU
       ===================================================== */

    if (menuButton) {

        menuButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                if (dropdownMenu) {

                    dropdownMenu.classList.toggle("hidden");
                    dropdownMenu.classList.toggle("show");
                }
            }
        );
    }


    document.addEventListener(
        "click",
        function () {

            if (dropdownMenu) {

                dropdownMenu.classList.remove("show");
                dropdownMenu.classList.add("hidden");
            }
        }
    );


    if (dropdownMenu) {

        dropdownMenu.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();
            }
        );
    }


    /* =====================================================
       MENU NAVIGATION
       ===================================================== */

    document.querySelectorAll("[data-page]")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const page =
                        this.getAttribute("data-page");

                    clearError();

                    showPage(page);

                    if (dropdownMenu) {

                        dropdownMenu.classList.add("hidden");
                        dropdownMenu.classList.remove("show");
                    }
                }
            );
        });


    /* =====================================================
       LOAD YEARS
       ===================================================== */

    function loadYears() {

        if (!yearSelect) {
            return;
        }

        yearSelect.innerHTML = "";

        const currentYear =
            new Date().getFullYear();


        for (
            let year = 2000;
            year <= currentYear + 3;
            year++
        ) {

            const option =
                document.createElement("option");

            option.value = year;
            option.textContent = year;

            yearSelect.appendChild(option);
        }


        yearSelect.value = currentYear;
    }


    loadYears();


    /* =====================================================
       LOAD COMMODITIES
       ===================================================== */

    async function loadCommodities() {

        if (!commoditySelect) {
            return;
        }


        try {

            commoditySelect.innerHTML =
                `<option value="">
                    Loading commodities...
                </option>`;


            const response =
                await fetch("/api/commodities");


            if (!response.ok) {

                throw new Error(
                    "Could not load commodities."
                );
            }


            const data =
                await response.json();


            commoditySelect.innerHTML =
                `<option value="">
                    Select a commodity
                </option>`;


            if (
                !data.commodities ||
                !Array.isArray(data.commodities)
            ) {

                throw new Error(
                    "Invalid commodity data received."
                );
            }


            data.commodities.forEach(
                function (commodity) {

                    const option =
                        document.createElement("option");

                    option.value = commodity;
                    option.textContent = commodity;

                    commoditySelect.appendChild(option);
                }
            );


            console.log(
                "Commodities loaded:",
                data.commodities.length
            );


        } catch (error) {

            console.error(
                "Commodity loading error:",
                error
            );


            commoditySelect.innerHTML =
                `<option value="">
                    Failed to load commodities
                </option>`;
        }
    }


    loadCommodities();


    /* =====================================================
       LOAD MARKETS
       ===================================================== */

    async function loadMarkets(commodity) {

        if (!marketSelect) {
            return;
        }


        if (!commodity) {

            marketSelect.innerHTML =
                `<option value="">
                    Select a commodity first
                </option>`;

            return;
        }


        try {

            marketSelect.innerHTML =
                `<option value="">
                    Loading markets...
                </option>`;


            const url =
                "/api/commodities/" +
                encodeURIComponent(commodity) +
                "/markets";


            const response =
                await fetch(url);


            if (!response.ok) {

                if (response.status === 404) {

                    marketSelect.innerHTML =
                        `<option value="">
                            No markets available
                        </option>`;

                    return;
                }


                throw new Error(
                    "Could not load markets."
                );
            }


            const data =
                await response.json();


            marketSelect.innerHTML =
                `<option value="">
                    Select a market
                </option>`;


            if (
                !data.markets ||
                !Array.isArray(data.markets)
            ) {

                throw new Error(
                    "Invalid market data received."
                );
            }


            data.markets.forEach(
                function (market) {

                    const option =
                        document.createElement("option");

                    option.value = market;
                    option.textContent = market;

                    marketSelect.appendChild(option);
                }
            );


            console.log(
                "Markets loaded:",
                data.markets.length
            );


        } catch (error) {

            console.error(
                "Market loading error:",
                error
            );


            marketSelect.innerHTML =
                `<option value="">
                    Failed to load markets
                </option>`;
        }
    }


    if (commoditySelect) {

        commoditySelect.addEventListener(
            "change",
            function () {

                clearError();

                loadMarkets(
                    commoditySelect.value
                );
            }
        );
    }


    /* =====================================================
       FORM VALIDATION
       ===================================================== */

    function validateForm() {

        clearError();


        if (!commoditySelect ||
            !commoditySelect.value) {

            showError(
                "Please select a commodity."
            );

            return false;
        }


        if (!marketSelect ||
            !marketSelect.value) {

            showError(
                "Please select a market."
            );

            return false;
        }


        if (!monthSelect ||
            !monthSelect.value) {

            showError(
                "Please select a target month."
            );

            return false;
        }


        if (!yearSelect ||
            !yearSelect.value) {

            showError(
                "Please select a target year."
            );

            return false;
        }


        return true;
    }


    function showError(message) {

        console.error("Form error:", message);


        if (formError) {

            formError.textContent = message;
            formError.classList.remove("hidden");
        }
    }


    function clearError() {

        if (formError) {

            formError.textContent = "";
            formError.classList.add("hidden");
        }
    }


    /* =====================================================
       PREDICT BUTTON
       ===================================================== */

    if (predictButton) {

        predictButton.addEventListener(
            "click",
            async function () {

                if (!validateForm()) {
                    return;
                }


                await makePrediction();
            }
        );
    }


    /* =====================================================
       MODEL NAMES
       ===================================================== */

    function formatModelName(modelId) {

        if (!modelId) {
            return "Unknown Model";
        }


        const names = {

            gradient_boosting:
                "Gradient Boosting",

            stacking:
                "Stacking",

            linear_regression:
                "Linear Regression",

            random_forest:
                "Random Forest",

            lstm:
                "LSTM",

            neural_network:
                "Neural Network",

            linear_regression_round1:
                "Linear Regression (Round 1)",

            random_forest_round1:
                "Random Forest (Round 1)"
        };


        if (names[modelId]) {
            return names[modelId];
        }


        return String(modelId)
            .replace(/_/g, " ")
            .replace(/\b\w/g, function (letter) {
                return letter.toUpperCase();
            });
    }


    /* =====================================================
       AVAILABLE MODELS
       ===================================================== */

    const fallbackModels = [
        "lstm",
        "gradient_boosting",
        "stacking",
        "linear_regression",
        "random_forest",
        "neural_network",
        "linear_regression_round1",
        "random_forest_round1"
    ];


    function getAvailableModelOptions() {

        if (
            Array.isArray(window.foodPricePerformance) &&
            window.foodPricePerformance.length > 0
        ) {

            const models =
                window.foodPricePerformance
                    .map(function (item) {

                        if (typeof item === "string") {
                            return item;
                        }

                        return item.model_id;
                    })
                    .filter(Boolean);


            if (models.length > 0) {
                return models;
            }
        }


        return fallbackModels;
    }


    /* =====================================================
       POPULATE MODEL SELECTOR
       ===================================================== */

    function populateModelSelector() {

        if (!modelSelect) {
            return;
        }


        const models =
            getAvailableModelOptions();


        modelSelect.innerHTML = "";


        models.forEach(
            function (modelId) {

                const option =
                    document.createElement("option");

                option.value = modelId;

                option.textContent =
                    formatModelName(modelId);

                modelSelect.appendChild(option);
            }
        );


        if (
            models.includes(
                window.selectedFoodPriceModel
            )
        ) {

            modelSelect.value =
                window.selectedFoodPriceModel;

        } else {

            window.selectedFoodPriceModel =
                models[0] || "lstm";

            modelSelect.value =
                window.selectedFoodPriceModel;
        }
    }


    /* =====================================================
       MODEL SELECTOR CHANGE
       ===================================================== */

    if (modelSelect) {

        modelSelect.addEventListener(
            "change",
            async function () {

                const selectedModel =
                    modelSelect.value;


                if (!selectedModel) {
                    return;
                }


                window.selectedFoodPriceModel =
                    selectedModel;


                console.log(
                    "Selected model:",
                    selectedModel
                );


                /*
                 * If we already have a prediction request,
                 * run the SAME request again using ONLY
                 * the newly selected model.
                 */

                if (window.foodPriceLastRequest) {

                    await makePrediction(
                        window.foodPriceLastRequest,
                        selectedModel
                    );
                }
            }
        );
    }


    /* =====================================================
       MAKE PREDICTION
       ===================================================== */

    async function makePrediction(
        savedRequest = null,
        selectedModel = null
    ) {

        clearError();


        let request;


        if (savedRequest) {

            request = {
                ...savedRequest
            };

        } else {

            request = {

                commodity:
                    commoditySelect.value,

                market:
                    marketSelect.value,

                target_month:
                    Number(monthSelect.value),

                target_year:
                    Number(yearSelect.value)
            };
        }


        const modelId =
            selectedModel ||
            window.selectedFoodPriceModel ||
            "lstm";


        request.model_id = modelId;


        window.foodPriceLastRequest = {
            commodity: request.commodity,
            market: request.market,
            target_month: request.target_month,
            target_year: request.target_year
        };


        window.selectedFoodPriceModel =
            modelId;


        console.log(
            "Prediction request:",
            request
        );


        showPage("loading");


        try {

            /*
             * IMPORTANT:
             *
             * We intentionally call /api/predict
             * instead of /api/predict/all.
             *
             * This sends only ONE model request,
             * which is required for the Render
             * 512 MB memory limit.
             */

            const response =
                await fetch(
                    "/api/predict",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(request)
                    }
                );


            if (!response.ok) {

                let errorMessage =
                    "Prediction failed.";

                try {

                    const errorData =
                        await response.json();

                    if (errorData.detail) {
                        errorMessage =
                            errorData.detail;
                    }

                } catch (e) {
                    console.warn(
                        "Could not parse error response."
                    );
                }


                throw new Error(
                    errorMessage
                );
            }


            const rawData =
                await response.json();


            console.log(
                "Prediction response:",
                rawData
            );


            /*
             * The backend now returns ONE result.
             *
             * The existing results UI expects
             * an array, so wrap the single response.
             */

            const predictions = [
                rawData
            ];


            window.foodPriceLastResult =
                rawData;


            /*
             * Keep the loading screen visible
             * for at least five seconds so the
             * AI loading animation is shown.
             */

            await keepLoadingForFiveSeconds();


            displayResults(
                predictions,
                rawData
            );


            showPage("results");


        } catch (error) {

            console.error(
                "Prediction error:",
                error
            );


            await keepLoadingForFiveSeconds();


            showUnavailablePage(
                error.message ||
                "The prediction could not be completed."
            );
        }
    }


    /* =====================================================
       FIVE SECOND LOADING
       ===================================================== */

    async function keepLoadingForFiveSeconds() {

        await wait(5000);
    }


    /* =====================================================
       UNAVAILABLE PAGE
       ===================================================== */

    function showUnavailablePage(
        message
    ) {

        const unavailablePage =
            document.getElementById(
                "unavailable-page"
            );


        if (unavailablePage) {

            const messageElements =
                unavailablePage.querySelectorAll(
                    "[data-error-message]"
                );


            messageElements.forEach(
                function (element) {

                    element.textContent =
                        message;
                }
            );
        }


        showPage("unavailable");
    }


    /* =====================================================
       DISPLAY RESULTS
       ===================================================== */

    function displayResults(
        results,
        rawData = null
    ) {

        if (
            !Array.isArray(results) ||
            results.length === 0
        ) {

            showUnavailablePage(
                "No prediction result was returned."
            );

            return;
        }


        console.log(
            "Displaying results:",
            results
        );


        /*
         * Because we now request only one model,
         * results contains one result.
         */

        const selectedId =
            window.selectedFoodPriceModel;


        let selectedResult =
            results.find(
                function (item) {

                    return (
                        item.model_id ===
                        selectedId
                    );
                }
            );


        if (!selectedResult) {

            selectedResult =
                results[0];
        }


        window.foodPriceLastResult =
            selectedResult;


        /*
         * Make sure the model selector reflects
         * the currently selected model.
         */

        if (modelSelect) {

            populateModelSelector();

            if (
                selectedResult.model_id
            ) {

                modelSelect.value =
                    selectedResult.model_id;

                window.selectedFoodPriceModel =
                    selectedResult.model_id;
            }
        }


        renderSelectedResult();


        /*
         * Render model cards.
         *
         * Since the new low-memory architecture
         * returns one model at a time, this grid
         * contains only the model that was actually
         * loaded.
         */

        renderAllModels(results);
    }


    /* =====================================================
       RENDER SELECTED RESULT
       ===================================================== */

    function renderSelectedResult() {

        const result =
            window.foodPriceLastResult;


        if (!result) {
            return;
        }


        console.log(
            "Rendering selected result:",
            result
        );


        /* -----------------------------------------
           TITLE
           ----------------------------------------- */

        setText(
            "result-title",
            "Prediction Result"
        );


        setText(
            "result-subtitle",
            (
                result.commodity ||
                window.foodPriceLastRequest?.commodity ||
                "Commodity"
            ) +
            " - " +
            (
                result.market ||
                window.foodPriceLastRequest?.market ||
                "Market"
            )
        );


        /* -----------------------------------------
           MAIN PREDICTION
           ----------------------------------------- */

        if (
            result.prediction !== null &&
            result.prediction !== undefined
        ) {

            setText(
                "main-prediction",
                formatNumber(
                    result.prediction
                )
            );


            setText(
                "prediction-unit",
                result.unit ||
                "ETB/KG"
            );


        } else {

            setText(
                "main-prediction",
                "--"
            );


            setText(
                "prediction-unit",
                result.unit ||
                "ETB/KG"
            );
        }


        /* -----------------------------------------
           PREDICTION STATUS
           ----------------------------------------- */

        let status =
            result.actual_available
                ? "Historical prediction"
                : "Future prediction";


        if (
            result.target_year &&
            Number(result.target_year) >
                new Date().getFullYear()
        ) {

            status =
                "Future prediction";
        }


        setText(
            "prediction-status",
            status
        );


        /* -----------------------------------------
           DETAILS
           ----------------------------------------- */

        setText(
            "detail-commodity",
            result.commodity ||
            window.foodPriceLastRequest?.commodity ||
            "--"
        );


        setText(
            "detail-market",
            result.market ||
            window.foodPriceLastRequest?.market ||
            "--"
        );


        setText(
            "detail-model",
            result.model_name ||
            formatModelName(
                result.model_id ||
                window.selectedFoodPriceModel
            )
        );


        if (
            result.target_date
        ) {

            setText(
                "detail-target-date",
                formatDate(
                    result.target_date
                )
            );

        } else if (
            result.target_year &&
            result.target_month
        ) {

            setText(
                "detail-target-date",
                getMonthName(
                    result.target_month
                ) +
                " " +
                result.target_year
            );

        } else {

            setText(
                "detail-target-date",
                "--"
            );
        }


        setText(
            "detail-source-date",
            result.source_date
                ? formatDate(
                    result.source_date
                )
                : "--"
        );


        /* -----------------------------------------
           ERROR INFORMATION
           ----------------------------------------- */

        if (
            result.absolute_error !== null &&
            result.absolute_error !== undefined
        ) {

            setText(
                "absolute-error",
                formatNumber(
                    result.absolute_error
                ) +
                " " +
                (
                    result.unit ||
                    "ETB/KG"
                )
            );

        } else {

            setText(
                "absolute-error",
                "--"
            );
        }


        if (
            result.percentage_error !== null &&
            result.percentage_error !== undefined
        ) {

            setText(
                "percentage-error",
                formatNumber(
                    result.percentage_error
                ) +
                "%"
            );

        } else {

            setText(
                "percentage-error",
                "N/A"
            );
        }


        /* -----------------------------------------
           MODEL PERFORMANCE
           ----------------------------------------- */

        let performance =
            result.performance;


        if (
            !performance &&
            Array.isArray(
                window.foodPricePerformance
            )
        ) {

            performance =
                window.foodPricePerformance.find(
                    function (item) {

                        return (
                            item.model_id ===
                            result.model_id
                        );
                    }
                );
        }


        if (performance) {

            if (
                performance.mae !== null &&
                performance.mae !== undefined
            ) {

                setText(
                    "metric-mae",
                    Number(
                        performance.mae
                    ).toFixed(3)
                );
            }


            if (
                performance.mse !== null &&
                performance.mse !== undefined
            ) {

                setText(
                    "metric-mse",
                    Number(
                        performance.mse
                    ).toFixed(3)
                );
            }


            if (
                performance.rmse !== null &&
                performance.rmse !== undefined
            ) {

                setText(
                    "metric-rmse",
                    Number(
                        performance.rmse
                    ).toFixed(3)
                );
            }


            if (
                performance.r2 !== null &&
                performance.r2 !== undefined
            ) {

                setText(
                    "metric-r2",
                    Number(
                        performance.r2
                    ).toFixed(3)
                );
            }
        }


        /* -----------------------------------------
           ACTUAL VS PREDICTED
           ----------------------------------------- */

        const comparison =
            document.getElementById(
                "actual-predicted-section"
            );


        if (
            comparison &&
            result.actual_available &&
            result.actual_price !== null &&
            result.prediction !== null
        ) {

            comparison.classList.remove(
                "hidden"
            );


            const actual =
                Number(
                    result.actual_price
                );


            const prediction =
                Number(
                    result.prediction
                );


            const maximum =
                Math.max(
                    actual,
                    prediction,
                    1
                );


            const actualBar =
                document.getElementById(
                    "actual-bar"
                );


            const predictedBar =
                document.getElementById(
                    "predicted-bar"
                );


            if (actualBar) {

                actualBar.style.width =
                    (
                        actual /
                        maximum *
                        100
                    ) +
                    "%";
            }


            if (predictedBar) {

                predictedBar.style.width =
                    (
                        prediction /
                        maximum *
                        100
                    ) +
                    "%";
            }


            setText(
                "visual-actual",
                formatNumber(
                    actual
                ) +
                " " +
                (
                    result.unit ||
                    "ETB/KG"
                )
            );


            setText(
                "visual-predicted",
                formatNumber(
                    prediction
                ) +
                " " +
                (
                    result.unit ||
                    "ETB/KG"
                )
            );


        } else if (comparison) {

            comparison.classList.add(
                "hidden"
            );
        }
    }


    /* =====================================================
       RENDER MODEL CARDS
       ===================================================== */

    function renderAllModels(
        results
    ) {

        const grid =
            document.getElementById(
                "models-grid"
            );


        if (!grid) {
            return;
        }


        grid.innerHTML = "";


        if (
            !Array.isArray(results)
        ) {
            return;
        }


        results.forEach(
            function (result) {

                if (
                    result.prediction === null ||
                    result.prediction === undefined
                ) {

                    return;
                }


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "model-card";


                if (
                    result.model_id ===
                    window.selectedFoodPriceModel
                ) {

                    card.classList.add(
                        "selected"
                    );
                }


                const error =
                    result.percentage_error !== null &&
                    result.percentage_error !== undefined

                        ? formatNumber(
                            result.percentage_error
                        ) + "%"

                        : "N/A";


                card.innerHTML = `

                    <h3>
                        ${escapeHtml(
                            result.model_name ||
                            formatModelName(
                                result.model_id
                            )
                        )}
                    </h3>

                    <div class="model-prediction">
                        ${formatNumber(
                            result.prediction
                        )}
                        ${
                            result.unit ||
                            "ETB/KG"
                        }
                    </div>

                    <p>
                        Error:
                        <strong>
                            ${error}
                        </strong>
                    </p>

                `;


                card.addEventListener(
                    "click",
                    async function () {

                        window.selectedFoodPriceModel =
                            result.model_id;


                        if (modelSelect) {

                            modelSelect.value =
                                result.model_id;
                        }


                        /*
                         * Run the selected model only.
                         */

                        if (
                            window.foodPriceLastRequest
                        ) {

                            await makePrediction(
                                window.foodPriceLastRequest,
                                result.model_id
                            );
                        }
                    }
                );


                grid.appendChild(card);
            }
        );
    }


    /* =====================================================
       NEW PREDICTION
       ===================================================== */

    if (newPredictionButton) {

        newPredictionButton.addEventListener(
            "click",
            function () {

                clearError();

                showPage(
                    "prediction"
                );
            }
        );
    }


    /* =====================================================
       RETURN TO PREDICTION
       ===================================================== */

    if (returnToPredictionButton) {

        returnToPredictionButton.addEventListener(
            "click",
            function () {

                clearError();

                showPage(
                    "prediction"
                );
            }
        );
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                value;
        }
    }


    function formatNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined ||
            Number.isNaN(
                Number(value)
            )
        ) {

            return "--";
        }


        return Number(value)
            .toLocaleString(
                undefined,
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
    }


    function formatDate(
        value
    ) {

        if (!value) {
            return "--";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return value;
        }


        return date.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
    }


    function getMonthName(
        monthNumber
    ) {

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


        return (
            months[
                Number(monthNumber) - 1
            ] ||
            "Selected month"
        );
    }


    function escapeHtml(
        value
    ) {

        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    function wait(
        milliseconds
    ) {

        return new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    milliseconds
                );
            }
        );
    }


    /* =====================================================
       LOAD MODEL PERFORMANCE
       ===================================================== */

    async function loadPerformance() {

        try {

            const response =
                await fetch(
                    "/api/models"
                );


            if (!response.ok) {

                console.warn(
                    "Could not load model performance."
                );

                populateModelSelector();

                return;
            }


            const data =
                await response.json();


            window.foodPricePerformance =
                data.models || [];


            console.log(
                "Model performance loaded:",
                window.foodPricePerformance.length
            );


            populateModelSelector();


        } catch (error) {

            console.error(
                "Performance loading error:",
                error
            );


            window.foodPricePerformance =
                [];


            populateModelSelector();
        }
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    populateModelSelector();

    loadPerformance();


    console.log(
        "Food Price AI initialization complete."
    );

});