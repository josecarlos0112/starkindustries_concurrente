package com.stark.security.domain;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record SensorReading(
    @NotNull SensorType type,
    @NotNull String sensorId,
    @NotNull Long timestamp,
    @PositiveOrZero double value,
    String metadata
) {}
