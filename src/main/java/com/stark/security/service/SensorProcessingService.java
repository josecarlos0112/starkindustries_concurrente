package com.stark.security.service;

import com.stark.security.domain.Alert;
import com.stark.security.domain.SensorReading;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class SensorProcessingService {
  private static final Logger log = LoggerFactory.getLogger(SensorProcessingService.class);

  private final NotificationService notificationService;
  private final AccessControlService accessControlService;

  public SensorProcessingService(NotificationService notificationService, AccessControlService accessControlService) {
    this.notificationService = notificationService;
    this.accessControlService = accessControlService;
  }

  public String process(SensorReading reading) {
    log.info("Processing reading - Type: {}, SensorId: {}, Value: {}, Timestamp: {}",
            reading.type(), reading.sensorId(), reading.value(), reading.timestamp());

    switch (reading.type()) {
      case MOTION -> handleMotion(reading);
      case TEMPERATURE -> handleTemperature(reading);
      case ACCESS -> handleAccess(reading);
      default -> log.warn("Unknown sensor type: {}", reading.type());
    }
    return "OK";
  }

  private void handleMotion(SensorReading r) {
    log.info("Motion reading from {} value={}", r.sensorId(), r.value());
    if (r.value() > 0.5) {
      raise("MOTION-" + UUID.randomUUID(), r, "HIGH", "Movimiento sospechoso detectado");
    }
  }

  private void handleTemperature(SensorReading r) {
    log.info("Temperature reading from {} value={} (Threshold: 60)", r.sensorId(), r.value());
    if (r.value() > 60) {
      log.info("Temperature alert triggered - value {} > 60", r.value());
      raise("TEMP-" + UUID.randomUUID(), r, "CRITICAL", "Temperatura anómala: " + r.value() + "°C");
    } else {
      log.info("Temperature normal - value {} <= 60", r.value());
    }
  }

  private void handleAccess(SensorReading r) {
    log.info("Access reading from {} meta={}", r.sensorId(), r.metadata());
    String badge = r.metadata() == null ? "" : r.metadata();
    if (!accessControlService.isAuthorized(badge)) {
      raise("ACCESS-" + UUID.randomUUID(), r, "HIGH", "Acceso no autorizado: " + badge);
    }
  }

  private void raise(String id, SensorReading r, String severity, String message) {
    Alert alert = new Alert(id, r.type(), r.sensorId(), severity, message, System.currentTimeMillis());
    log.info("Raising alert: {}", alert);
    notificationService.notifyAlert(alert);
  }
}