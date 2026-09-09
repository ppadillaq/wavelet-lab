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

const preprocessingMethod =
    document.getElementById("preprocessingMethod");

const denoisingControls =
    document.getElementById("denoisingControls");

const denoisingStrength =
    document.getElementById("denoisingStrength");

const denoisingStrengthValue =
    document.getElementById("denoisingStrengthValue");

const compressionPreprocessingControls =
    document.getElementById("compressionPreprocessingControls");

const preprocessingCompression =
    document.getElementById("preprocessingCompression");

const preprocessingCompressionValue =
    document.getElementById("preprocessingCompressionValue");

const preprocessingCoefficientsStat =
    document.getElementById("preprocessingCoefficientsStat");

const preprocessingRmseStat =
    document.getElementById("preprocessingRmseStat");


async function updatePreprocessing() {

    const method = preprocessingMethod.value;

    denoisingControls.style.display =
        method === "denoising" ? "block" : "none";

    compressionPreprocessingControls.style.display =
        method === "compression" ? "block" : "none";

    if (method === "none") {
        plotOriginalEventSignal();
        samplingStatus.textContent = "";
        return;
    }

    try {

        let processedSignal;
        let traceName;

        if (method === "denoising") {

            samplingStatus.textContent =
                "Applying wavelet denoising...";

            const result = await getDenoisedSignal();

            processedSignal = result.denoised;
            traceName = "Wavelet denoised";

            samplingStatus.textContent =
                `Wavelet denoising applied (strength = ${denoisingStrength.value}%).`;

        } else if (method === "compression") {

            samplingStatus.textContent =
                "Applying wavelet compression...";

            const response = await fetch(
                "/compress-signal",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        retain_fraction:
                            parseInt(preprocessingCompression.value) / 100
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to apply wavelet compression."
                );
            }

            processedSignal = result.compressed;
            traceName = "Compressed signal";

            preprocessingCoefficientsStat.textContent =
                `${result.coefficients_retained} / ${result.coefficients_total}`;

            preprocessingRmseStat.textContent =
                result.rmse.toExponential(3);

            samplingStatus.textContent =
                `Wavelet compression applied (${preprocessingCompression.value}% retained).`;
        }

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
                    y: processedSignal,
                    type: "scatter",
                    mode: "lines",
                    name: traceName,
                    line: {
                        dash: "dash"
                    }
                }
            ],
            {
                margin: {l: 70, r: 30, t: 30, b: 70},
                xaxis: {title: "Time"},
                yaxis: {title: "Amplitude"},
                legend: {
                    orientation: "h",
                    x: 0,
                    y: 1.08
                },
                hovermode: "closest"
            },
            {
                responsive: true
            }
        );

    } catch (error) {
        console.error(error);
        samplingStatus.textContent =
            `Error: ${error.message}`;
    }
}


preprocessingMethod.addEventListener(
    "change",
    updatePreprocessing
);

denoisingStrength.addEventListener(
    "input",
    function () {
        denoisingStrengthValue.textContent =
            `${this.value}%`;
        updatePreprocessing();
    }
);

preprocessingCompression.addEventListener(
    "input",
    function () {
        preprocessingCompressionValue.textContent =
            `${this.value}%`;
        updatePreprocessing();
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


async function getDenoisedSignal() {
    const strength = parseFloat(denoisingStrength.value);

    const response = await fetch(
        "/api/wavelet-denoise",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                values: originalSignal,
                strength: strength
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Unable to apply wavelet denoising."
        );
    }

    return data;
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

    try {

        let workingSignal = originalSignal;

        if (preprocessingMethod.value === "denoising") {

            const denoisingResult = await getDenoisedSignal();
            workingSignal = denoisingResult.denoised;

        } else if (preprocessingMethod.value === "compression") {

            const response = await fetch(
                "/compress-signal",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        retain_fraction:
                            parseInt(preprocessingCompression.value) / 100
                    })
                }
            );

            const compressionResult = await response.json();

            if (!response.ok) {
                throw new Error(
                    compressionResult.error ||
                    "Unable to apply wavelet compression."
                );
            }

            workingSignal = compressionResult.compressed;
        }

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

        const yMin = Math.min(
            ...originalSignal,
            ...workingSignal
        );

        const yMax = Math.max(
            ...originalSignal,
            ...workingSignal
        );

        const samplingLineX = [];
        const samplingLineY = [];

        transmittedTimes.forEach(time => {
            samplingLineX.push(time, time, null);
            samplingLineY.push(yMin, yMax, null);
        });

        const originalTrace = {
            x: times,
            y: originalSignal,
            type: "scatter",
            mode: "lines",
            name: "Original signal"
        };

        const processedTrace = {
            x: times,
            y: workingSignal,
            type: "scatter",
            mode: "lines",
            name:
                preprocessingMethod.value === "denoising"
                    ? "Wavelet denoised"
                    : "Compressed signal",
            line: {
                dash: "dash"
            },
            visible: preprocessingMethod.value !== "none"
        };

        const samplingLinesTrace = {
            x: samplingLineX,
            y: samplingLineY,
            type: "scatter",
            mode: "lines",
            name: "Sampling instants",
            line: {
                width: 1
            },
            opacity: 0.18,
            hoverinfo: "skip",
            showlegend: true
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
            processedTrace
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

        traces.push(samplingLinesTrace);
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

        const externalTimes =
            data.external_indices.map(index =>
                times[index]
            );

        const internalTimes =
            data.internal_indices.map(index =>
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
            name: "SVR model",
            line: {
                width: 3
            }
        };

        const upperTrace = {
            x: times,
            y: data.upper_tube,
            type: "scatter",
            mode: "lines",
            name: "+ε",
            line: {
                dash: "dash",
                width: 1
            }
        };

        const lowerTrace = {
            x: times,
            y: data.lower_tube,
            type: "scatter",
            mode: "lines",
            name: "-ε",
            line: {
                dash: "dash",
                width: 1
            }
        };

        const externalTrace = {
            x: externalTimes,
            y: data.external_values,
            type: "scatter",
            mode: "markers",
            name: "External SV (ESV)",
            marker: {
                size: 8,
                color: "red"
            }
        };

        const internalTrace = {
            x: internalTimes,
            y: data.internal_values,
            type: "scatter",
            mode: "markers",
            name: "Internal SV (ISV)",
            marker: {
                size: 8,
                symbol: "circle-open"
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
                internalTrace,
                externalTrace
            ],
            layout,
            {
                responsive: true
            }
        );

        svmTotalSamples.textContent =
            data.total_samples;

        svmEventCount.textContent =
            data.external_count;

        svmEventPercent.textContent =
            `${data.event_percent.toFixed(1)}%`;

        svmStatus.textContent =
            `${data.external_count} external support vectors detected.`;

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

plotCWTSignal();
updateCWT();
plotOriginalEventSignal();