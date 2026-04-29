package everCare.appointments.services;

import everCare.appointments.dtos.ClinicalMeasurementRequestDTO;
import everCare.appointments.dtos.ClinicalMeasurementResponseDTO;
import everCare.appointments.entities.ClinicalMeasurement;
import everCare.appointments.repositories.ClinicalMeasurementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClinicalMeasurementServiceImpl implements ClinicalMeasurementService {

    private final ClinicalMeasurementRepository repository;

    @Override
    @Transactional
    public ClinicalMeasurementResponseDTO save(ClinicalMeasurementRequestDTO request, String caregiverId) {
        ClinicalMeasurement measurement = ClinicalMeasurement.builder()
                .patientId(request.getPatientId())
                .appointmentId(request.getAppointmentId())
                .weight(request.getWeight())
                .kidneyTestResult(request.getKidneyTestResult())
                .severeLiverProblem(request.getSevereLiverProblem())
                .currentMedications(request.getCurrentMedications())
                .allergies(request.getAllergies())
                .measuredAt(LocalDateTime.now())
                .measuredBy(caregiverId)
                .build();

        ClinicalMeasurement saved = repository.save(measurement);
        return toResponseDTO(saved);
    }

    @Override
    public ClinicalMeasurementResponseDTO getByAppointmentId(String appointmentId) {
        return repository.findByAppointmentId(appointmentId)
                .map(this::toResponseDTO)
                .orElse(null);
    }

    @Override
    public List<ClinicalMeasurementResponseDTO> getByPatientId(String patientId) {
        return repository.findByPatientIdOrderByMeasuredAtDesc(patientId)
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ClinicalMeasurementResponseDTO getLatestForPatient(String patientId) {
        return repository.findTopByPatientIdOrderByMeasuredAtDesc(patientId)
                .map(this::toResponseDTO)
                .orElse(null);
    }

    private ClinicalMeasurementResponseDTO toResponseDTO(ClinicalMeasurement entity) {
        return ClinicalMeasurementResponseDTO.builder()
                .measurementId(entity.getMeasurementId())
                .patientId(entity.getPatientId())
                .appointmentId(entity.getAppointmentId())
                .weight(entity.getWeight())
                .kidneyTestResult(entity.getKidneyTestResult())
                .severeLiverProblem(entity.getSevereLiverProblem())
                .currentMedications(entity.getCurrentMedications())
                .allergies(entity.getAllergies())
                .measuredAt(entity.getMeasuredAt())
                .measuredBy(entity.getMeasuredBy())
                .build();
    }
}