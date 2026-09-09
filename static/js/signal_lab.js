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

        if (panelId === "event-panel") {
            Plotly.Plots.resize("eventSamplingPlot");
        }
    });
});

// --------------------------------------------------
// Event Detection modes
// --------------------------------------------------

const eventModeButtons =
    document.querySelectorAll(".event-mode-button");

const eventModePanels =
    document.querySelectorAll(".event-mode-panel");

eventModeButtons.forEach(button => {

    button.addEventListener("click", function () {

        eventModeButtons.forEach(btn =>
            btn.classList.remove("active")
        );

        eventModePanels.forEach(panel =>
            panel.classList.remove("active")
        );

        button.classList.add("active");

        const modeId = button.dataset.eventMode;

        document
            .getElementById(modeId)
            .classList.add("active");

        if (modeId === "sampling-mode") {
            Plotly.Plots.resize("eventSamplingPlot");
        }

        if (modeId === "svm-mode") {
            Plotly.Plots.resize("svmEventPlot");
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
// Optional wavelet filtering
// --------------------------------------------------

const enableWaveletFiltering =
    document.getElementById("enableWaveletFiltering");

const waveletFilteringControls =
    document.getElementById("waveletFilteringControls");

const filterRetainFraction =
    document.getElementById("filterRetainFraction");

const filterRetainValue =
    document.getElementById("filterRetainValue");


let filteredSignal = null;

async function updateWaveletFiltering() {

    waveletFilteringControls.style.display =
        enableWaveletFiltering.checked ? "block" : "none";

    if (!enableWaveletFiltering.checked) {
        filteredSignal = null;
        plotOriginalEventSignal();
        return;
    }

    samplingStatus.textContent =
        "Applying wavelet filtering...";

    try {

        const response = await fetch("/compress-signal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                retain_fraction:
                    parseInt(filterRetainFraction.value) / 100
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to filter signal."
            );
        }

        filteredSignal = data.compressed;

        Plotly.react(
            "eventSamplingPlot",
            [
                {
                    x: times,
                    y: originalSignal,
                    type: "scatter",
                    mode: "lines",
                    name: "Original signal"
                },
                {
                    x: times,
                    y: filteredSignal,
                    type: "scatter",
                    mode: "lines",
                    name: "Wavelet filtered",
                    line: {
                        dash: "dash"
                    }
                }
            ],
            {
                margin: { l: 70, r: 30, t: 30, b: 70 },
                xaxis: { title: "Time" },
                yaxis: { title: "Amplitude" },
                legend: {
                    orientation: "h",
                    x: 0,
                    y: 1.08
                }
            },
            {
                responsive: true
            }
        );

        samplingStatus.textContent =
            `Wavelet filtering applied (${filterRetainFraction.value}% retained).`;

    } catch (error) {
        console.error(error);
        samplingStatus.textContent =
            `Error: ${error.message}`;
    }
}


enableWaveletFiltering.addEventListener(
    "change",
    updateWaveletFiltering
);

filterRetainFraction.addEventListener(
    "input",
    function () {
        filterRetainValue.textContent =
            `${this.value}%`;
        updateWaveletFiltering();
    }
);

// --------------------------------------------------
// Event-Based Sampling
// --------------------------------------------------

const samplingAlgorithm =
    document.getElementById("samplingAlgorithm");

const samplingThreshold =
    document.getElementById("samplingThreshold");

const applySamplingButton =
    document.getElementById("applySampling");

const samplingStatus =
    document.getElementById("samplingStatus");

const originalSamplesStat =
    document.getElementById("originalSamplesStat");

const transmittedSamplesStat =
    document.getElementById("transmittedSamplesStat");

const samplingReductionStat =
    document.getElementById("samplingReductionStat");


function plotOriginalEventSignal() {

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

        hovermode: "closest"
    };

    Plotly.newPlot(
        "eventSamplingPlot",
        [trace],
        layout,
        {
            responsive: true
        }
    );
}


async function applyEventSampling() {

    const threshold =
        parseFloat(samplingThreshold.value);

    if (!Number.isFinite(threshold) || threshold <= 0) {
        samplingStatus.textContent =
            "Please enter a threshold greater than zero.";
        return;
    }

    const algorithmLabels = {
        send_on_delta: "Send-on-Delta",
        energy_domain: "Energy-domain sampling",
        predictive_send_on_delta: "Send-on-Delta with Linear Predictor",
        integral_criterion: "Integral criterion"
    };

    const selectedAlgorithmLabel =
        algorithmLabels[samplingAlgorithm.value]
        || samplingAlgorithm.value;

    samplingStatus.textContent =
        `Applying ${selectedAlgorithmLabel}...`;

    const workingSignal =
        enableWaveletFiltering.checked && filteredSignal
            ? filteredSignal
            : originalSignal;

    try {

        const response = await fetch(
            "/api/event-sampling",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    algorithm: samplingAlgorithm.value,
                    values: workingSignal,
                    times: times,
                    threshold: threshold
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to apply event-based sampling."
            );
        }

        const transmittedTimes =
            data.samples.map(sample =>
                times[sample.index]
            );

        const transmittedValues =
            data.samples.map(sample =>
                sample.value
            );

        const originalTrace = {
            x: times,
            y: originalSignal,
            type: "scatter",
            mode: "lines",
            name: "Original signal"
        };

        const filteredTrace = {
            x: times,
            y: workingSignal,
            type: "scatter",
            mode: "lines",
            name: "Wavelet filtered",
            line: {
                dash: "dash"
            },
            visible: enableWaveletFiltering.checked
        };

        const transmittedTrace = {
            x: transmittedTimes,
            y: transmittedValues,
            type: "scatter",
            mode: "markers",
            name: "Transmitted samples",
            marker: {
                size: 7
            }
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

            hovermode: "closest"
        };

        const traces = [
            originalTrace,
            filteredTrace
        ];

        if (data.reconstructed) {
            traces.push({
                x: times,
                y: data.reconstructed,
                type: "scatter",
                mode: "lines",
                name: "Receiver reconstruction",
                line: {
                    dash: "dot",
                    width: 2
                }
            });
        }

        traces.push(transmittedTrace);

        Plotly.react(
            "eventSamplingPlot",
            traces,
            layout,
            {
                responsive: true
            }
        );

        originalSamplesStat.textContent =
            data.original_count;

        transmittedSamplesStat.textContent =
            data.transmitted_count;

        samplingReductionStat.textContent =
            `${data.reduction_percent.toFixed(1)}%`;

        samplingStatus.textContent =
            `${selectedAlgorithmLabel} applied with threshold = ${data.threshold}.`;

    } catch (error) {

        console.error(error);

        samplingStatus.textContent =
            `Error: ${error.message}`;
    }
}


applySamplingButton.addEventListener(
    "click",
    applyEventSampling
);


// --------------------------------------------------
// SVM Event Detection
// --------------------------------------------------

const svmC =
    document.getElementById("svmC");

const svmGamma =
    document.getElementById("svmGamma");

const svmEpsilon =
    document.getElementById("svmEpsilon");

const applySVMButton =
    document.getElementById("applySVM");

const svmStatus =
    document.getElementById("svmStatus");

const svmTotalSamples =
    document.getElementById("svmTotalSamples");

const svmEventCount =
    document.getElementById("svmEventCount");

const svmEventPercent =
    document.getElementById("svmEventPercent");


async function applySVMDetection() {

    const C = parseFloat(svmC.value);
    const gamma = parseFloat(svmGamma.value);
    const epsilon = parseFloat(svmEpsilon.value);

    if (!Number.isFinite(C) || C <= 0) {
        svmStatus.textContent =
            "C must be greater than zero.";
        return;
    }

    if (!Number.isFinite(gamma) || gamma <= 0) {
        svmStatus.textContent =
            "Gamma must be greater than zero.";
        return;
    }

    if (!Number.isFinite(epsilon) || epsilon < 0) {
        svmStatus.textContent =
            "Epsilon cannot be negative.";
        return;
    }

    svmStatus.textContent =
        "Detecting events with SVR...";

    try {

        const response = await fetch(
            "/api/svm-events",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    values: originalSignal,
                    C: C,
                    gamma: gamma,
                    epsilon: epsilon
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to apply SVM detection."
            );
        }

        const eventTimes =
            data.event_indices.map(index =>
                times[index]
            );

        const originalTrace = {
            x: times,
            y: originalSignal,
            type: "scatter",
            mode: "lines",
            name: "Original signal"
        };

        const predictionTrace = {
            x: times,
            y: data.prediction,
            type: "scatter",
            mode: "lines",
            name: "SVR model"
        };

        const upperTrace = {
            x: times,
            y: data.upper_tube,
            type: "scatter",
            mode: "lines",
            name: "+ε",
            line: {
                dash: "dash"
            }
        };

        const lowerTrace = {
            x: times,
            y: data.lower_tube,
            type: "scatter",
            mode: "lines",
            name: "-ε",
            line: {
                dash: "dash"
            }
        };

        const eventTrace = {
            x: eventTimes,
            y: data.event_values,
            type: "scatter",
            mode: "markers",
            name: "Detected events",
            marker: {
                size: 8,
                color: "red"
            }
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

            hovermode: "closest"
        };

        Plotly.react(
            "svmEventPlot",
            [
                originalTrace,
                predictionTrace,
                upperTrace,
                lowerTrace,
                eventTrace
            ],
            layout,
            {
                responsive: true
            }
        );

        svmTotalSamples.textContent =
            data.total_samples;

        svmEventCount.textContent =
            data.event_count;

        svmEventPercent.textContent =
            `${data.event_percent.toFixed(1)}%`;

        svmStatus.textContent =
            `${data.event_count} events detected.`;

    } catch (error) {

        console.error(error);

        svmStatus.textContent =
            `Error: ${error.message}`;
    }
}


applySVMButton.addEventListener(
    "click",
    applySVMDetection
);


// --------------------------------------------------
// Initialisation
// --------------------------------------------------

updateCompression();
plotCWTSignal();
updateCWT();
plotOriginalEventSignal();