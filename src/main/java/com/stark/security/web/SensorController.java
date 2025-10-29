package com.stark.security.web;

import com.stark.security.domain.SensorReading;
import com.stark.security.service.SensorProcessingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sensors")
public class SensorController {
  private final SensorProcessingService processingService;

  public SensorController(SensorProcessingService processingService) {
    this.processingService = processingService;
  }

  @PostMapping("/reading")
  public ResponseEntity<String> ingest(@Valid @RequestBody SensorReading reading) {
    processingService.process(reading);
    return ResponseEntity.accepted().body("OK");
  }
}
