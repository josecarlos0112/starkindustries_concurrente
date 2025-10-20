package com.stark.security.web;

import com.stark.security.domain.SensorReading;
import com.stark.security.service.SensorProcessingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/sensors")
public class SensorController {
  private final SensorProcessingService processingService;

  public SensorController(SensorProcessingService processingService) {
    this.processingService = processingService;
  }

  @PostMapping("/reading")
  public CompletableFuture<ResponseEntity<String>> ingest(@Valid @RequestBody SensorReading reading) {
    return processingService.process(reading)
        .thenApply(res -> ResponseEntity.accepted().body(res));
  }
}
