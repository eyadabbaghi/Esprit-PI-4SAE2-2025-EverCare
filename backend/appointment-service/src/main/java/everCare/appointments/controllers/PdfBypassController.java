package everCare.appointments.controllers;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/prescriptions")
@Slf4j
public class PdfBypassController {

    @GetMapping(value = "/{id}/pdf-bypass", params = "download")
    public ResponseEntity<byte[]> downloadPdfBypass(@PathVariable String id, @RequestParam String download) {
        log.info("PDF BYPASS: Downloading PDF for prescription ID: {}", id);
        
        try {
            log.info("PDF BYPASS: Controller method reached successfully for ID: {}", id);
            
            // TEMPORARY BYPASS: Return simple test content instead of calling PDF service
            String testContent = "Test PDF content for prescription " + id + " (BYPASS CONTROLLER)";
            byte[] pdfBytes = testContent.getBytes();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "prescription-" + id + ".pdf");
            headers.setContentLength(pdfBytes.length);

            log.info("PDF BYPASS: Returning test PDF response for prescription ID: {}", id);
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
            
        } catch (Exception e) {
            log.error("PDF BYPASS: Error in PDF controller for ID {}: {}", id, e.getMessage(), e);
            throw e;
        }
    }
}
