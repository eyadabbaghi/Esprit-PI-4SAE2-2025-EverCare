package everCare.appointments.controllers;

import everCare.appointments.services.PrescriptionPdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/pdf-test")
@RequiredArgsConstructor
@Slf4j
public class PdfTestController {

    private final PrescriptionPdfService prescriptionPdfService;

    @GetMapping("/service/{id}")
    public ResponseEntity<String> testPdfService(@PathVariable String id) {
        log.info("Testing PDF service directly for prescription ID: {}", id);
        try {
            log.info("Calling prescriptionPdfService.generatePdf()...");
            byte[] pdfBytes = prescriptionPdfService.generatePdf(id);
            log.info("PDF service call successful, PDF size: {} bytes", pdfBytes.length);
            return ResponseEntity.ok("PDF service test successful for ID: " + id + ", Size: " + pdfBytes.length + " bytes");
        } catch (Exception e) {
            log.error("Error in PDF service test for ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body("PDF service error: " + e.getMessage());
        }
    }

    @GetMapping("/controller/{id}")
    public ResponseEntity<String> testControllerOnly(@PathVariable String id) {
        log.info("Testing controller method only for prescription ID: {}", id);
        try {
            log.info("Controller method reached successfully for ID: {}", id);
            return ResponseEntity.ok("Controller test successful for ID: " + id);
        } catch (Exception e) {
            log.error("Error in controller test for ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body("Controller error: " + e.getMessage());
        }
    }
}
