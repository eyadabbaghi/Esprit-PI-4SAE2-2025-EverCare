package tn.esprit.activities.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.activities.dto.TranslatedActivityDTO;
import tn.esprit.activities.service.ActivityTranslationService;

import java.io.IOException;

@RestController
@RequestMapping("/activities")
@RequiredArgsConstructor
public class TranslationController {

    private final ActivityTranslationService translationService;

    @PostMapping("/translate/{id}")
    public ResponseEntity<?> translateActivity(
            @PathVariable String id,
            @RequestBody(required = false) TranslationRequest request) {
        String targetLang = (request != null && request.targetLang() != null) ? request.targetLang() : "fr";
        try {
            TranslatedActivityDTO translated = translationService.translateActivity(id, targetLang);
            return ResponseEntity.ok(translated);
        } catch (IOException e) {
            return ResponseEntity.status(503).body("Translation service unavailable");
        }
    }

    record TranslationRequest(String targetLang) {}
}