package tn.esprit.dailymeservice.Controller;

import org.springframework.web.bind.annotation.*;
import tn.esprit.dailymeservice.Dto.PatientDashboardInsightsDTO;
import tn.esprit.dailymeservice.Service.PatientInsightsService;

@RestController
@RequestMapping("/api/insights")

public class PatientInsightsController {

    private final PatientInsightsService service;

    public PatientInsightsController(PatientInsightsService service) {
        this.service = service;
    }

    @GetMapping("/patient/{patientId}/dashboard")
    public PatientDashboardInsightsDTO dashboard(@PathVariable String patientId) {
        return service.buildPatientDashboard(patientId);
    }
}