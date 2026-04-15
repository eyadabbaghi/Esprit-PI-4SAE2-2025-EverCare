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
                .route("dailyme-service", r -> r
                        .path("/dailyme/**")
                        .filters(f -> f.rewritePath("/dailyme/(?<segment>.*)", "/${segment}"))
                        .uri("lb://DAILYME-SERVICE"))
                .route("tracking-service", r -> r
                        .path("/tracking/**")
                        .filters(f -> f.rewritePath("/tracking/(?<segment>.*)", "/${segment}"))
                        .uri("lb://TRACKING-SERVICE"))
                .route("activities-public", r -> r
                        .path("/activities/**")
                        .uri("lb://ACTIVITIES-SERVICE"))
                .route("user-uploads", r -> r
                        .path("/EverCare/uploads/profile-pictures/**")
                        .uri("lb://USER-SERVICE"))
                .route("activities-service", r -> r
                        .path(
                                "/EverCare/activities/**",
                                "/EverCare/admin/activities/**",
                                "/EverCare/admin/activity-details/**",
                                "/EverCare/admin/uploads/**",
                                "/EverCare/uploads/activities/**"
                        )
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("lb://ACTIVITIES-SERVICE"))
                .route("alerts-service-ws", r -> r
                        .path("/EverCare/ws-check", "/EverCare/ws-check/**")
                        .uri("lb:ws://ALERTS-SERVICE"))
                .route("alerts-service", r -> r
                        .path("/EverCare/incidents/**", "/EverCare/alerts/**", "/EverCare/evicare/**")
                        .uri("lb://ALERTS-SERVICE"))
                .route("user-service", r -> r
                        .path("/EverCare/auth/**", "/EverCare/users/**", "/EverCare/admin/**", "/EverCare/test/**")
                        .uri("lb://USER-SERVICE"))
                .route("appointment-service", r -> r
                        .path("/api/appointments/**")
                        .uri("lb://APPOINTMENT-SERVICE"))
                .route("notification-service", r -> r
                        .path("/EverCare/api/notifications/**")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("lb://NOTIFICATION-SERVICE"))
                .route("face-service", r -> r
                        .path("/EverCare/face/**")
                        .filters(f -> f.rewritePath("/EverCare/(?<segment>.*)", "/${segment}"))
                        .uri("http://localhost:8085"))
                .build();
    }
}
