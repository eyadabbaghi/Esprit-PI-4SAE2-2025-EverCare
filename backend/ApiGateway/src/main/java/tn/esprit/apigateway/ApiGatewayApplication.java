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
                // Activities
                .route("activities-service", r -> r
                        .path("/EverCare/activities/**",
                                "/EverCare/admin/activities/**",
                                "/EverCare/admin/activity-details/**",
                                "/EverCare/admin/uploads/**",
                                "/EverCare/uploads/**")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("lb://activities-service"))
                // Alerts WebSocket
                .route("alerts-service-ws", r -> r
                        .path("/EverCare/ws-check", "/EverCare/ws-check/**")
                        .uri("lb://alerts-service"))
                // Alerts REST
                .route("alerts-service", r -> r
                        .path("/EverCare/incidents/**", "/EverCare/alerts/**", "/EverCare/evicare/**")
                        .uri("lb://alerts-service"))
                // User service
                .route("user-service", r -> r
                        .path("/EverCare/auth/**", "/EverCare/users/**", "/EverCare/test/**", "/EverCare/internal/**")
                        .uri("lb://user-service"))
                // Appointment service
                .route("appointment-service", r -> r
                        .path("/EverCare/appointments/**",
                                "/EverCare/availabilities/**",
                                "/EverCare/consultation-types/**",
                                "/EverCare/medicaments/**",
                                "/EverCare/prescriptions/**",
                                "/EverCare/api/clinical-measurements/**")
                        .uri("lb://appointment-service"))
// Notification service
                .route("notification-service", r -> r
                        .path("/EverCare/api/notifications/**")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("lb://notification-service"))
                // Medical record service
                .route("medical-record-service", r -> r
                        .path("/api/medical-records/**")
                        .uri("lb://medical-record-service"))
                // Dailyme service
                .route("dailyme-service", r -> r
                        .path("/dailyme/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://dailyme-service"))
                // Tracking service
                .route("tracking-service", r -> r
                        .path("/tracking/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://tracking-service"))
                // Blog service
                // Communication service - REST API
                .route("communication-service", r -> r
                        .path("/EverCare/communication-service/**")
                        .filters(f -> f.rewritePath("/EverCare/communication-service/(?<segment>.*)", "/${segment}"))
                        .uri("lb://communication-service"))
// Communication service - WebSocket
                .route("communication-websocket", r -> r
                        .path("/ws-chat/**")
                        .uri("lb://communication-service"))
                .build();
    }
}