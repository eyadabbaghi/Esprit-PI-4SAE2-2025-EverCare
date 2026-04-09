package com.example.cognitivestimulationservice.controller;

import com.example.cognitivestimulationservice.dto.CognitiveGameRequest;
import com.example.cognitivestimulationservice.dto.CognitiveGameResponse;
import com.example.cognitivestimulationservice.service.CognitiveGameService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cognitive-games")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Validated
public class CognitiveGameController {

    private final CognitiveGameService cognitiveGameService;

    @PostMapping
    public ResponseEntity<CognitiveGameResponse> create(@Valid @RequestBody CognitiveGameRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cognitiveGameService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<CognitiveGameResponse>> list(@RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(cognitiveGameService.list(active));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CognitiveGameResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(cognitiveGameService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CognitiveGameResponse> update(@PathVariable UUID id, @Valid @RequestBody CognitiveGameRequest request) {
        return ResponseEntity.ok(cognitiveGameService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> archive(@PathVariable UUID id) {
        cognitiveGameService.archive(id);
        return ResponseEntity.noContent().build();
    }
}
