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

  // Método ahora síncrono (se eliminó @Async y CompletableFuture)
  public String process(SensorReading reading) {
    // Simulate per-type processing logic
    switch (reading.type()) {
      case MOTION -> handleMotion(reading);
      case TEMPERATURE -> handleTemperature(reading);
      case ACCESS -> handleAccess(reading);
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
    log.info("Temperature reading from {} value={}", r.sensorId(), r.value());
    if (r.value() > 60) {
      raise("TEMP-" + UUID.randomUUID(), r, "CRITICAL", "Temperatura anómala");
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
    notificationService.notifyAlert(alert);
  }
}
// Nota: revisión - sin uso de @Async, CompletableFuture, Executors, Threads ni colecciones concurrentes.
