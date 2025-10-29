package com.stark.security.service.handler;

import com.stark.security.domain.SensorReading;
import com.stark.security.domain.SensorType;
import com.stark.security.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class MotionSensorHandler implements SensorHandler {
    private static final Logger log = LoggerFactory.getLogger(MotionSensorHandler.class);
    private final NotificationService notificationService;

    public MotionSensorHandler(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Override
    public SensorType getType() {
        return SensorType.MOTION;
    }

    @Override
    public void handle(SensorReading r) {
        log.info("Motion reading from {} value={}", r.sensorId(), r.value());
        if (r.value() > 0.5) {
            notificationService.raise("MOTION-" + UUID.randomUUID(), r, "HIGH", "Movimiento sospechoso detectado");
        }
    }
}

