def send_on_delta(values, threshold):
    """
    Send-on-Delta event-based sampling.

    A new sample is transmitted when the current value differs
    from the last transmitted value by at least `threshold`.
    """

    if not values:
        return []

    transmitted = [{
        "index": 0,
        "value": values[0]
    }]

    last_sent = values[0]

    for i, value in enumerate(values[1:], start=1):
        if abs(value - last_sent) >= threshold:
            transmitted.append({
                "index": i,
                "value": value
            })
            last_sent = value

    return transmitted


def energy_domain_sampling(values, times, threshold):
    """
    Event-based sampling in the error-energy domain.

    A new sample is transmitted when the accumulated squared
    error with respect to the last transmitted value reaches
    the specified threshold.
    """

    if not values:
        return []

    transmitted = [{
        "index": 0,
        "value": values[0]
    }]

    last_sent = values[0]
    accumulated_energy = 0.0

    for i in range(1, len(values)):

        error = values[i] - last_sent

        dt = times[i] - times[i - 1]

        accumulated_energy += error ** 2 * dt

        if accumulated_energy >= threshold:
            transmitted.append({
                "index": i,
                "value": values[i]
            })

            last_sent = values[i]
            accumulated_energy = 0.0

    return transmitted


def predictive_send_on_delta(values, threshold):
    """
    Send-on-Delta with a first-order linear predictor.

    Returns transmitted samples and the signal reconstructed
    by the receiver.
    """

    if not values:
        return [], []

    transmitted = [{
        "index": 0,
        "value": values[0]
    }]

    reconstructed = [values[0]]

    for i in range(1, len(values)):

        if i == 1:
            prediction = reconstructed[-1]
        else:
            prediction = (
                2 * reconstructed[-1]
                - reconstructed[-2]
            )

        error = values[i] - prediction

        if abs(error) >= threshold:
            transmitted.append({
                "index": i,
                "value": values[i]
            })

            reconstructed.append(values[i])

        else:
            reconstructed.append(prediction)

    return transmitted, reconstructed


def integral_criterion_sampling(values, times, threshold):
    """
    Event-based sampling according to the integral criterion.

    A new sample is transmitted when the accumulated absolute
    error with respect to the last transmitted value reaches
    the specified threshold.
    """

    if not values:
        return []

    transmitted = [{
        "index": 0,
        "value": values[0]
    }]

    last_sent = values[0]
    accumulated_error = 0.0

    for i in range(1, len(values)):
        error = abs(values[i] - last_sent)
        dt = times[i] - times[i - 1]

        accumulated_error += error * dt

        if accumulated_error >= threshold:
            transmitted.append({
                "index": i,
                "value": values[i]
            })

            last_sent = values[i]
            accumulated_error = 0.0

    return transmitted