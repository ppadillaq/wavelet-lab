const stationButtons = document.querySelectorAll(".select-station");

const selectedStation =
    document.getElementById("selectedStation");

const selectedStationName =
    document.getElementById("selectedStationName");

const selectedStationId =
    document.getElementById("selectedStationId");

const selectedStationLocation =
    document.getElementById("selectedStationLocation");

const startDate =
    document.getElementById("startDate");

const endDate =
    document.getElementById("endDate");

const loadDataButton =
    document.getElementById("loadData");

const dataStatus =
    document.getElementById("dataStatus");

const openSignalLabButton =
    document.getElementById("openSignalLab");

let currentSignal = null;


let currentStationId = null;


/* -------------------------------------------------
   Default dates: last 7 days
------------------------------------------------- */

const today = new Date();

const sevenDaysAgo = new Date(today);
sevenDaysAgo.setDate(today.getDate() - 7);

endDate.value =
    today.toISOString().split("T")[0];

startDate.value =
    sevenDaysAgo.toISOString().split("T")[0];


/* -------------------------------------------------
   Station selection
------------------------------------------------- */

stationButtons.forEach(button => {

    button.addEventListener("click", function () {

        currentStationId = button.dataset.id;

        currentSignal = null;
        openSignalLabButton.disabled = true;

        const name = button.dataset.name;
        const county = button.dataset.county;
        const state = button.dataset.state;
        const latitude = button.dataset.latitude;
        const longitude = button.dataset.longitude;

        selectedStationName.textContent = name;
        selectedStationId.textContent = currentStationId;

        selectedStationLocation.textContent =
            `${county}, ${state} (${latitude}, ${longitude})`;

        selectedStation.style.display = "block";

        dataStatus.textContent = "";

        selectedStation.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

});


/* -------------------------------------------------
   Load discharge data
------------------------------------------------- */

loadDataButton.addEventListener("click", async function () {

    if (!currentStationId) {
        return;
    }

    currentSignal = null;
    openSignalLabButton.disabled = true;

    const start = startDate.value;
    const end = endDate.value;

    if (!start || !end) {
        dataStatus.textContent =
            "Please select a start and end date.";
        return;
    }

    if (start > end) {
        dataStatus.textContent =
            "The start date must be before the end date.";
        return;
    }

    dataStatus.textContent =
        "Loading discharge data...";

    try {

        const url =
            `/water/data/${encodeURIComponent(currentStationId)}` +
            `?start=${encodeURIComponent(start)}` +
            `&end=${encodeURIComponent(end)}`;

        const response = await fetch(url);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to load data."
            );
        }

        dataStatus.textContent =
            `${data.count} observations loaded.`;

        const observations = data.observations
            .filter(obs => obs.time && obs.value !== null)
            .map(obs => ({
                time: obs.time,
                value: Number(obs.value)
            }))
            .filter(obs => Number.isFinite(obs.value));

        if (observations.length === 0) {
            dataStatus.textContent = "No valid observations found.";
            Plotly.purge("dischargePlot");
            return;
        }

        const times = observations.map(obs => obs.time);
        const values = observations.map(obs => obs.value);

        currentSignal = {
            times: times,
            values: values
        };

        openSignalLabButton.disabled = false;

        Plotly.newPlot("dischargePlot", [{
            x: times,
            y: values,
            type: "scatter",
            mode: "lines",
            name: "Discharge",
            line: {
                color: "#0f766e",
                width: 1.5
            },
            connectgaps: false
        }], {
            title: {
                text: "Streamflow hydrograph",
                font: { size: 18 }
            },
            xaxis: {
                title: "Date and time",
                type: "date"
            },
            yaxis: {
                title: "Discharge (ft³/s)"
            },
            margin: {
                l: 70,
                r: 30,
                t: 60,
                b: 60
            },
            hovermode: "x unified",
            paper_bgcolor: "white",
            plot_bgcolor: "white"
        }, {
            responsive: true,
            displaylogo: false
        });

        console.log(data);

    } catch (error) {

        console.error(error);

        dataStatus.textContent =
            `Error: ${error.message}`;

    }

});

/* -------------------------------------------------
   Open signal in Signal Lab
------------------------------------------------- */

openSignalLabButton.addEventListener("click", async function () {

    if (!currentSignal) {
        return;
    }

    openSignalLabButton.disabled = true;
    dataStatus.textContent = "Opening Signal Lab...";

    try {
        const response = await fetch("/save-signal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...currentSignal,
                source: "water"
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to save signal.");
        }

        window.location.href = data.redirect;

    } catch (error) {
        console.error(error);
        dataStatus.textContent = `Error: ${error.message}`;
        openSignalLabButton.disabled = false;
    }

});