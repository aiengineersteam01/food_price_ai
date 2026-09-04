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


    console.log("Start button:", startButton);
    console.log("Predict button:", predictButton);
    console.log("Commodity:", commoditySelect);
    console.log("Market:", marketSelect);


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

            console.warn(
                "Page not found:",
                name
            );
        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    /* =====================================================
       HOME PAGE
       ===================================================== */

    showPage("home");


    /* =====================================================
       START PREDICTION
       ===================================================== */

    if (startButton) {

        startButton.addEventListener(
            "click",
            function () {

                console.log(
                    "Start Prediction clicked."
                );

                clearError();

                showPage("prediction");
            }
        );

    } else {

        console.error(
            "Start Prediction button not found."
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


                console.log(
                    "Menu button clicked."
                );


                if (dropdownMenu) {

                    dropdownMenu.classList.toggle(
                        "hidden"
                    );

                    dropdownMenu.classList.toggle(
                        "show"
                    );
                }
            }
        );
    }


    document.addEventListener(
        "click",
        function () {

            if (dropdownMenu) {

                dropdownMenu.classList.remove(
                    "show"
                );

                dropdownMenu.classList.add(
                    "hidden"
                );
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

    document.querySelectorAll(
        "[data-page]"
    ).forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const page =
                    this.getAttribute(
                        "data-page"
                    );


                console.log(
                    "Navigation clicked:",
                    page
                );


                clearError();

                showPage(page);


                if (dropdownMenu) {

                    dropdownMenu.classList.add(
                        "hidden"
                    );

                    dropdownMenu.classList.remove(
                        "show"
                    );
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
                document.createElement(
                    "option"
                );


            option.value = year;

            option.textContent = year;


            yearSelect.appendChild(
                option
            );
        }


        yearSelect.value =
            currentYear;
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
                await fetch(
                    "/api/commodities"
                );


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
                !Array.isArray(
                    data.commodities
                )
            ) {

                throw new Error(
                    "Invalid commodity data received."
                );
            }


            data.commodities.forEach(
                function (commodity) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        commodity;

                    option.textContent =
                        commodity;


                    commoditySelect.appendChild(
                        option
                    );
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

    async function loadMarkets(
        commodity
    ) {

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
                encodeURIComponent(
                    commodity
                ) +
                "/markets";


            const response =
                await fetch(url);


            if (!response.ok) {

                /*
                   The commodity exists, but there
                   are no supported markets.
                */

                if (
                    response.status === 404
                ) {

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
                !Array.isArray(
                    data.markets
                )
            ) {

                throw new Error(
                    "Invalid market data received."
                );
            }


            data.markets.forEach(
                function (market) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        market;

                    option.textContent =
                        market;


                    marketSelect.appendChild(
                        option
                    );
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

                console.log(
                    "Commodity selected:",
                    this.value
                );


                clearError();

                loadMarkets(
                    this.value
                );
            }
        );
    }


    /* =====================================================
       FORM ERROR
       ===================================================== */

    function showError(message) {

        if (formError) {

            formError.textContent =
                message;

            formError.classList.remove(
                "hidden"
            );
        }


        console.error(message);
    }


    function clearError() {

        if (formError) {

            formError.textContent = "";

            formError.classList.add(
                "hidden"
            );
        }
    }


    /* =====================================================
       PREDICT BUTTON
       ===================================================== */

    if (predictButton) {

        predictButton.addEventListener(
            "click",
            async function () {

                console.log(
                    "Predict button clicked."
                );


                clearError();


                /* -----------------------------------------
                   VALIDATE COMMODITY
                   ----------------------------------------- */

                if (
                    !commoditySelect ||
                    !commoditySelect.value
                ) {

                    showError(
                        "Please select a commodity."
                    );

                    return;
                }


                /* -----------------------------------------
                   VALIDATE MARKET
                   ----------------------------------------- */

                if (
                    !marketSelect ||
                    !marketSelect.value
                ) {

                    showError(
                        "Please select a market."
                    );

                    return;
                }


                /* -----------------------------------------
                   VALIDATE MONTH
                   ----------------------------------------- */

                if (
                    !monthSelect ||
                    !monthSelect.value
                ) {

                    showError(
                        "Please select a target month."
                    );

                    return;
                }


                /* -----------------------------------------
                   VALIDATE YEAR
                   ----------------------------------------- */

                if (
                    !yearSelect ||
                    !yearSelect.value
                ) {

                    showError(
                        "Please select a target year."
                    );

                    return;
                }


                const request = {

                    commodity:
                        commoditySelect.value,

                    market:
                        marketSelect.value,

                    target_month:
                        Number(
                            monthSelect.value
                        ),

                    target_year:
                        Number(
                            yearSelect.value
                        )
                };


                console.log(
                    "Prediction request:",
                    request
                );


                await makePrediction(
                    request
                );
            }
        );


    } else {

        console.error(
            "Predict button not found."
        );
    }


    /* =====================================================
       MAKE PREDICTION
       ===================================================== */

    async function makePrediction(
        request
    ) {

        showPage("loading");


        const startTime =
            Date.now();


        try {

            const response =
                await fetch(
                    "/api/predict/all",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                request
                            )
                    }
                );


            /* -----------------------------------------
               API ERROR
               ----------------------------------------- */

            if (!response.ok) {

                const errorData =
                    await response
                        .json()
                        .catch(
                            function () {
                                return null;
                            }
                        );


                console.error(
                    "API error:",
                    response.status,
                    errorData
                );


                /*
                   400 or 404 means the selected
                   request cannot currently be
                   supported by the dataset.
                */

                if (
                    response.status === 400 ||
                    response.status === 404
                ) {

                    await keepLoadingForFiveSeconds(
                        startTime
                    );


                    showUnavailablePage(
                        request.commodity,
                        request.market,
                        request.target_year,
                        getMonthName(
                            request.target_month
                        )
                    );


                    return;
                }


                throw new Error(
                    errorData?.detail ||
                    "Prediction failed."
                );
            }


            /* -----------------------------------------
               READ API RESPONSE
               ----------------------------------------- */

            const data =
                await response.json();


            console.log(
                "Prediction response:",
                data
            );


            const predictions =
                data.predictions || [];


            /*
               Only predictions containing a real
               numeric prediction are considered
               usable.
            */

            const usablePredictions =
                predictions.filter(
                    function (item) {

                        return (
                            item &&
                            item.prediction !== null &&
                            item.prediction !== undefined &&
                            Number.isFinite(
                                Number(
                                    item.prediction
                                )
                            )
                        );
                    }
                );


            console.log(
                "Total predictions:",
                predictions.length
            );


            console.log(
                "Usable predictions:",
                usablePredictions.length
            );


            /* -----------------------------------------
               NO USABLE DATA
               ----------------------------------------- */

            if (
                usablePredictions.length === 0
            ) {

                console.warn(
                    "No usable prediction was returned."
                );


                await keepLoadingForFiveSeconds(
                    startTime
                );


                showUnavailablePage(
                    request.commodity,
                    request.market,
                    request.target_year,
                    getMonthName(
                        request.target_month
                    )
                );


                return;
            }


            /* -----------------------------------------
               DATA IS AVAILABLE
               ----------------------------------------- */

            await keepLoadingForFiveSeconds(
                startTime
            );


            displayResults(
                data
            );


            showPage("results");


        } catch (error) {

            console.error(
                "Prediction error:",
                error
            );


            /*
               Keep the loading screen visible
               for at least five seconds.
            */

            await keepLoadingForFiveSeconds(
                startTime
            );


            showPage("prediction");


            showError(
                error.message ||
                "Prediction failed. Please try again."
            );
        }
    }


    /* =====================================================
       FIVE SECOND LOADING
       ===================================================== */

    async function keepLoadingForFiveSeconds(
        startTime
    ) {

        const elapsed =
            Date.now() -
            startTime;


        const remaining =
            Math.max(
                0,
                5000 - elapsed
            );


        if (remaining > 0) {

            await wait(
                remaining
            );
        }
    }


    /* =====================================================
       DATA NOT AVAILABLE PAGE
       ===================================================== */

    function showUnavailablePage(
        commodity,
        market,
        year,
        month
    ) {

        console.log(
            "Showing Data Not Available page."
        );


        let page =
            document.getElementById(
                "unavailable-page"
            );


        /*
           Create the page the first time.
        */

        if (!page) {

            page =
                document.createElement(
                    "section"
                );


            page.id =
                "unavailable-page";


            page.className =
                "page hidden";


            const main =
                document.querySelector(
                    "main"
                );


            if (main) {

                main.appendChild(
                    page
                );

            } else {

                document.body.appendChild(
                    page
                );
            }
        }


        /*
           Rebuild the content every time.
           This means the selected commodity,
           market and date are always correct.
        */

        page.innerHTML = `

            <div style="
                min-height: 75vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 60px 24px;
                box-sizing: border-box;
            ">

                <div style="
                    max-width: 760px;
                    width: 100%;
                    text-align: center;
                    background: #ffffff;
                    border: 1px solid #dfe8df;
                    border-radius: 24px;
                    padding: 60px 40px;
                    box-shadow:
                        0 20px 60px
                        rgba(20, 70, 35, 0.10);
                    box-sizing: border-box;
                ">

                    <div style="
                        width: 76px;
                        height: 76px;
                        margin: 0 auto 25px;
                        border-radius: 50%;
                        background: #fff4df;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 38px;
                    ">
                        📊
                    </div>


                    <div style="
                        color: #347a4a;
                        font-size: 14px;
                        font-weight: 800;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                        margin-bottom: 14px;
                    ">
                        DATA NOT AVAILABLE
                    </div>


                    <h1 style="
                        margin: 0 0 20px;
                        color: #16351f;
                        font-size: clamp(
                            32px,
                            5vw,
                            48px
                        );
                        line-height: 1.1;
                    ">
                        We’re Sorry
                    </h1>


                    <p style="
                        color: #5e7064;
                        font-size: 18px;
                        line-height: 1.7;
                        margin: 0 auto 24px;
                        max-width: 650px;
                    ">
                        The selected commodity, market,
                        or target period is not currently
                        available in our dataset.
                    </p>


                    <div style="
                        background: #f4f8f4;
                        border-radius: 16px;
                        padding: 18px 22px;
                        margin: 25px auto;
                        max-width: 560px;
                        text-align: left;
                    ">

                        <div style="
                            margin-bottom: 8px;
                            color: #6b7b70;
                            font-size: 14px;
                        ">
                            Selected request
                        </div>


                        <strong style="
                            color: #173b22;
                            font-size: 17px;
                        ">
                            ${escapeHtml(
                                commodity
                            )}
                        </strong>


                        <span style="
                            color: #819087;
                        ">
                            &nbsp;•&nbsp;
                        </span>


                        <strong style="
                            color: #173b22;
                            font-size: 17px;
                        ">
                            ${escapeHtml(
                                market
                            )}
                        </strong>


                        <div style="
                            color: #6b7b70;
                            margin-top: 8px;
                        ">
                            ${escapeHtml(
                                month
                            )}
                            ${escapeHtml(
                                String(year)
                            )}
                        </div>

                    </div>


                    <p style="
                        color: #637269;
                        font-size: 16px;
                        line-height: 1.7;
                        margin: 0 auto 30px;
                        max-width: 620px;
                    ">
                        We will upgrade our dataset
                        as soon as possible so that
                        more food commodities, markets,
                        and periods can be supported.
                        Thank you for your understanding.
                    </p>


                    <button
                        id="return-to-prediction-button"
                        class="primary-button"
                        type="button"
                        style="
                            border: none;
                            cursor: pointer;
                        "
                    >
                        ← Return to Prediction
                    </button>

                </div>

            </div>

        `;


        /*
           Show the unavailable page.
        */

        showPage(
            "unavailable"
        );


        /*
           Connect the return button.
        */

        const returnButton =
            document.getElementById(
                "return-to-prediction-button"
            );


        if (returnButton) {

            returnButton.addEventListener(
                "click",
                function () {

                    console.log(
                        "Returning to prediction page."
                    );


                    clearError();


                    showPage(
                        "prediction"
                    );
                }
            );
        }
    }


    /* =====================================================
       DISPLAY RESULTS
       ===================================================== */

    function displayResults(
        data
    ) {

        console.log(
            "Displaying results:",
            data
        );


        const results =
            data.predictions || [];


        const usableResults =
            results.filter(
                function (item) {

                    return (
                        item &&
                        item.prediction !== null &&
                        item.prediction !== undefined &&
                        Number.isFinite(
                            Number(
                                item.prediction
                            )
                        )
                    );
                }
            );


        if (
            usableResults.length === 0
        ) {

            console.warn(
                "No usable results."
            );


            return;
        }


        /*
           Store results globally.
        */

        window.foodPriceResults =
            results;


        /*
           Store default model.
        */

        let defaultModel =
            data.default_model ||
            "lstm";


        /*
           Find the default model if it has
           a valid prediction.
        */

        let selected =
            usableResults.find(
                function (item) {

                    return (
                        item.model_id ===
                        defaultModel
                    );
                }
            );


        /*
           If the default model isn't usable,
           use the first working model.
        */

        if (!selected) {

            selected =
                usableResults[0];
        }


        if (selected) {

            window.selectedFoodPriceModel =
                selected.model_id;
        }


        populateModelSelector(
            usableResults
        );


        renderSelectedResult();

        renderAllModels(
            usableResults
        );
    }


    /* =====================================================
       MODEL SELECTOR
       ===================================================== */

    function populateModelSelector(
        results
    ) {

        if (!modelSelect) {
            return;
        }


        modelSelect.innerHTML = "";


        results.forEach(
            function (result) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    result.model_id;


                option.textContent =
                    result.model_name;


                if (
                    result.model_id ===
                    window.selectedFoodPriceModel
                ) {

                    option.selected =
                        true;
                }


                modelSelect.appendChild(
                    option
                );
            }
        );
    }


    if (modelSelect) {

        modelSelect.addEventListener(
            "change",
            function () {

                console.log(
                    "Model changed:",
                    this.value
                );


                window.selectedFoodPriceModel =
                    this.value;


                renderSelectedResult();


                renderAllModels(
                    window.foodPriceResults
                );
            }
        );
    }


    /* =====================================================
       RENDER SELECTED MODEL
       ===================================================== */

    function renderSelectedResult() {

        const results =
            window.foodPriceResults ||
            [];


        const modelId =
            window.selectedFoodPriceModel;


        const result =
            results.find(
                function (item) {

                    return (
                        item.model_id ===
                        modelId
                    );
                }
            );


        if (!result) {

            console.warn(
                "Selected model result not found."
            );

            return;
        }


        setText(
            "result-title",
            result.commodity +
            " Price Prediction"
        );


        setText(
            "result-subtitle",
            result.market +
            " • " +
            formatDate(
                result.target_date
            )
        );


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


        if (
            result.actual_available
        ) {

            setText(
                "prediction-status",
                "Historical target — actual price available"
            );

        } else {

            setText(
                "prediction-status",
                "Future forecast — actual price not available yet"
            );
        }


        /* -----------------------------------------
           ACTUAL PRICE
           ----------------------------------------- */

        if (
            result.actual_price !== null &&
            result.actual_price !== undefined
        ) {

            setText(
                "actual-price",
                formatNumber(
                    result.actual_price
                ) +
                " " +
                (
                    result.unit ||
                    "ETB/KG"
                )
            );

        } else {

            setText(
                "actual-price",
                "Not available yet"
            );
        }


        /* -----------------------------------------
           ABSOLUTE ERROR
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
                "Not available"
            );
        }


        /* -----------------------------------------
           PERCENTAGE ERROR
           ----------------------------------------- */

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
                "Not available"
            );
        }


        /* -----------------------------------------
           DETAILS
           ----------------------------------------- */

        setText(
            "detail-commodity",
            result.commodity
        );


        setText(
            "detail-market",
            result.market
        );


        setText(
            "detail-target-date",
            formatDate(
                result.target_date
            )
        );


        setText(
            "detail-source-date",
            formatDate(
                result.source_date
            )
        );


        setText(
            "detail-model",
            result.model_name
        );


        /* -----------------------------------------
           MODEL PERFORMANCE
           ----------------------------------------- */

        const performance =
            (
                window.foodPricePerformance ||
                []
            ).find(
                function (item) {

                    return (
                        item.model_id ===
                        result.model_id
                    );
                }
            );


        if (performance) {

            setText(
                "metric-mae",
                Number(
                    performance.mae
                ).toFixed(3)
            );


            setText(
                "metric-mse",
                Number(
                    performance.mse
                ).toFixed(3)
            );


            setText(
                "metric-rmse",
                Number(
                    performance.rmse
                ).toFixed(3)
            );


            setText(
                "metric-r2",
                Number(
                    performance.r2
                ).toFixed(3)
            );
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
       ALL MODEL CARDS
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
                            result.model_name
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
                    function () {

                        console.log(
                            "Model card clicked:",
                            result.model_id
                        );


                        window.selectedFoodPriceModel =
                            result.model_id;


                        if (modelSelect) {

                            modelSelect.value =
                                result.model_id;
                        }


                        renderSelectedResult();


                        renderAllModels(
                            results
                        );
                    }
                );


                grid.appendChild(
                    card
                );
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

                console.log(
                    "New prediction clicked."
                );


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
            document.getElementById(
                id
            );


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


        } catch (error) {

            console.error(
                "Performance loading error:",
                error
            );


            window.foodPricePerformance =
                [];
        }
    }


    loadPerformance();


    console.log(
        "Food Price AI initialization complete."
    );

});