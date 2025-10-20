package com.stark.security;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class StarkSecurityApplication {
  public static void main(String[] args) {
    SpringApplication.run(StarkSecurityApplication.class, args);
  }
}
