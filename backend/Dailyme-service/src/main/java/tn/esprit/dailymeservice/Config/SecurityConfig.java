package tn.esprit.dailymeservice.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())

                // ❗ VERY IMPORTANT → disable redirect to login
                .formLogin(form -> form.disable())

                // ❗ VERY IMPORTANT → disable basic auth popup
                .httpBasic(basic -> basic.disable())

                // allow everything (for now)
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                );

        return http.build();
    }
}