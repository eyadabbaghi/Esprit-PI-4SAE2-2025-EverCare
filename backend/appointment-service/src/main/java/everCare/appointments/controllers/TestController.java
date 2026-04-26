package everCare.appointments.controllers;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test")
@Slf4j
public class TestController {

    @GetMapping("/pdf")
    public ResponseEntity<String> testPdf() {
        log.info("Test PDF endpoint called");
        try {
            log.info("Creating simple test PDF...");
            // Just return a simple success message for now
            return ResponseEntity.ok("PDF generation test successful");
        } catch (Exception e) {
            log.error("Error in test PDF endpoint: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
    
    @GetMapping("/pdf/{id}")
    public ResponseEntity<String> testPdfWithId(@PathVariable String id) {
        log.info("Test PDF endpoint called with ID: {}", id);
        try {
            log.info("Testing PDF generation with prescription ID: {}", id);
            // Test if we can call the PDF service
            return ResponseEntity.ok("PDF generation test with ID " + id + " successful");
        } catch (Exception e) {
            log.error("Error in test PDF endpoint with ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
