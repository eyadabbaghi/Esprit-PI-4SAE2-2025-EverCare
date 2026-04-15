package tn.esprit.activities.service;

import lombok.extern.slf4j.Slf4j;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class SummarizationService {

    @Value("${huggingface.api.key}")
    private String apiKey;

    // Use a faster model (DistilBART) for quicker inference
    @Value("${huggingface.api.url:https://router.huggingface.co/hf-inference/models/sshleifer/distilbart-cnn-12-6}")
    private String apiUrl;

    private final HttpClient httpClient;

    public SummarizationService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))  // reduced from 30s
                .build();
    }

    public String summarize(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        // For very short text, fallback immediately (no API call)
        if (text.length() < 200) {
            return fallbackSummarize(text);
        }

        // Aggressive truncation to speed up processing
        String truncatedText = text.length() > 1000 ? text.substring(0, 1000) + "..." : text;

        // Only one attempt with short timeout; on failure, use fallback
        try {
            return attemptSummarize(truncatedText);
        } catch (Exception e) {
            log.warn("Summarization API failed, using fallback: {}", e.getMessage());
            return fallbackSummarize(truncatedText);
        }
    }

    private String attemptSummarize(String text) throws Exception {
        JSONObject payload = new JSONObject();
        payload.put("inputs", text);

        JSONObject parameters = new JSONObject();
        // Reduce max length for faster generation
        parameters.put("max_length", 80);
        parameters.put("min_length", 20);
        payload.put("parameters", parameters);

        // No need for wait_for_model if we accept occasional cold-start errors
        // (we'll fall back anyway)

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(20))  // shorter timeout
                .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                .build();

        // Use synchronous call with timeout (simpler, no async)
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("API error: " + response.statusCode());
        }

        String responseBody = response.body();
        log.debug("API response: {}", responseBody);

        if (responseBody.trim().startsWith("[")) {
            JSONArray jsonArray = new JSONArray(responseBody);
            return jsonArray.getJSONObject(0).getString("summary_text");
        } else if (responseBody.trim().startsWith("{")) {
            JSONObject json = new JSONObject(responseBody);
            if (json.has("error")) {
                throw new RuntimeException(json.getString("error"));
            }
            return json.getString("summary_text");
        } else {
            throw new RuntimeException("Unexpected response");
        }
    }

    private String fallbackSummarize(String text) {
        // Simple extractive summarizer: first two sentences
        String[] sentences = text.split("\\.\\s+");
        if (sentences.length <= 2) {
            return text;
        }
        return sentences[0] + ". " + sentences[1] + ".";
    }
}