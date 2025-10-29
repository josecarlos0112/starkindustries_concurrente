package com.stark.security.service;

import com.stark.security.domain.Alert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
  private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

  private final SimpMessagingTemplate messagingTemplate;

  public NotificationService(SimpMessagingTemplate messagingTemplate) {
    this.messagingTemplate = messagingTemplate;
  }

  public void notifyAlert(Alert alert) {
    log.warn("ALERT {} [{}] from {} -> {}", alert.id(), alert.severity(), alert.sensorId(), alert.message());
    messagingTemplate.convertAndSend("/topic/alerts", alert);
  }
}
