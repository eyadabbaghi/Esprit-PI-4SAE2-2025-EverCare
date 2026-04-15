package tn.esprit.activities.service;

import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
public class TranslationService {

    private static final String MY_MEMORY_URL = "https://api.mymemory.translated.net/get?q={text}&langpair=en|{target}";
    private static final String DEEPL_URL = "https://api-free.deepl.com/v2/translate?auth_key={key}&text={text}&target_lang={target}";

    @Value("${deepl.api.key:}")
    private String deeplApiKey;

    /**
     * Translate a single text string.
     */
    public String translate(String text, String targetLang) throws IOException {
        if (text == null || text.isBlank()) return text;

        // Try MyMemory first (free, no key)
        try {
            return translateWithMyMemory(text, targetLang);
        } catch (Exception e) {
            log.warn("MyMemory translation failed, falling back to DeepL", e);
            // Fallback to DeepL if key is configured
            if (deeplApiKey != null && !deeplApiKey.isEmpty()) {
                return translateWithDeepL(text, targetLang);
            } else {
                // If no DeepL key, return original with a marker
                return text + " [translation unavailable]";
            }
        }
    }

    private String translateWithMyMemory(String text, String targetLang) throws IOException {
        String encodedText = URLEncoder.encode(text, StandardCharsets.UTF_8);
        String urlStr = MY_MEMORY_URL
                .replace("{text}", encodedText)
                .replace("{target}", targetLang);

        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            JSONObject response = new JSONObject(br.readLine());
            return response.getJSONObject("responseData").getString("translatedText");
        }
    }

    private String translateWithDeepL(String text, String targetLang) throws IOException {
        String encodedText = URLEncoder.encode(text, StandardCharsets.UTF_8);
        String urlStr = DEEPL_URL
                .replace("{key}", deeplApiKey)
                .replace("{text}", encodedText)
                .replace("{target}", targetLang);

        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            JSONObject response = new JSONObject(br.readLine());
            return response.getJSONArray("translations")
                    .getJSONObject(0)
                    .getString("text");
        }
    }
}