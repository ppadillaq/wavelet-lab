import numpy as np
import pywt


def wavelet_denoise(values, wavelet="db4", strength=50):
    """
    Adaptive wavelet denoising.

    Strength is expressed as a percentage from 0 to 100.
    The maximum threshold is determined from the distribution
    of the detail coefficients of the current signal.
    """

    values = np.asarray(values, dtype=float)

    if values.size == 0:
        raise ValueError("Signal is empty.")

    strength = float(strength)

    if not 0 <= strength <= 100:
        raise ValueError(
            "Denoising strength must be between 0 and 100."
        )

    coeffs = pywt.wavedec(values, wavelet)

    # Collect all detail coefficients
    detail_coeffs = np.concatenate([
        np.abs(detail).ravel()
        for detail in coeffs[1:]
    ])

    # Robust noise estimate for diagnostic purposes
    finest_detail = coeffs[-1]
    sigma = (
        np.median(np.abs(finest_detail))
        / 0.6745
    )

    # Signal-adaptive maximum threshold
    max_threshold = np.quantile(
        detail_coeffs,
        0.95
    )

    # Map 0-100% to the adaptive threshold
    threshold = (
        strength / 100.0
    ) * max_threshold

    # Preserve approximation coefficients
    denoised_coeffs = [coeffs[0]]

    denoised_coeffs.extend(
        pywt.threshold(
            detail,
            threshold,
            mode="soft"
        )
        for detail in coeffs[1:]
    )

    reconstructed = pywt.waverec(
        denoised_coeffs,
        wavelet
    )[:values.size]

    return {
        "denoised": reconstructed.tolist(),
        "noise_sigma": float(sigma),
        "threshold": float(threshold),
        "max_threshold": float(max_threshold),
    }