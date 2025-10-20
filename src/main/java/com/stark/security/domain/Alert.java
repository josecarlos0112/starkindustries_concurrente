package com.stark.security.domain;

public record Alert(
    String id,
    SensorType type,
    String sensorId,
    String severity,
    String message,
    long timestamp
) {}
