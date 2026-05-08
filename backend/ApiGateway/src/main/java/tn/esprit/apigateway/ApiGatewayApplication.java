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

                // =========================
                // ACTIVITIES SERVICE
                // =========================
                .route("activities-service", r -> r
                        .path("/EverCare/activities/**",
                                "/EverCare/admin/activities/**",
                                "/EverCare/admin/activity-details/**",
                                "/EverCare/admin/uploads/**",
                                "/EverCare/uploads/**")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("lb://ACTIVITIES-SERVICE"))

                // =========================
                // ALERTS SERVICE
                // =========================
                // Alerts WebSocket
                .route("alerts-service-ws", r -> r
                        .path("/EverCare/ws-check", "/EverCare/ws-check/**")
                        .uri("lb:ws://ALERTS-SERVICE"))
                // Alerts REST
                .route("alerts-service", r -> r
                        .path("/EverCare/incidents/**", "/EverCare/alerts/**", "/EverCare/evicare/**")
                        .uri("lb://ALERTS-SERVICE"))

                // =========================
                // USER SERVICE
                // =========================
                .route("user-service", r -> r
                        .path(
                                "/EverCare/auth/**",
                                "/EverCare/users/**",
                                "/EverCare/admin/users",
                                "/EverCare/admin/users/**",
                                "/EverCare/test/**",
                                "/EverCare/assessment/**"
                        )
                        // ✅ NO rewritePath — context-path /EverCare on user-service handles it
                        .uri("lb://User-service"))

                // =========================
                // APPOINTMENT SERVICE
                // =========================
                .route("appointment-service", r -> r
                        .path("/EverCare/appointments/**",
                                "/EverCare/availabilities/**",
                                "/EverCare/consultation-types/**",
                                "/EverCare/medicaments/**",
                                "/EverCare/prescriptions/**",
                                "/EverCare/api/clinical-measurements/**")
                        .uri("lb://APPOINTMENT-SERVICE"))

                // =========================
                // BLOG SERVICE
                // =========================
                .route("blog-service", r -> r
                        .path("/EverCare/blog-service/**")
                        .filters(f -> f.rewritePath("/EverCare/blog-service/(?<segment>.*)", "/${segment}"))
                        .uri("lb://blog-service"))

                // =========================
                // NOTIFICATION SERVICE
                // =========================
                .route("notification-service", r -> r
                        .path("/EverCare/api/notifications/**")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("lb://NOTIFICATION-SERVICE"))

                // =========================
                // MEDICAL RECORD SERVICE
                // =========================
                .route("medical-record-service", r -> r
                        .path("/api/medical-records/**")
                        .uri("lb://MEDICAL-RECORD-SERVICE"))

                // =========================
                // DAILYME SERVICE
                // =========================
                .route("dailyme-service", r -> r
                        .path("/dailyme/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://localhost:8098"))

                // =========================
                // COMMUNICATION SERVICE
                // =========================
                .route("communication-websocket", r -> r
                        .path("/ws-chat/**")
                        .uri("lb://COMMUNICATION-SERVICE"))

                .route("communication-service", r -> r
                        .path("/EverCare/communication-service/**")
                        .filters(f -> f.rewritePath("/EverCare/communication-service/(?<segment>.*)", "/${segment}"))
                        .uri("lb://COMMUNICATION-SERVICE"))

                // =========================
                // FACE SERVICE (DIRECT)
                // =========================
                .route("face-service", r -> r
                        .path("/EverCare/face/**")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("http://localhost:8085"))

                .build();
    }
}
