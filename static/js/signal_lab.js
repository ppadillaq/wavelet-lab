// --------------------------------------------------
// Tabs
// --------------------------------------------------

const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach(button => {

    button.addEventListener("click", function () {

        tabButtons.forEach(btn =>
            btn.classList.remove("active")
        );

        tabPanels.forEach(panel =>
            panel.classList.remove("active")
        );

        button.classList.add("active");

        const panelId = button.dataset.tab;

        document
            .getElementById(panelId)
            .classList.add("active");

        if (panelId === "cwt-panel") {
            Plotly.Plots.resize("cwtSignalPlot");
            Plotly.Plots.resize("cwtPlot");
        }
    });
});


// --------------------------------------------------
// Compression
// --------------------------------------------------

const slider =
    document.getElementById("compression");

const compressionValue =
    document.getElementById("compressionValue");

const coefficientsStat =
    document.getElementById("coefficientsStat");

const rmseStat =
    document.getElementById("rmseStat");


async function updateCompression() {

    const percentage =
        parseInt(slider.value);

    compressionValue.textContent =
        `${percentage}%`;

    const response = await fetch(
        "/compress-signal",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                retain_fraction:
                    percentage / 100
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data);
        return;
    }

    const originalTrace = {
        x: times,
        y: originalSignal,
        type: "scatter",
        mode: "lines",
        name: "Original signal"
    };

    const compressedTrace = {
        x: times,
        y: data.compressed,
        type: "scatter",
        mode: "lines",
        name: "Compressed signal"
    };

    const layout = {
        margin: {
            l: 70,
            r: 30,
            t: 30,
            b: 70
        },

        xaxis: {
            title: "Time"
        },

        yaxis: {
            title: "Amplitude"
        },

        legend: {
            orientation: "h",
            x: 0,
            y: 1.08
        },

        hovermode: "x unified"
    };

    Plotly.react(
        "compressionPlot",
        [
            originalTrace,
            compressedTrace
        ],
        layout,
        {
            responsive: true
        }
    );

    coefficientsStat.textContent =
        `${data.coefficients_retained} / ${data.coefficients_total}`;

    rmseStat.textContent =
        data.rmse.toExponential(3);
}


slider.addEventListener(
    "input",
    updateCompression
);


// --------------------------------------------------
// CWT - original signal only for now
// --------------------------------------------------

function plotCWTSignal() {

    const trace = {
        x: times,
        y: originalSignal,
        type: "scatter",
        mode: "lines",
        name: "Original signal"
    };

    const layout = {
        margin: {
            l: 70,
            r: 30,
            t: 20,
            b: 60
        },

        xaxis: {
            title: "Time"
        },

        yaxis: {
            title: "Amplitude"
        }
    };

    Plotly.newPlot(
        "cwtSignalPlot",
        [trace],
        layout,
        {
            responsive: true
        }
    );
}

// --------------------------------------------------
// CWT controls
// --------------------------------------------------

const waveletTabs =
    document.querySelectorAll(".wavelet-tab");

const waveletInput =
    document.getElementById("wavelet");

const morletControls =
    document.getElementById("morlet-controls");


async function updateCWT() {

    const bandwidth =
        parseFloat(
            document.getElementById("bandwidth").value
        );

    const centerFrequency =
        parseFloat(
            document.getElementById("center-frequency").value
        );

    const response = await fetch(
        "/cwt",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                wavelet: waveletInput.value,
                values: originalSignal,
                bandwidth: bandwidth,
                center_frequency: centerFrequency
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data);
        return;
    }

    const trace = {
        z: data.coefficients,
        y: data.frequencies,
        x: times,
        type: "heatmap",
        colorscale: "Viridis"
    };

    const layout = {

        margin: {
            l: 80,
            r: 30,
            t: 30,
            b: 70
        },

        xaxis: {
            title: "Time"
        },

        yaxis: {
            title: "Frequency [Hz]"
        }
    };

    Plotly.react(
        "cwtPlot",
        [trace],
        layout,
        {
            responsive: true
        }
    );
}


waveletTabs.forEach(tab => {

    tab.addEventListener("click", function () {

        waveletTabs.forEach(t =>
            t.classList.remove("active")
        );

        tab.classList.add("active");

        waveletInput.value =
            tab.dataset.wavelet;

        if (tab.dataset.wavelet === "cmor") {
            morletControls.style.display = "block";
        }
        else {
            morletControls.style.display = "none";
        }

        updateCWT();
    });
});


document
    .getElementById("bandwidth")
    .addEventListener(
        "change",
        updateCWT
    );


document
    .getElementById("center-frequency")
    .addEventListener(
        "change",
        updateCWT
    );

// --------------------------------------------------
// Initialisation
// --------------------------------------------------

updateCompression();
plotCWTSignal();
updateCWT();
