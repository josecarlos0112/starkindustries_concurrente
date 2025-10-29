package com.stark.security.service.handler;

import com.stark.security.domain.SensorReading;
import com.stark.security.domain.SensorType;

public interface SensorHandler {
    SensorType getType();
    void handle(SensorReading reading);
}

