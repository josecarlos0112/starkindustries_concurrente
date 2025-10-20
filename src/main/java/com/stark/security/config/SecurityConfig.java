package com.stark.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .csrf(csrf -> csrf.disable())
      .authorizeHttpRequests(auth -> auth
          .requestMatchers("/actuator/**").hasRole("ADMIN")
          .requestMatchers("/api/sensors/**").hasAnyRole("ADMIN", "OPERATOR")
          .requestMatchers("/", "/index.html", "/ws/**").permitAll()
          .anyRequest().authenticated()
      )
      .httpBasic(Customizer.withDefaults())
      .formLogin(Customizer.withDefaults());
    return http.build();
  }

  @Bean
  public UserDetailsService users() {
    return new InMemoryUserDetailsManager(
      User.withUsername("admin").password("{noop}admin123").roles("ADMIN").build(),
      User.withUsername("op").password("{noop}op123").roles("OPERATOR").build()
    );
  }
}
