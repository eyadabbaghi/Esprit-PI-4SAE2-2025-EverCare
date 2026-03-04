package tn.esprit.dailymeservice.Controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.dailymeservice.Model.JournalEntry;
import tn.esprit.dailymeservice.Repository.JournalRepository;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/journal")

public class JournalController {

    private final JournalRepository repo;

    // physical folder (absolute)
    private final Path uploadDir = Paths.get(System.getProperty("user.dir"), "uploads", "journal");

    public JournalController(JournalRepository repo) {
        this.repo = repo;
    }

    // ✅ Save text only OR text + audio
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(
            @RequestParam("patientId") String patientId,
            @RequestParam(value = "text", required = false) String text,
            @RequestParam(value = "audio", required = false) MultipartFile audio
    ) {
        try {
            if (patientId == null || patientId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "patientId is required"));
            }

            JournalEntry entry = new JournalEntry();
            entry.setPatientId(patientId.trim());
            entry.setText(text);
            entry.setCreatedAt(LocalDateTime.now()); // ok

            Files.createDirectories(uploadDir);

            if (audio != null && !audio.isEmpty()) {
                String originalName = audio.getOriginalFilename();
                String ext = "webm";
                if (originalName != null && originalName.contains(".")) {
                    ext = originalName.substring(originalName.lastIndexOf('.') + 1);
                }

                String fileName = "journal_" + UUID.randomUUID() + "." + ext;
                Path target = uploadDir.resolve(fileName);

                Files.copy(audio.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

                // store relative path for frontend
                entry.setAudioPath("uploads/journal/" + fileName);
            }

            JournalEntry saved = repo.save(entry);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            // ✅ ALWAYS return JSON so Angular won't crash parsing
            return ResponseEntity.status(500).body(Map.of(
                    "message", "Server error saving journal entry",
                    "error", e.getMessage()
            ));
        }
    }

    // ✅ GET entries for patient (doctor view OR patient view)
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<JournalEntry>> getByPatient(@PathVariable String patientId) {
        List<JournalEntry> list = repo.findByPatientIdOrderByCreatedAtDesc(patientId);
        return ResponseEntity.ok(list);
    }

    // ✅ Delete entry
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        JournalEntry entry = repo.findById(id).orElse(null);
        if (entry == null) return ResponseEntity.notFound().build();

        try {
            if (entry.getAudioPath() != null && !entry.getAudioPath().isBlank()) {
                // convert saved relative path -> absolute physical path
                Path audioFile = Paths.get(System.getProperty("user.dir")).resolve(entry.getAudioPath());
                Files.deleteIfExists(audioFile);
            }
        } catch (Exception ignored) {}

        repo.delete(entry);
        return ResponseEntity.noContent().build();
    }
}