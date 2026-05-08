package everCare.appointments.config;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@Configuration
public class FeignClientConfig {

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            String targetUrl = requestTemplate.url();
            boolean internalUserLookup = targetUrl != null && targetUrl.contains("/internal/users");

            // Internal user lookups are service-to-service calls. Do not forward a
            // browser bearer token, because an expired token can make a permitAll
            // endpoint fail before authorization rules are reached.
            if (internalUserLookup) {
                requestTemplate.removeHeader("Authorization");
                requestTemplate.header("Content-Type", "application/json");
                return;
            }

            ServletRequestAttributes requestAttributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (requestAttributes != null) {
                HttpServletRequest request = requestAttributes.getRequest();
                String authorizationHeader = request.getHeader("Authorization");
                if (authorizationHeader != null) {
                    requestTemplate.header("Authorization", authorizationHeader);
                }
            }
            requestTemplate.header("Content-Type", "application/json");
        };
    }
}
