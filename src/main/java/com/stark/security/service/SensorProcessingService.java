package com.stark.security.service;

import com.stark.security.domain.SensorReading;
import com.stark.security.domain.SensorType;
import com.stark.security.service.handler.SensorHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class SensorProcessingService {
  private static final Logger log = LoggerFactory.getLogger(SensorProcessingService.class);

  private final Map<SensorType, SensorHandler> handlers = new EnumMap<>(SensorType.class);

  public SensorProcessingService(List<SensorHandler> handlerList) {
    for (SensorHandler h : handlerList) {
      handlers.put(h.getType(), h);
    }
  }

  @Async("sensorExecutor")
  public CompletableFuture<String> process(SensorReading reading) {
    try {
      SensorHandler handler = handlers.get(reading.type());
      if (handler == null) {
        log.warn("No handler for sensor type {}", reading.type());
      } else {
        handler.handle(reading);
      }
    } catch (Exception e) {
      log.error("Error processing reading from {}: {}", reading.sensorId(), e.getMessage());
    }
    return CompletableFuture.completedFuture("OK");
  }
}

