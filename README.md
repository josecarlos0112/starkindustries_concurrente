# Implementación de un Sistema de Seguridad Concurrente en Stark Industries

## Integrantes del grupo
- (Rellena aquí) Nombre 1 — Rol
- (Rellena aquí) Nombre 2 — Rol
- (Rellena aquí) Nombre 3 — Rol
- (Rellena aquí) Nombre 4 — Rol

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

## Endpoints clave
- `POST /api/sensors/reading` — Ingesta de lecturas (requiere ROLE_ADMIN o ROLE_OPERATOR).
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
  - `/actuator/health`, `/actuator/metrics`, `/actuator/threaddump` (ROLE_ADMIN)

## Concurrencia
- `@EnableAsync` en la aplicación.
- `AsyncConfig#sensorExecutor`: pool 8–32 hilos, cola 1000.
- `SensorProcessingService#process` ejecuta por tipo de sensor en paralelo.
- No hay backpressure real en este ejemplo; para producción considerar Spring Cloud Stream/Kafka + Reactive (Project Reactor).

## Seguridad
- Spring Security en memoria con roles `ADMIN` y `OPERATOR`.
- Regla: endpoints REST protegidos; dashboard y websocket públicos (ajustar según necesidad).

## Notificaciones
- `NotificationService` publica `Alert` a `/topic/alerts` vía `SimpMessagingTemplate`.
- `index.html` suscribe con SockJS/STOMP y lista las alertas entrantes.

## Monitorización y Logs
- Actuator expone endpoints para salud, métricas y volcado de hilos.
- `logback-spring.xml` define salida de consola con timestamp y nombre de hilo.

## Arquitectura (alto nivel)
```mermaid
flowchart LR
  Sensors[[Sensores
Movimiento/Temp/Acceso]] -->|HTTP JSON| API[REST API /api/sensors]
  API -->|@Async| Proc[SensorProcessingService]
  Proc -->|Alertas| WS[(STOMP /topic/alerts)]
  Proc --> Sec[AccessControlService]
  WS --> UI[Dashboard Web]
  Act[Spring Actuator] --- App[Spring Boot App]
```

## Estructura de archivos (relevantes)
- `pom.xml` — Dependencias y build.
- `src/main/java/com/stark/security/StarkSecurityApplication.java` — Main + `@EnableAsync`.
- `src/main/java/com/stark/security/config/AsyncConfig.java` — Config. del pool de hilos.
- `src/main/java/com/stark/security/config/SecurityConfig.java` — Reglas de autenticación/autorización.
- `src/main/java/com/stark/security/config/WebSocketConfig.java` — STOMP/WebSocket.
- `src/main/java/com/stark/security/domain/*` — `SensorType`, `SensorReading`, `Alert`.
- `src/main/java/com/stark/security/service/AccessControlService.java` — Control de credenciales.
- `src/main/java/com/stark/security/service/SensorProcessingService.java` — Lógica concurrente y generación de alertas.
- `src/main/java/com/stark/security/service/NotificationService.java` — Envío de notificaciones.
- `src/main/java/com/stark/security/web/SensorController.java` — Endpoint de ingesta.
- `src/main/resources/application.yml` — Configuración.
- `src/main/resources/static/index.html` — Dashboard simple de alertas.
- `src/main/resources/logback-spring.xml` — Logging.

## Pruebas rápidas (cURL)
Generar una alerta de movimiento:
```bash
curl -u op:op123 -H "Content-Type: application/json" -d '{"type":"MOTION","sensorId":"M-01","timestamp":1730000000000,"value":0.9}' http://localhost:8080/api/sensors/reading
```
Intento de acceso no autorizado:
```bash
curl -u admin:admin123 -H "Content-Type: application/json" -d '{"type":"ACCESS","sensorId":"D-01","timestamp":1730000000000,"value":1,"metadata":"BADGE-XYZ"}' http://localhost:8080/api/sensors/reading
```

## Mejores prácticas y extensiones sugeridas
- Colas/mensajería (Kafka/RabbitMQ) para desacoplar y nivelar picos.
- Persistencia de eventos (PostgreSQL/TimescaleDB) y auditoría.
- Rate limiting/bulkheads (Resilience4j).
- Métricas personalizadas con Micrometer (timers, counters por sensor).
- Integración con push móvil/email (Twilio SendGrid, Firebase Cloud Messaging).

---

© Stark Industries — Caso práctico tema 1
