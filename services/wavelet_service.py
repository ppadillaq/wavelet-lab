import numpy as np
import pywt


def compress_wavelet(values, retain_fraction=0.10, wavelet="db4"):
    values = np.asarray(values, dtype=float)

    if values.size == 0:
        raise ValueError("Signal is empty.")

    retain_fraction = float(
        np.clip(retain_fraction, 0.01, 1.0)
    )

    coeffs = pywt.wavedec(values, wavelet)

    all_coeffs = np.concatenate([
        c.ravel() for c in coeffs
    ])

    threshold = np.quantile(
        np.abs(all_coeffs),
        1 - retain_fraction
    )

    coeffs_compressed = [
        pywt.threshold(c, threshold, mode="hard")
        for c in coeffs
    ]

    reconstructed = pywt.waverec(
        coeffs_compressed, wavelet
    )[:len(values)]

    n_total = sum(c.size for c in coeffs)
    n_nonzero = sum(
        np.count_nonzero(c)
        for c in coeffs_compressed
    )

    rmse = np.sqrt(
        np.mean((values - reconstructed) ** 2)
    )

    return {
        "compressed": reconstructed.tolist(),
        "coefficients_retained": int(n_nonzero),
        "coefficients_total": int(n_total),
        "rmse": float(rmse),
    }