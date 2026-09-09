import numpy as np
from sklearn.svm import SVR


def detect_svm_events(values, C=100, gamma=0.1, epsilon=20):

    values = np.asarray(values, dtype=float)

    if values.size == 0:
        raise ValueError("Signal is empty.")

    X = np.arange(len(values)).reshape(-1, 1)

    model = SVR(
        kernel="rbf",
        C=float(C),
        gamma=float(gamma),
        epsilon=float(epsilon)
    )

    prediction = model.fit(X, values).predict(X)

    residual = np.abs(values - prediction)

    support_indices = model.support_

    support_residuals = residual[support_indices]

    tolerance = 1e-10

    external_mask = (
        support_residuals >= model.epsilon - tolerance
    )

    internal_mask = ~external_mask

    external_indices = support_indices[external_mask]
    internal_indices = support_indices[internal_mask]

    return {
        "prediction": prediction.tolist(),

        "upper_tube": (
            prediction + model.epsilon
        ).tolist(),

        "lower_tube": (
            prediction - model.epsilon
        ).tolist(),

        "support_indices":
            support_indices.tolist(),

        "external_indices":
            external_indices.tolist(),

        "external_values":
            values[external_indices].tolist(),

        "internal_indices":
            internal_indices.tolist(),

        "internal_values":
            values[internal_indices].tolist(),

        "total_samples":
            int(values.size),

        "support_count":
            int(support_indices.size),

        "external_count":
            int(external_indices.size),

        "internal_count":
            int(internal_indices.size),

        "event_percent":
            100.0
            * external_indices.size
            / values.size,
    }