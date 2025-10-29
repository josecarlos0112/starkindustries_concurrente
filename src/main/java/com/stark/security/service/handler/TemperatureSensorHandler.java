package com.stark.security.service.handler;

import com.stark.security.domain.SensorReading;
import com.stark.security.domain.SensorType;
import com.stark.security.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class TemperatureSensorHandler implements SensorHandler {
    private static final Logger log = LoggerFactory.getLogger(TemperatureSensorHandler.class);
    private final NotificationService notificationService;

    public TemperatureSensorHandler(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Override
    public SensorType getType() {
        return SensorType.TEMPERATURE;
    }

    @Override
    public void handle(SensorReading r) {
        log.info("Temperature reading from {} value={}", r.sensorId(), r.value());
        if (r.value() > 60) {
            notificationService.raise("TEMP-" + UUID.randomUUID(), r, "CRITICAL", "Temperatura anómala");
        }
    }
}

