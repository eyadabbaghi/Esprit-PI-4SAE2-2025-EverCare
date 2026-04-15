package tn.esprit.apigateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@EnableDiscoveryClient

public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("activities-service", r -> r
                        .path(
                                "/EverCare/activities/**",
                                "/EverCare/admin/activities/**",
                                "/EverCare/admin/activity-details/**",
                                "/EverCare/admin/uploads/**",
                                "/EverCare/uploads/**"
                        )
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("lb://ACTIVITIES-SERVICE"))
                // ✅ No rewritePath — context-path /EverCare handles it
                .route("alerts-service-ws", r -> r
                        .path("/EverCare/ws-check", "/EverCare/ws-check/**")
                        // ✅ Remove rewritePath entirely — pass URL as-is including query params
                        .uri("lb:ws://ALERTS-SERVICE"))

                // ✅ No rewritePath — same reason
                .route("alerts-service", r -> r
                        .path("/EverCare/incidents/**", "/EverCare/alerts/**", "/EverCare/evicare/**")
                        .uri("lb://ALERTS-SERVICE"))
.route("alerts-service", r -> r
                        .path("/EverCare/incidents/**", "/EverCare/alerts/**")
                        .uri("lb://alerts-service"))
                .route("user-service", r -> r
                        .path("/EverCare/auth/**", "/EverCare/users/**", "/EverCare/test/**")
                        .uri("lb://User-service"))
                .route("appointment-service", r -> r
                        .path("/EverCare/appointments/**",
                                "/EverCare/availabilities/**",
                                "/EverCare/consultation-types/**",
                                "/EverCare/medicaments/**",
                                "/EverCare/prescriptions/**",
                                "/EverCare/api/clinical-measurements/**")
                        .uri("lb://APPOINTMENT-SERVICE"))
                .route("notification-service", r -> r
                        .path("/EverCare/api/notifications/**")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("lb://notification-service"))
                .route("communication-service", r -> r
                        .path("/api/calls/**",
                                "/api/conversations/**")
                        .uri("lb://COMMUNICATION-SERVICE"))
                .route("medical-record-service", r -> r
                        .path("/api/medical-records/**")
                        .uri("lb://MEDICAL-RECORD-SERVICE"))
                .route("dailyme-service", r -> r
                        .path("/api/daily-entries/**", "/api/dailyme-alerts/**", "/api/daily-tasks/**", "/api/journal/**", "/api/insights")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("lb://DAILYME-SERVICE"))

                // 1. Route pour le WebSocket (doit être définie avant les routes HTTP générales)
                .route("communication-websocket", r -> r
                        .path("/ws-chat/**")
                        .uri("lb://COMMUNICATION-SERVICE"))
                 .route("communication-service", r -> r
                                         .path("/communication-service/**")
                                         .filters(f -> f.rewritePath("/communication-service/(?<segment>.*)", "/${segment}"))
                                         .uri("lb://COMMUNICATION-SERVICE"))

                .route("face-service", r -> r
                        .path("/EverCare/face/**")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("http://localhost:8085"))
                .build();
    }





}
