package tn.esprit.alerts.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tn.esprit.alerts.dto.IncidentInsightsRequest;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentAiInsightsService {

    private static final int MAX_INSIGHT_LENGTH = 4000;

    @Value("${groq.api.key:}")
    private String groqApiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqApiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    private final RestClient restClient = RestClient.builder()
            .requestFactory(createRequestFactory())
            .build();

    @PostConstruct
    void logGroqConfigurationStatus() {
        log.info("Groq incident insights configuration: key={}, model={}",
                StringUtils.hasText(groqApiKey) ? "configured" : "missing",
                groqModel);
    }

    public String generateInsights(IncidentInsightsRequest request) {
        if (!StringUtils.hasText(groqApiKey)) {
            throw new IllegalStateException("GROQ_API_KEY is not configured for AI incident insights.");
        }

        Map<String, Object> body = Map.of(
                "model", groqModel,
                "temperature", 0.25,
                "max_tokens", 520,
                "messages", List.of(
                        Map.of(
                                "role", "system",
                                "content", """
                                        You are EverCare's clinical safety assistant for caregivers, doctors, and patients.
                                        Analyze incident reports and provide practical safety guidance.
                                        Do not diagnose, do not invent medical facts, and do not replace emergency care.
                                        If the incident sounds urgent, clearly recommend emergency or clinician contact.
                                        Return only concise plain text using exactly these sections:
                                        Recommended severity: LOW, MEDIUM, HIGH, or CRITICAL with one short reason.

                                        What to do now: 2-3 concrete actions.

                                        Prevention: 2-3 concrete ways to reduce recurrence.

                                        Follow-up notes: what details should be documented or shared with the care team.
                                        """
                        ),
                        Map.of(
                                "role", "user",
                                "content", buildIncidentPrompt(request)
                        )
                )
        );

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(groqApiUrl)
                    .header("Authorization", "Bearer " + groqApiKey)
                    .header("Content-Type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            String content = extractContent(response);
            if (!StringUtils.hasText(content)) {
                throw new IllegalStateException("Groq returned an empty AI insight.");
            }

            return content.length() > MAX_INSIGHT_LENGTH
                    ? content.substring(0, MAX_INSIGHT_LENGTH)
                    : content;
        } catch (RestClientException ex) {
            log.warn("Groq incident insight request failed: {}", ex.getMessage());
            throw new IllegalStateException("AI insights are temporarily unavailable. Please try again.", ex);
        }
    }

    private String buildIncidentPrompt(IncidentInsightsRequest request) {
        return """
                Incident title: %s
                Incident type: %s
                Current selected severity: %s
                Location: %s
                Incident details: %s
                """.formatted(
                safe(request.getTitle()),
                safe(request.getType()),
                safe(request.getSeverity()),
                safe(request.getLocation()),
                safe(request.getDescription())
        );
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> response) {
        if (response == null) return null;
        Object choicesValue = response.get("choices");
        if (!(choicesValue instanceof List<?> choices) || choices.isEmpty()) return null;
        Object firstChoice = choices.get(0);
        if (!(firstChoice instanceof Map<?, ?> choice)) return null;
        Object messageValue = choice.get("message");
        if (!(messageValue instanceof Map<?, ?> message)) return null;
        Object content = message.get("content");
        return content == null ? null : String.valueOf(content).trim();
    }

    private String safe(String value) {
        return StringUtils.hasText(value) ? value.trim() : "Not provided";
    }

    private static SimpleClientHttpRequestFactory createRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(8));
        factory.setReadTimeout(Duration.ofSeconds(18));
        return factory;
    }
}
