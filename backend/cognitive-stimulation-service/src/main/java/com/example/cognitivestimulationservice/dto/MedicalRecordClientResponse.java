package com.example.cognitivestimulationservice.dto;

import com.example.cognitivestimulationservice.entity.AlzheimerStage;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class MedicalRecordClientResponse {

    private UUID id;
    private String patientId;
    private AlzheimerStage alzheimerStage;
    private boolean active;
}
