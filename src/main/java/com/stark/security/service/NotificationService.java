package com.stark.security.service;

import com.stark.security.domain.Alert;
import com.stark.security.domain.SensorReading;
import com.stark.security.service.notify.Notifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {
  private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

  private final SimpMessagingTemplate messagingTemplate;
  private final List<Notifier> notifiers;

  public NotificationService(SimpMessagingTemplate messagingTemplate, List<Notifier> notifiers) {
    this.messagingTemplate = messagingTemplate;
    this.notifiers = notifiers;
  }

  public void notifyAlert(Alert alert) {
    log.warn("ALERT {} [{}] from {} -> {}", alert.id(), alert.severity(), alert.sensorId(), alert.message());
    messagingTemplate.convertAndSend("/topic/alerts", alert);
    for (Notifier notifier : notifiers) {
      try {
        notifier.send(alert);
      } catch (Exception e) {
        log.warn("Notifier {} failed: {}", notifier.getClass().getSimpleName(), e.getMessage());
      }
    }
  }

  public void raise(String id, SensorReading r, String severity, String message) {
    Alert alert = new Alert(id, r.type(), r.sensorId(), severity, message, System.currentTimeMillis());
    notifyAlert(alert);
  }
}
