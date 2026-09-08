from flask import Blueprint, render_template, request
from datetime import datetime, timezone, timedelta

from services.water_service import (
    get_latest_streamflow_locations,
    get_monitoring_location,
    get_time_series_metadata,
    get_continuous_data,
    get_monitoring_locations_by_ids
)


water_bp = Blueprint(
    "water",
    __name__
)


@water_bp.route("/water")
def water():
    locations = []

    try:
        data = get_latest_streamflow_locations(limit=30)

        now = datetime.now(timezone.utc)
        max_age = timedelta(days=1)

        recent_features = []

        # Filter out old measurements
        for feature in data.get("features", []):
            p = feature.get("properties", {})

            station_id = p.get("monitoring_location_id")
            measurement_time = p.get("time")

            if not station_id or not measurement_time:
                continue

            try:
                timestamp = datetime.fromisoformat(
                    measurement_time.replace("Z", "+00:00")
                )
            except ValueError:
                continue

            if now - timestamp > max_age:
                continue

            recent_features.append(feature)

        # Retrieve metadata for all stations in one request
        station_ids = list({
            feature["properties"]["monitoring_location_id"]
            for feature in recent_features
        })

        metadata_by_id = get_monitoring_locations_by_ids(
            station_ids
        )

        # Build the table
        for feature in recent_features:
            p = feature.get("properties", {})

            station_id = p.get("monitoring_location_id")

            station = metadata_by_id.get(station_id)

            metadata = (
                station.get("properties", {})
                if station
                else {}
            )

            geometry = (
                station.get("geometry")
                if station and station.get("geometry")
                else feature.get("geometry")
            )

            locations.append({
                "id": station_id,
                "name": metadata.get("monitoring_location_name"),
                "county": metadata.get("county_name"),
                "state": metadata.get("state_name"),
                "site_type": metadata.get("site_type"),
                "value": p.get("value"),
                "unit": p.get("unit_of_measure"),
                "time": p.get("time"),
                "geometry": geometry
            })

    except Exception as exc:
        print(f"USGS Water Data error: {exc}")

    return render_template(
        "water.html",
        locations=locations
    )

@water_bp.route("/water/series/<path:station_id>")
def water_series(station_id):

    try:
        data = get_time_series_metadata(station_id)

        series = []

        for feature in data.get("features", []):

            p = feature.get("properties", {})

            series.append({
                "id": feature.get("id"),
                "parameter_name": p.get("parameter_name"),
                "parameter_code": p.get("parameter_code"),
                "unit": p.get("unit_of_measure"),
                "begin": p.get("begin_utc"),
                "end": p.get("end_utc"),
                "computation": p.get("computation_identifier")
            })

        return {
            "series": series
        }

    except Exception as exc:

        print(f"USGS time series error: {exc}")

        return {
            "error": str(exc)
        }, 500


@water_bp.route("/water/data/<path:station_id>")
def water_data(station_id):

    start = request.args.get("start")
    end = request.args.get("end")

    if not start or not end:
        return {
            "error": "Start and end dates are required."
        }, 400

    try:
        features = get_continuous_data(
            station_id,
            start=start,
            end=end
        )

        observations = []

        for feature in features:

            p = feature.get("properties", {})

            value = p.get("value")

            if value is None:
                continue

            observations.append({
                "time": p.get("time"),
                "value": value,
                "unit": p.get("unit_of_measure"),
                "time_series_id": p.get("time_series_id")
            })

        observations.sort(
            key=lambda observation: observation["time"] or ""
        )

        return {
            "station_id": station_id,
            "parameter_code": "00060",
            "count": len(observations),
            "observations": observations
        }

    except Exception as exc:

        print(f"USGS continuous data error: {exc}")

        return {
            "error": str(exc)
        }, 500