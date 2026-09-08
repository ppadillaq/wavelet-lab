import os
import requests

USGS_API_KEY = os.getenv("USGS_API_KEY")

USGS_MONITORING_LOCATIONS_URL = (
    "https://api.waterdata.usgs.gov/ogcapi/v0/"
    "collections/monitoring-locations/items"
)

USGS_TIME_SERIES_URL = (
    "https://api.waterdata.usgs.gov/ogcapi/v0/"
    "collections/time-series-metadata/items"
)

USGS_CONTINUOUS_URL = (
    "https://api.waterdata.usgs.gov/ogcapi/v0/"
    "collections/continuous/items"
)


def get_usgs_headers():
    headers = {}

    if USGS_API_KEY:
        headers["X-Api-Key"] = USGS_API_KEY

    return headers


def get_monitoring_locations(
    state_code="06",
    site_type_code="ST",
    limit=20
):
    params = {
        "state_code": state_code,
        "site_type_code": site_type_code,
        "limit": limit,
        "f": "json"
    }

    response = requests.get(
        USGS_MONITORING_LOCATIONS_URL,
        params=params,
        headers=get_usgs_headers(),
        timeout=20
    )

    response.raise_for_status()

    return response.json()


def get_time_series_metadata(monitoring_location_id, limit=100):
    params = {
        "monitoring_location_id": monitoring_location_id,
        "limit": limit,
        "f": "json"
    }

    response = requests.get(
        USGS_TIME_SERIES_URL,
        params=params,
        headers=get_usgs_headers(),
        timeout=20
    )

    response.raise_for_status()

    return response.json()


USGS_LATEST_CONTINUOUS_URL = (
    "https://api.waterdata.usgs.gov/ogcapi/v0/"
    "collections/latest-continuous/items"
)


def get_latest_streamflow_locations(
    state_code="06",
    limit=20
):
    params = {
        "state_code": state_code,
        "site_type_code": "ST",
        "parameter_code": "00060",
        "limit": limit,
        "f": "json"
    }

    response = requests.get(
        USGS_LATEST_CONTINUOUS_URL,
        params=params,
        headers=get_usgs_headers(),
        timeout=20
    )

    response.raise_for_status()

    return response.json()

def get_monitoring_location(monitoring_location_id):
    params = {
        "id": monitoring_location_id,
        "limit": 1,
        "f": "json"
    }

    response = requests.get(
        USGS_MONITORING_LOCATIONS_URL,
        params=params,
        headers=get_usgs_headers(),
        timeout=20
    )

    response.raise_for_status()

    data = response.json()
    features = data.get("features", [])

    if not features:
        return None

    return features[0]


def get_continuous_data(
    monitoring_location_id,
    start,
    end,
    parameter_code="00060",
    limit=50000
):
    params = {
        "monitoring_location_id": monitoring_location_id,
        "parameter_code": parameter_code,
        "datetime": f"{start}/{end}",
        "limit": limit,
        "f": "json"
    }

    response = requests.get(
        USGS_CONTINUOUS_URL,
        params=params,
        headers=get_usgs_headers(),
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    features = data.get("features", [])

    # Follow pagination links if necessary
    next_url = None

    for link in data.get("links", []):
        if link.get("rel") == "next":
            next_url = link.get("href")
            break

    while next_url:

        response = requests.get(
            next_url,
            headers=get_usgs_headers(),
            timeout=30
        )

        response.raise_for_status()

        page = response.json()

        features.extend(page.get("features", []))

        next_url = None

        for link in page.get("links", []):
            if link.get("rel") == "next":
                next_url = link.get("href")
                break

    return features


def get_monitoring_locations_by_ids(station_ids):
    if not station_ids:
        return {}

    params = {
        "id": ",".join(station_ids),
        "limit": len(station_ids),
        "f": "json"
    }

    response = requests.get(
        USGS_MONITORING_LOCATIONS_URL,
        params=params,
        headers=get_usgs_headers(),
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    return {
        feature["id"]: feature
        for feature in data.get("features", [])
    }