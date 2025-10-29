// java
package com.stark.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public InMemoryUserDetailsManager userDetailsService() {
        UserDetails op = User.withDefaultPasswordEncoder()
                .username("op")
                .password("op123")
                .roles("USER", "SENSOR_WRITE") // Agregar rol específico
                .build();
        UserDetails admin = User.withDefaultPasswordEncoder()
                .username("admin")
                .password("admin123")
                .roles("ADMIN", "SENSOR_WRITE")
                .build();
        UserDetails guard = User.withDefaultPasswordEncoder()
                .username("guard")
                .password("guard123")
                .roles("USER", "SENSOR_WRITE") // Agregar rol específico
                .build();
        return new InMemoryUserDetailsManager(op, admin, guard);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/index.html", "/styles.css", "/app.js",
                                "/logo_recurrente.png", "/ws/**", "/sockjs/**",
                                "/topic/**", "/api/auth/validate", "/api/sensors/reading").permitAll() // Permitir endpoint de sensores
                        .anyRequest().authenticated()
                )
                .formLogin(form -> form
                        .loginProcessingUrl("/login")
                        .loginPage("/").permitAll()
                        .failureUrl("/?loginError=true")
                        .defaultSuccessUrl("/", true)
                )
                .logout(logout -> logout
                        .logoutSuccessUrl("/").permitAll()
                );

        return http.build();
    }
}