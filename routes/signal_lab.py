from uuid import uuid4
from datetime import datetime

from flask import (
    Blueprint,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

from services.wavelet_service import compress_wavelet
from services.signal_store import signal_store
from services.svm_service import detect_svm_events

from services.event_sampling import (
    send_on_delta,
    energy_domain_sampling,
    predictive_send_on_delta,
    integral_criterion_sampling,
)


signal_lab_bp = Blueprint("signal_lab", __name__)


@signal_lab_bp.route("/signal-lab")
def signal_lab():
    signal_id = session.get("signal_id")

    if not signal_id or signal_id not in signal_store:
        return redirect(url_for("earthscope"))

    signal_data = signal_store[signal_id]

    source = signal_data.get("source", "earthscope")

    if source == "water":
        back_url = url_for("water.water")
        back_label = "Water Data Explorer"
    else:
        back_url = url_for("earthscope")
        back_label = "EarthScope"

    return render_template(
        "signal_lab.html",
        values=signal_data["values"],
        times=signal_data["times"],
        back_url=back_url,
        back_label=back_label,
    )


@signal_lab_bp.route("/save-signal", methods=["POST"])
def save_signal():
    data = request.get_json()

    values = data.get("values")
    times = data.get("times")

    if not values:
        return {"error": "No signal data available"}, 400

    signal_id = str(uuid4())

    signal_store[signal_id] = {
        "values": values,
        "times": times,
        "source": data.get("source", "earthscope"),
    }

    session["signal_id"] = signal_id

    return {
        "redirect": url_for("signal_lab.signal_lab")
    }


@signal_lab_bp.route("/compress-signal", methods=["POST"])
def compress_signal():
    data = request.get_json(silent=True) or {}

    signal_id = session.get("signal_id")

    if not signal_id or signal_id not in signal_store:
        return {"error": "No signal loaded"}, 400

    values = signal_store[signal_id]["values"]

    try:
        return compress_wavelet(
            values,
            retain_fraction=data.get("retain_fraction", 0.10),
        )
    except (ValueError, TypeError) as error:
        return {"error": str(error)}, 400


@signal_lab_bp.route("/api/event-sampling", methods=["POST"])
def event_sampling():
    data = request.get_json(silent=True) or {}

    values = data.get("values", [])
    times = data.get("times", [])
    threshold = data.get("threshold")

    if threshold is None:
        return {"error": "Threshold is required."}, 400

    try:
        threshold = float(threshold)
    except (TypeError, ValueError):
        return {"error": "Threshold must be numeric."}, 400

    if threshold <= 0:
        return {"error": "Threshold must be greater than zero."}, 400

    algorithm = data.get("algorithm", "send_on_delta")

    if algorithm == "send_on_delta":
        transmitted = send_on_delta(values, threshold)

    elif algorithm == "energy_domain":

        if len(times) != len(values):
            return {"error": "Time and signal arrays must have the same length."}, 400

        try:
            time_seconds = [
                datetime.fromisoformat(t.replace("Z", "+00:00")).timestamp()
                for t in times
            ]
        except (TypeError, ValueError):
            return {"error": "Invalid time format."}, 400

        transmitted = energy_domain_sampling(
            values,
            time_seconds,
            threshold
        )

    elif algorithm == "predictive_send_on_delta":
        transmitted, reconstructed = predictive_send_on_delta(
            values,
            threshold
        )

    elif algorithm == "integral_criterion":

        if len(times) != len(values):
            return {
                "error": "Time and signal arrays must have the same length."
            }, 400

        try:
            time_seconds = [
                datetime.fromisoformat(
                    t.replace("Z", "+00:00")
                ).timestamp()
                for t in times
            ]
        except (TypeError, ValueError):
            return {"error": "Invalid time format."}, 400

        transmitted = integral_criterion_sampling(
            values,
            time_seconds,
            threshold
        )

    else:
        return {"error": "Unknown sampling algorithm."}, 400

    response = {
        "algorithm": algorithm,
        "threshold": threshold,
        "original_count": len(values),
        "transmitted_count": len(transmitted),
        "reduction_percent": (
            100 * (1 - len(transmitted) / len(values))
            if values else 0
        ),
        "samples": transmitted,
    }

    if algorithm == "predictive_send_on_delta":
        response["reconstructed"] = reconstructed

    return response


@signal_lab_bp.route("/api/svm-events", methods=["POST"])
def svm_events():

    data = request.get_json(silent=True) or {}

    values = data.get("values", [])

    try:
        C = float(data.get("C", 100))
        gamma = float(data.get("gamma", 0.1))
        epsilon = float(data.get("epsilon", 20))
    except (TypeError, ValueError):
        return {
            "error": "C, gamma and epsilon must be numeric."
        }, 400

    if C <= 0:
        return {"error": "C must be greater than zero."}, 400

    if gamma <= 0:
        return {"error": "Gamma must be greater than zero."}, 400

    if epsilon < 0:
        return {"error": "Epsilon cannot be negative."}, 400

    try:
        result = detect_svm_events(
            values,
            C=C,
            gamma=gamma,
            epsilon=epsilon,
        )
    except (ValueError, TypeError) as error:
        return {"error": str(error)}, 400

    return result