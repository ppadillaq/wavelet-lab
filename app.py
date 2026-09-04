import requests
import numpy as np
import pywt

from flask import Flask, render_template, request
from forms import MyForm
from image_processing import ImageDecomp
from datetime import datetime, timezone

app = Flask(__name__)
app.secret_key = 'sepersecretkey'

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/form', methods=['GET', 'POST'])
def form():
    form = MyForm()
    if request.method == 'POST' and form.validate_on_submit():
        name = form.name.data
        email = form.email.data
        return render_template('success.html', name=name, email=email)
    return render_template('form.html', form=form)

@app.route('/2D')
def ImageProc():
    imageProc = ImageDecomp()
    LH = imageProc.get2D()
    return render_template('image_processing.html', data=LH.tolist())

@app.route('/earthscope', methods=['GET', 'POST'])
def earthscope():

    data = None
    error = None
    events = []
    times = None
    values = None
    plot_times = None
    plot_values = None

    # Get available seismic networks from EarthScope
    station_url = "https://service.earthscope.org/fdsnws/station/1/query"

    network_params = {
        "level": "network",
        "format": "text"
    }

    network_response = requests.get(station_url, params=network_params)

    networks = []

    if network_response.ok:
        for line in network_response.text.splitlines():
            if line.startswith("#") or not line.strip():
                continue

            parts = line.split("|")

            if len(parts) >= 2:
                networks.append({
                    "code": parts[0],
                    "description": parts[1]
                })

    if request.method == 'POST':

        network = request.form['network']
        station = request.form['station']
        channel = request.form['channel']
        start = request.form['start']
        end = request.form['end']

        url = 'https://service.earthscope.org/fdsnws/dataselect/1/query'

        params = {
            'net': network,
            'sta': station,
            'cha': channel,
            'start': start,
            'end': end,
            'format': 'geocsv'
        }

        response = requests.get(url, params=params)

        if response.ok:
            lines = response.text.splitlines()

            times = []
            values = []

            for line in lines:
                if line.startswith("#") or not line.strip():
                    continue

                # Saltar cabeceras GeoCSV
                if line.startswith("Time"):
                    continue

                parts = line.split(",")

                if len(parts) >= 2:
                    try:
                        time = parts[0].strip()
                        value = float(parts[1].strip())

                        # Si EarthScope vuelve hacia atrás en el tiempo,
                        # comienza otro bloque: paramos aquí
                        if times and time <= times[-1]:
                            break

                        times.append(time)
                        values.append(value)

                    except ValueError:
                        continue

            max_plot_points = 10000

            step = max(1, len(times) // max_plot_points)

            plot_times = times[::step]
            plot_values = values[::step]

        else:
            error = f"EarthScope error: {response.status_code}"

    usgs_url = "https://earthquake.usgs.gov/fdsnws/event/1/query"

    usgs_params = {
        "format": "geojson",
        "limit": 10,
        "orderby": "time",
        "minmagnitude": 4.5
    }

    usgs_response = requests.get(usgs_url, params=usgs_params)

    if usgs_response.ok:
        for feature in usgs_response.json()["features"]:

            properties = feature["properties"]
            coordinates = feature["geometry"]["coordinates"]

            events.append({
                "place": properties["place"],
                "magnitude": properties["mag"],
                "time": datetime.fromtimestamp(
                    properties["time"] / 1000,
                    tz=timezone.utc
                ).strftime("%Y-%m-%d %H:%M:%S"),
                "longitude": coordinates[0],
                "latitude": coordinates[1],
                "depth": coordinates[2]
            })

    return render_template(
        'earthscope.html',
        times=plot_times if request.method == 'POST' and response.ok else None,
        values=plot_values if request.method == 'POST' and response.ok else None,
        error=error,
        events=events,
        networks=networks,
        selected_network=request.form.get('network'),
        selected_station=request.form.get('station'),
        selected_channel=request.form.get('channel'),
        selected_start=request.form.get('start'),
        selected_end=request.form.get('end'),
        raw_values=values if request.method == 'POST' and response.ok else None,
    )

@app.route('/stations/<network>')
def get_stations(network):

    url = "https://service.earthscope.org/fdsnws/station/1/query"

    params = {
        "net": network,
        "level": "station",
        "format": "text"
    }

    response = requests.get(url, params=params)

    stations = []

    if response.ok:
        for line in response.text.splitlines():

            if line.startswith("#") or not line.strip():
                continue

            parts = line.split("|")

            if len(parts) >= 6:
                stations.append({
                    "code": parts[1],
                    "name": parts[5]
                })

    return {"stations": stations}

@app.route('/channels/<network>/<station>')
def get_channels(network, station):

    url = "https://service.earthscope.org/fdsnws/station/1/query"

    params = {
        "net": network,
        "sta": station,
        "level": "channel",
        "format": "text"
    }

    response = requests.get(url, params=params)

    channels = []

    if response.ok:
        for line in response.text.splitlines():

            if line.startswith("#") or not line.strip():
                continue

            parts = line.split("|")

            if len(parts) >= 4:
                channel = parts[3]

                if channel not in channels:
                    channels.append(channel)

    return {"channels": channels}

@app.route('/cwt', methods=['POST'])
def calculate_cwt():

    data = request.get_json()

    wavelet_type = data.get('wavelet', 'cmor')

    values = np.array(data['values'], dtype=float)
    bandwidth = float(data.get('bandwidth', 1.5))
    center_frequency = float(data.get('center_frequency', 1.0))

    if wavelet_type == 'cmor':
        wavelet = f'cmor{bandwidth}-{center_frequency}'

    elif wavelet_type == 'mexh':
        wavelet = 'mexh'

    scales = np.arange(1, 128)

    coefficients, frequencies = pywt.cwt(
        values,
        scales,
        wavelet,
        sampling_period=1/40
    )

    return {
        "coefficients": np.log1p(np.abs(coefficients)).tolist(),
        "frequencies": frequencies.tolist()
    }

if __name__ == "__main__":
    app.run(debug=True)