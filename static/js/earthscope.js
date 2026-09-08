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

const labButton = document.getElementById("openSignalLab");

if (labButton) {

    labButton.addEventListener("click", async function () {

        const response = await fetch("/save-signal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                times: times,
                values: values
            })
        });

        const data = await response.json();

        if (data.redirect) {
            window.location.href = data.redirect;
        }
    });
}