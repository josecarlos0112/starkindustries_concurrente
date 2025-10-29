package com.stark.security.service.notify;

import com.stark.security.domain.Alert;

public interface Notifier {
    void send(Alert alert);
}

