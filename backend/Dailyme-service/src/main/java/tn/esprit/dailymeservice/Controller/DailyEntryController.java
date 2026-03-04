package tn.esprit.dailymeservice.Controller;

import tn.esprit.dailymeservice.Dto.DailyEntryDTO;
import tn.esprit.dailymeservice.Service.DailyEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.BindingResult;

import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/daily-entries")
@RequiredArgsConstructor

public class DailyEntryController {

    private final DailyEntryService dailyEntryService;

    @PostMapping
    public ResponseEntity<?> createEntry(@Valid @RequestBody DailyEntryDTO entryDTO, BindingResult result) {
        if (result.hasErrors()) {
            List<String> errors = result.getFieldErrors()
                    .stream()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .collect(Collectors.toList());
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            DailyEntryDTO created = dailyEntryService.createEntry(entryDTO);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }
    @GetMapping("/weekly/{patientId}")
    public List<DailyEntryDTO> getWeekly(@PathVariable String patientId) {
        return dailyEntryService.getWeeklyEntries(patientId);
    }

    // ✅ patientId must be String (UUID)
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPatientEntries(@PathVariable String patientId) {
        try {
            return ResponseEntity.ok(dailyEntryService.getEntriesByPatientId(patientId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching patient entries: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEntryById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(dailyEntryService.getEntryById(id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Not found: " + id);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEntry(
            @PathVariable Long id,
            @Valid @RequestBody DailyEntryDTO entryDTO,
            BindingResult result
    ) {
        if (result.hasErrors()) {
            List<String> errors = result.getFieldErrors()
                    .stream()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .collect(Collectors.toList());
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            DailyEntryDTO updated = dailyEntryService.updateEntry(id, entryDTO);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEntry(@PathVariable Long id) {
        try {
            dailyEntryService.deleteEntry(id);
            return ResponseEntity.ok("Deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Error deleting: " + e.getMessage());
        }
    }
}
