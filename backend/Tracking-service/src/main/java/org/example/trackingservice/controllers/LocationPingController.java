package org.example.trackingservice.controllers;

import org.example.trackingservice.entities.LocationPing;
import org.example.trackingservice.services.LocationPingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/location-pings")

public class LocationPingController {

    private final LocationPingService service;

    public LocationPingController(LocationPingService service) {
        this.service = service;
    }

    // ================= CREATE =================
    @PostMapping
    public LocationPing add(@RequestBody LocationPing ping) {
        return service.add(ping); // 🔥 includes métier logic inside service
    }

    // ================= GET HISTORY =================
    @GetMapping("/patient/{patientId}")
    public List<LocationPing> byPatient(@PathVariable String patientId) {
        return service.getByPatient(patientId);
    }

    // ================= GET LATEST STATUS (🔥 IMPORTANT) =================
    @GetMapping("/status/{patientId}")
    public LocationPing getLatestStatus(@PathVariable String patientId) {
        return service.getLatest(patientId);
    }
    // ================= GET ALL (🔥 REQUIRED FOR DASHBOARD) =================
    @GetMapping
    public List<LocationPing> getAll() {
        return service.getAll();
    }
    // ================= HIGH RISK (🔥 METIER) =================
    @GetMapping("/high-risk")
    public List<LocationPing> getHighRisk() {
        return service.getHighRiskPatients();
    }
    @GetMapping("/latest-all")
    public List<LocationPing> getLatestPerPatient() {
        return service.getLatestPerPatient();
    }
    // ================= UNSAFE (🔥 METIER) =================
    @GetMapping("/unsafe")
    public List<LocationPing> getUnsafe() {
        return service.getUnsafePatients();
    }

    // ================= INACTIVE (🔥 ADVANCED) =================
    @GetMapping("/inactive")
    public List<LocationPing> getInactive() {
        return service.getInactivePatients();
    }

    // ================= UPDATE =================
    @PutMapping("/{id}")
    public LocationPing update(@PathVariable Long id, @RequestBody LocationPing ping) {
        return service.update(id, ping);
    }

    // ================= DELETE =================
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}