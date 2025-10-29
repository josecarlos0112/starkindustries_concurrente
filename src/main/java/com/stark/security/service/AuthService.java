package com.stark.security.service;

import org.springframework.stereotype.Service;

// AuthService ya no carga users.json cuando usas InMemoryUserDetails.
// Mantengo un stub para evitar errores de referencia; puedes borrar este archivo si no se usa.
@Service
public class AuthService {

    public boolean validate(String username, String password) {
        // No usado cuando se emplea InMemoryUserDetailsManager.
        return false;
    }
}
