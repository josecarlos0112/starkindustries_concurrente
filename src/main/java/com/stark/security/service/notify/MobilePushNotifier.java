package com.stark.security.service.notify;

import com.stark.security.domain.Alert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class MobilePushNotifier implements Notifier {
    private static final Logger log = LoggerFactory.getLogger(MobilePushNotifier.class);

    @Override
    public void send(Alert alert) {
        // Stub: integración real con FCM/APNS se puede añadir
        log.info("[MobilePushNotifier] Notificación push: {} - {}", alert.id(), alert.message());
    }
}

