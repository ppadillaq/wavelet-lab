import numpy as np

from sklearn.svm import SVR


def detect_svm_events(values, C=100, gamma=0.1, epsilon=20):
    """
    Detect events using an RBF Support Vector Regression model.

    Events are observations whose residual lies outside
    the epsilon-insensitive tube.
    """

    values = np.asarray(values, dtype=float)

    if values.size == 0:
        raise ValueError("Signal is empty.")

    X = np.arange(len(values)).reshape(-1, 1)

    model = SVR(
        kernel="rbf",
        C=float(C),
        gamma=float(gamma),
        epsilon=float(epsilon),
    )

    prediction = model.fit(X, values).predict(X)

    residual = np.abs(values - prediction)

    tolerance = 1e-10

    event_mask = residual > model.epsilon + tolerance

    event_indices = np.flatnonzero(event_mask)

    return {
        "prediction": prediction.tolist(),
        "upper_tube": (prediction + model.epsilon).tolist(),
        "lower_tube": (prediction - model.epsilon).tolist(),
        "event_indices": event_indices.tolist(),
        "event_values": values[event_indices].tolist(),
        "total_samples": int(values.size),
        "event_count": int(event_indices.size),
        "event_percent": (
            100.0 * event_indices.size / values.size
        ),
    }