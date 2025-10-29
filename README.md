# Implementación de un Sistema de Seguridad Concurrente en Stark Industries

## Integrantes del grupo
- José Carlos Zorrilla García
- Daniel de Alfonso Martínez
- Dmitry Kravets

## Resumen de la solución
Sistema de seguridad en tiempo real construido con Spring Boot que procesa lecturas de múltiples sensores concurrentemente mediante `@Async` y un `ThreadPoolTaskExecutor`. Incluye control de acceso con Spring Security, notificaciones en tiempo real vía WebSocket/STOMP, monitorización con Actuator y logging estructurado.

## Cómo ejecutar
1. Requisitos: Java 17+, Maven 3.9+
2. Compilar y ejecutar:
   ```bash
   mvn spring-boot:run
   ```
3. Dashboard: abrir `http://localhost:8080/` para ver alertas en tiempo real.
4. Autenticación:
   - `admin / admin123` (ROLE_ADMIN)
   - `op / op123` (ROLE_OPERATOR)
   - `guard / guard123` (ROLE_USER)

## Endpoints clave
- `POST /api/sensors/reading` — Ingesta de lecturas (requiere `ROLE_ADMIN` o `ROLE_OPERATOR`).
  Ejemplo de cuerpo:
  ```json
  { "type":"MOTION", "sensorId":"M-01", "timestamp": 1700000000000, "value": 0.8 }
  ```

  Para ACCESS (control de acceso), enviar `metadata` con el id de la credencial:
  ```json
  { "type":"ACCESS", "sensorId":"D-01", "timestamp": 1700000000000, "value": 1, "metadata":"BADGE-XYZ" }
  ```

- WebSocket STOMP:
  - Endpoint: `/ws` (SockJS)
  - Suscripción a alertas: `/topic/alerts`

- Actuator:
  - `/actuator/health`, `/actuator/metrics`, `/actuator/threaddump`, `/actuator/loggers` (acceso restringido a `ROLE_ADMIN`).

## Concurrencia
- `@EnableAsync` en `AsyncConfig`.
- `AsyncConfig#sensorExecutor`: pool 8–32 hilos, cola 1000, prefijo `sensor-`.
- `SensorProcessingService#process` es asíncrono (`@Async("sensorExecutor")`) y despacha al handler por tipo.
- No hay backpressure real en este ejemplo; para producción considerar Spring Cloud Stream/Kafka + Reactive (Project Reactor).

## Seguridad
- Spring Security en memoria con roles `ADMIN`, `OPERATOR` y `USER`.
- Reglas:
  - Público: estáticos (`/index.html`, `/app.js`, `/styles.css`, imagen), WebSocket (`/ws`, `/sockjs`, `/topic/*`) y `/api/auth/validate`.
  - Protegido: `/api/sensors/**` requiere `ROLE_ADMIN` o `ROLE_OPERATOR`.
  - Actuator `/actuator/**` limitado a `ROLE_ADMIN`.

## Notificaciones
- `NotificationService` publica `Alert` a `/topic/alerts` vía `SimpMessagingTemplate`.
- Notificadores externos (stubs listos para integrar): `EmailNotifier` y `MobilePushNotifier`.

## Monitorización y Logs
- Actuator expone endpoints para salud, métricas y volcado de hilos.
- `logback-spring.xml` define salida de consola con timestamp y nombre de hilo.

## Diagrama de Arquitectura del Sistema
El siguiente diagrama presenta los componentes principales, límites de seguridad, y los flujos entre sensores, API, procesamiento, notificaciones y observabilidad.
```mermaid
%% contenido idéntico al archivo docs/architecture.mmd para vista inline
flowchart LR
  subgraph External[Fuera del Sistema]
    Sensors[[Sensores\n(MOTION/TEMP/ACCESS)]]
    Browser[[Operador/Admin\nNavegador SPA]]
  end

  subgraph Host[Servidor (Java 17, Spring Boot 3)]
    direction TB

    subgraph Security[Security Boundary]
      Sec[Spring Security\nSecurityFilterChain\nInMemoryUserDetails]
    end

    subgraph API[REST API]
      Ctrl[SensorController\nPOST /api/sensors/reading]
      AuthCtrl[AuthController\nGET /api/auth/validate]
    end

    subgraph Processing[Procesamiento de Sensores]
      Proc[SensorProcessingService\n@Async("sensorExecutor")]
      Exec[[ThreadPoolTaskExecutor\n"sensorExecutor" (8–32)]]
      subgraph Handlers[Handlers por Tipo]
        H1[MotionSensorHandler]
        H2[TemperatureSensorHandler]
        H3[AccessSensorHandler]
      end
      AccessSvc[AccessControlService]
    end

    subgraph Notify[Notificaciones]
      NSvc[NotificationService]
      Broker[(STOMP Simple Broker\n/topic/alerts)]
      EN[EmailNotifier]
      PN[MobilePushNotifier]
    end

    subgraph Ops[Operación / Observabilidad]
      Act[/Actuator\n/health /metrics /threaddump/]
      Logs[[Logback Console]]
    end
  end

  Sensors -- HTTP JSON --> Sec
  Browser <-- HTML/CSS/JS -- Sec
  Sec --> Ctrl
  Sec --> AuthCtrl
  Ctrl --> Proc
  Proc --> Exec
  Proc --> H1
  Proc --> H2
  Proc --> H3
  H3 --> AccessSvc
  Proc --> NSvc
  NSvc --> Broker
  NSvc --> EN
  NSvc --> PN
  Browser == STOMP/SockJS == Broker

  Host --- Act
  Host --- Logs
```

```mermaid
%% contenido idéntico a docs/deployment.mmd para vista inline
flowchart TB
  User[Operador/Admin\nNavegador] -- HTTP/WS:8080 --> LB[Host Único]
  Sensors[[Sensores en LAN]] -- HTTP:8080 --> LB

  subgraph LB[Servidor]
    JRE[Java 17 Runtime]
    App[Spring Boot Jar\n(stark-security-concurrent)]
    Broker[(STOMP Simple Broker)]
  end

  App --- Broker
  classDef infra fill:#eef,stroke:#88a
  class LB,JRE infra
```
```mermaid
flowchart LR
  subgraph External
    Sensors[[Sensores\n(MOTION/TEMP/ACCESS)]]
    Browser[[Navegador\nDashboard SPA]]
  end

  subgraph SpringBoot["Aplicación Spring Boot (8080)"]
    direction TB
    Security[Spring Security\nInMemoryUserDetailsManager\nSecurityFilterChain]
    Controller[REST Controller\n`/api/sensors/reading`]
    Proc[SensorProcessingService\n(lógica por tipo)]
    Access[AccessControlService\n(credenciales válidas)]
    Notify[NotificationService\nSimpMessagingTemplate]
    WSBroker[(Simple STOMP Broker\n`/topic/*`)]
  end

  Sensors -- HTTP JSON --> Security
  Browser <-- HTML/CSS/JS -- Security
  Security --> Controller
  Controller --> Proc
  Proc --> Access
  Proc --> Notify
  Notify --> WSBroker
  Browser == STOMP/SockJS == WSBroker

  subgraph Ops["Operación / Observabilidad"]
    Actuator[/Actuator\n/health /metrics /threaddump/]
    Logs[[Logback Console]]
  end

  SpringBoot --- Actuator
  SpringBoot --- Logs
```

```

## Estructura de archivos (relevantes)
- `pom.xml` — Dependencias y build.
- `src/main/java/com/stark/security/config/AsyncConfig.java` — Pool de hilos y `@EnableAsync`.
- `src/main/java/com/stark/security/config/SecurityConfig.java` — Reglas de autenticación/autorización.
- `src/main/java/com/stark/security/config/WebSocketConfig.java` — STOMP/WebSocket.
- `src/main/java/com/stark/security/domain/*` — `SensorType`, `SensorReading`, `Alert`.
- `src/main/java/com/stark/security/service/AccessControlService.java` — Control de credenciales.
- `src/main/java/com/stark/security/service/SensorProcessingService.java` — Despacho asíncrono por tipo.
- `src/main/java/com/stark/security/service/handler/*` — Handlers por tipo (`Motion`, `Temperature`, `Access`).
- `src/main/java/com/stark/security/service/NotificationService.java` — Envío a STOMP y a notifiers externos.
- `src/main/java/com/stark/security/service/notify/*` — Notifiers stub (`EmailNotifier`, `MobilePushNotifier`).
- `src/main/java/com/stark/security/web/SensorController.java` — Endpoint de ingesta (202 Accepted, async).
- `src/main/resources/application.yml` — Configuración.
- `src/main/resources/static/index.html` — Dashboard simple de alertas.
- `src/main/resources/logback-spring.xml` — Logging.

## Pruebas rápidas (cURL)
Generar una alerta de movimiento:
```bash
curl -u op:op123 -H "Content-Type: application/json" \
  -d '{"type":"MOTION","sensorId":"M-01","timestamp":1730000000000,"value":0.9}' \
  http://localhost:8080/api/sensors/reading
```
Intento de acceso no autorizado:
```bash
curl -u admin:admin123 -H "Content-Type: application/json" \
  -d '{"type":"ACCESS","sensorId":"D-01","timestamp":1730000000000,"value":1,"metadata":"BADGE-XYZ"}' \
  http://localhost:8080/api/sensors/reading
```

## Mejores prácticas y extensiones sugeridas
- Colas/mensajería (Kafka/RabbitMQ) para desacoplar y nivelar picos.
- Persistencia de eventos (PostgreSQL/TimescaleDB) y auditoría.
- Rate limiting/bulkheads (Resilience4j).
- Métricas personalizadas con Micrometer (timers, counters por sensor).
- Integración con push móvil/email (Twilio SendGrid, Firebase Cloud Messaging).

---

© Stark Industries — Caso práctico tema 1
