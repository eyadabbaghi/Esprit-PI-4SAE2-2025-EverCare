package org.example.trackingservice.controllers;

import org.example.trackingservice.entities.LocationPing;
import org.example.trackingservice.services.LocationPingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tracking/location-pings")
@CrossOrigin(origins = "*")
public class LocationPingController {

    private final LocationPingService service;

    public LocationPingController(LocationPingService service) {
        this.service = service;
    }

    @PostMapping
    public LocationPing add(@RequestBody LocationPing ping) {
        return service.add(ping);
    }

    @GetMapping("/patient/{patientId}")
    public List<LocationPing> byPatient(@PathVariable String patientId) {
        return service.getByPatient(patientId);
    }

    @PutMapping("/{id}")
    public LocationPing update(@PathVariable Long id, @RequestBody LocationPing ping) {
        return service.update(id, ping);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}