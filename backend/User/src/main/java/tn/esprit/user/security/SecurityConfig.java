package tn.esprit.user.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import tn.esprit.user.service.FaceLoginTokenService;

import javax.crypto.SecretKey;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final LocalUserJwtAuthenticationConverter jwtAuthenticationConverter;
    private final FaceLoginTokenService faceLoginTokenService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/auth/register",
                                "/auth/login",
                                "/auth/face-login",
                                "/users/by-email",
                                "/users/activity/**",
                                "/uploads/**",
                                "/users/{id}",
                                "/internal/**",
                                "/EverCare/actuator/health",
                                "/EverCare/actuator/health/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(jwtDecoder)
                                .jwtAuthenticationConverter(jwtAuthenticationConverter)
                        )
                );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri
    ) {
        JwtDecoder keycloakDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        SecretKey localSigningKey = faceLoginTokenService.getSigningKey();
        JwtDecoder localDecoder = NimbusJwtDecoder.withSecretKey(localSigningKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();

        return token -> decodeWithFallback(token, keycloakDecoder, localDecoder);
    }

    private Jwt decodeWithFallback(String token, JwtDecoder keycloakDecoder, JwtDecoder localDecoder) {
        try {
            return keycloakDecoder.decode(token);
        } catch (JwtException firstFailure) {
            return localDecoder.decode(token);
        }
    }
}
