package tn.esprit.apigateway.config;

 // Ajuste le package selon ton projet

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();

        // Autorise ton application Angular
        corsConfig.setAllowedOrigins(Arrays.asList("http://localhost:4200"));

        // Définit la durée de validité du cache CORS (1 heure)
        corsConfig.setMaxAge(3600L);

        // Autorise les méthodes HTTP nécessaires pour le chat
        corsConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // Autorise tous les headers (essentiel pour l'auth et le Content-Type)
        corsConfig.setAllowedHeaders(Arrays.asList("*"));

        // Important pour que le navigateur accepte la réponse
        corsConfig.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsWebFilter(source);
    }
}