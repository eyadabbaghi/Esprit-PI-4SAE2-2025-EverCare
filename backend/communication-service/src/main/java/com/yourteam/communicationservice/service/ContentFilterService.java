package com.yourteam.communicationservice.service;

import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class ContentFilterService {

    // Liste centralisée
    private final List<String> badWords = Arrays.asList(
            "merde", "connard", "salope", "encule", "batard", "pute", "bordel",
            "abruti", "debile", "nègre", "bougnoule", "pede", "raciste", "nazi",
             "crypto"
    );

    public List<String> getForbiddenWords() {
        return badWords;
    }

    public boolean isContentInvalid(String content) {
        if (content == null || content.isBlank()) return false;
        String lowerContent = content.toLowerCase();

        // On vérifie si n'importe quel mot interdit est CONTENU dans le message
        return badWords.stream().anyMatch(word ->
                lowerContent.contains(word.toLowerCase())
        );
    }
}