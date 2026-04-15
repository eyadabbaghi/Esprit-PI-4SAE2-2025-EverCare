package com.yourteam.blogservice.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class SummaryService {

    // Stop words anglais + français (courts)
    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
            "le", "la", "les", "un", "une", "des", "du", "de", "et", "à", "dans", "pour", "par",
            "avec", "sans", "sur", "chez", "entre", "the", "a", "an", "and", "of", "to", "in", "for",
            "with", "on", "at", "by", "is", "are", "was", "were", "be", "been", "being", "but", "or",
            "so", "as", "than", "that", "these", "those", "this", "those", "from", "has", "have", "had"
    ));

    public String generateSummary(String text) {
        log.info("=== Génération du résumé ===");
        String cleanText = text.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();

        // Découpage simple : après point, point d'exclamation, point d'interrogation, suivi d'espace
        String[] sentences = cleanText.split("(?<=[.!?])\\s+");
        log.info("Nombre de phrases : {}", sentences.length);

        if (sentences.length <= 2) {
            return cleanText;
        }

        // Fréquence des mots
        Map<String, Integer> wordFreq = new HashMap<>();
        for (String s : sentences) {
            String[] words = s.toLowerCase().split("\\W+");
            for (String w : words) {
                if (w.length() > 2 && !STOP_WORDS.contains(w)) {
                    wordFreq.put(w, wordFreq.getOrDefault(w, 0) + 1);
                }
            }
        }

        // Score des phrases
        double[] scores = new double[sentences.length];
        for (int i = 0; i < sentences.length; i++) {
            String[] words = sentences[i].toLowerCase().split("\\W+");
            double score = 0;
            for (String w : words) {
                score += wordFreq.getOrDefault(w, 0);
            }
            scores[i] = score;
        }

        // Prendre les indices des 3 meilleures phrases
        Integer[] indices = new Integer[sentences.length];
        for (int i = 0; i < indices.length; i++) indices[i] = i;
        Arrays.sort(indices, (a, b) -> Double.compare(scores[b], scores[a]));

        int nbSentences = Math.min(sentences.length, 3);
        List<Integer> bestIndices = new ArrayList<>();
        for (int i = 0; i < nbSentences; i++) {
            bestIndices.add(indices[i]);
        }
        Collections.sort(bestIndices);

        StringBuilder summary = new StringBuilder();
        for (int idx : bestIndices) {
            summary.append(sentences[idx]).append(" ");
        }

        String result = summary.toString().trim();
        log.info("Résumé : {}", result);
        return result;
    }
}