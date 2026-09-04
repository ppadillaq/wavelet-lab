const networkSelect = document.getElementById("network");
const stationSelect = document.getElementById("station");
const channelSelect = document.getElementById("channel");

async function loadStations(network, selectedStation = "") {

    const response = await fetch(`/stations/${network}`);
    const data = await response.json();

    stationSelect.innerHTML = "";

    data.stations.forEach(station => {
        const option = document.createElement("option");

        option.value = station.code;
        option.textContent = `${station.code} - ${station.name}`;

        if (station.code === selectedStation) {
            option.selected = true;
        }

        stationSelect.appendChild(option);
    });
}

async function loadChannels(network, station, selectedChannel = "") {

    const response = await fetch(`/channels/${network}/${station}`);
    const data = await response.json();

    channelSelect.innerHTML = "";

    data.channels.forEach(channel => {
        const option = document.createElement("option");

        option.value = channel;
        option.textContent = channel;

        if (channel === selectedChannel) {
            option.selected = true;
        }

        channelSelect.appendChild(option);
    });
}


networkSelect.addEventListener("change", async function () {

    await loadStations(networkSelect.value);

    channelSelect.innerHTML =
        '<option value="">Select station first</option>';
});


stationSelect.addEventListener("change", async function () {

    await loadChannels(
        networkSelect.value,
        stationSelect.value
    );
});


// Restore selections after page reload
window.addEventListener("DOMContentLoaded", async function () {

    const selectedStation = stationSelect.dataset.selected;
    const selectedChannel = channelSelect.dataset.selected;

    if (selectedStation) {

        await loadStations(
            networkSelect.value,
            selectedStation
        );

        await loadChannels(
            networkSelect.value,
            selectedStation,
            selectedChannel
        );
    }
    else {
        await loadStations(networkSelect.value);

        if (stationSelect.value) {
            await loadChannels(
                networkSelect.value,
                stationSelect.value
            );
        }
    }
});

const cwtPlot = document.getElementById("cwtPlot");

async function updateCWT() {

    if (!cwtPlot) {
        return;
    }

    Plotly.purge("cwtPlot");

    const values = JSON.parse(cwtPlot.dataset.values);

    if (!values || values.length === 0) {
        return;
    }

    const bandwidth = parseFloat(
        document.getElementById("bandwidth").value
    );

    const centerFrequency = parseFloat(
        document.getElementById("center-frequency").value
    );

    const response = await fetch("/cwt", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            wavelet: waveletInput.value,
            values: values,
            bandwidth: bandwidth,
            center_frequency: centerFrequency
        })
    });

    const data = await response.json();

    const trace = {
        z: data.coefficients,
        y: data.frequencies,
        type: "heatmap",
        colorscale: "Viridis"
    };

    const layout = {
        title: "CWT Scalogram",
        xaxis: {
            title: "Time"
        },
        yaxis: {
            title: "Frequency [Hz]"
        }
    };

    Plotly.newPlot("cwtPlot", [trace], layout);
}

updateCWT();

document.getElementById("bandwidth").addEventListener("change", updateCWT);

document.getElementById("center-frequency").addEventListener("change", updateCWT);

const waveletTabs = document.querySelectorAll(".wavelet-tab");
const waveletInput = document.getElementById("wavelet");
const morletControls = document.getElementById("morlet-controls");

waveletTabs.forEach(tab => {
    tab.addEventListener("click", function () {

        waveletTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        waveletInput.value = tab.dataset.wavelet;
        updateCWT();

        if (tab.dataset.wavelet === "cmor") {
            morletControls.style.display = "block";
        } else {
            morletControls.style.display = "none";
        }
    });
});