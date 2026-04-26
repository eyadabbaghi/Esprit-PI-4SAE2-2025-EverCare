package org.example.trackingservice.controllers;

import org.example.trackingservice.entities.SavedPlace;
import org.example.trackingservice.services.SavedPlaceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saved-places")
@CrossOrigin(origins = "*")
public class SavedPlaceController {

    private final SavedPlaceService service;

    public SavedPlaceController(SavedPlaceService service) {
        this.service = service;
    }

    @PostMapping
    public SavedPlace add(@RequestBody SavedPlace place) {
        return service.add(place);
    }

    @GetMapping("/patient/{patientId}")
    public List<SavedPlace> byPatient(@PathVariable String patientId) {
        return service.getByPatient(patientId);
    }

    @PutMapping("/{id}")
    public SavedPlace update(@PathVariable Long id, @RequestBody SavedPlace place) {
        return service.update(id, place);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}