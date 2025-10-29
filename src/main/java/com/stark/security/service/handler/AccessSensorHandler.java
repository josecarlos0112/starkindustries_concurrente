package com.stark.security.service.handler;

import com.stark.security.domain.SensorReading;
import com.stark.security.domain.SensorType;
import com.stark.security.service.AccessControlService;
import com.stark.security.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class AccessSensorHandler implements SensorHandler {
    private static final Logger log = LoggerFactory.getLogger(AccessSensorHandler.class);
    private final NotificationService notificationService;
    private final AccessControlService accessControlService;

    public AccessSensorHandler(NotificationService notificationService, AccessControlService accessControlService) {
        this.notificationService = notificationService;
        this.accessControlService = accessControlService;
    }

    @Override
    public SensorType getType() {
        return SensorType.ACCESS;
    }

    @Override
    public void handle(SensorReading r) {
        log.info("Access reading from {} meta={}", r.sensorId(), r.metadata());
        String badge = r.metadata() == null ? "" : r.metadata();
        if (!accessControlService.isAuthorized(badge)) {
            notificationService.raise("ACCESS-" + UUID.randomUUID(), r, "HIGH", "Acceso no autorizado: " + badge);
        }
    }
}

