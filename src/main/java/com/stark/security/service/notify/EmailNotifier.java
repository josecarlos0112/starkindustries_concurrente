package com.stark.security.service.notify;

import com.stark.security.domain.Alert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class EmailNotifier implements Notifier {
    private static final Logger log = LoggerFactory.getLogger(EmailNotifier.class);

    @Override
    public void send(Alert alert) {
        // Stub: integración real con SMTP/SendGrid se puede añadir
        log.info("[EmailNotifier] Enviar email: {} - {}", alert.id(), alert.message());
    }
}

