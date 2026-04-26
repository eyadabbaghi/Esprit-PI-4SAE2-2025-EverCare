package tn.esprit.user.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import tn.esprit.user.dto.ChangePasswordRequest;
import tn.esprit.user.dto.RegisterRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;

@Service
public class KeycloakAdminClient {

    @Value("${keycloak.auth-server-url}")
    private String authServerUrl;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.client-id}")
    private String clientId;

    @Value("${keycloak.client-secret}")
    private String clientSecret;

    private final RestTemplate restTemplate;

    // ✅ Single constructor — no Lombok, no conflict
    // Creates its own RestTemplate with logging interceptor
    public KeycloakAdminClient() {
        this.restTemplate = new RestTemplate();
        restTemplate.setInterceptors(Collections.singletonList(new ClientHttpRequestInterceptor() {
            @Override
            public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
                System.out.println("=== HTTP Request ===");
                System.out.println("Method: " + request.getMethod());
                System.out.println("URI: " + request.getURI());
                System.out.println("Headers: " + request.getHeaders());
                if (body.length > 0) {
                    System.out.println("Body: " + new String(body, StandardCharsets.UTF_8));
                }
                ClientHttpResponse response = execution.execute(request, body);
                System.out.println("Response status: " + response.getStatusCode());
                return response;
            }
        }));
    }

    private String getAdminAccessToken() {
        String tokenUrl = authServerUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("User-Agent", "curl/7.68.0");

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, request, Map.class);
        return (String) response.getBody().get("access_token");
    }

    public String createUser(RegisterRequest request) {
        String token = getAdminAccessToken();
        String url = authServerUrl + "/admin/realms/" + realm + "/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> userRep = Map.of(
                "username", request.getEmail(),
                "email", request.getEmail(),
                "firstName", request.getName().split(" ")[0],
                "lastName", request.getName().contains(" ") ? request.getName().substring(request.getName().indexOf(" ") + 1) : "",
                "enabled", true,
                "emailVerified", true,
                "credentials", new Object[]{
                        Map.of(
                                "type", "password",
                                "value", request.getPassword(),
                                "temporary", false
                        )
                }
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(userRep, headers);
        ResponseEntity<Void> response = restTemplate.postForEntity(url, entity, Void.class);

        if (response.getStatusCode() == HttpStatus.CREATED) {
            String location = response.getHeaders().getLocation().toString();
            return location.substring(location.lastIndexOf('/') + 1);
        }
        throw new RuntimeException("Failed to create user in Keycloak");
    }

    public void changePassword(String userId, ChangePasswordRequest request) {
        String token = getAdminAccessToken();
        String url = authServerUrl + "/admin/realms/" + realm + "/users/" + userId + "/reset-password";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> credential = Map.of(
                "type", "password",
                "value", request.getNewPassword(),
                "temporary", false
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(credential, headers);
        restTemplate.put(url, entity);
    }

    public void deleteUser(String userId) {
        String token = getAdminAccessToken();
        String url = authServerUrl + "/admin/realms/" + realm + "/users/" + userId;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        restTemplate.exchange(url, HttpMethod.DELETE, entity, Void.class);
    }
}