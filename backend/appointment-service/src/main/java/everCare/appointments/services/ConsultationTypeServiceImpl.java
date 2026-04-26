package everCare.appointments.services;

import everCare.appointments.entities.ConsultationType;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.repositories.ConsultationTypeRepository;
import everCare.appointments.services.ConsultationTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ConsultationTypeServiceImpl implements ConsultationTypeService {

    private final ConsultationTypeRepository consultationTypeRepository;

    // ========== CREATE ==========

    @Override
    public ConsultationType createConsultationType(ConsultationType consultationType) {
        // Generate ID if not present
        if (consultationType.getTypeId() == null) {
            consultationType.setTypeId(UUID.randomUUID().toString());
        }

        // Set default active to true
        consultationType.setActive(true);

        return consultationTypeRepository.save(consultationType);
    }

    @Override
    public ConsultationType createConsultationType(String name, String description, int defaultDurationMinutes,
                                                   boolean requiresCaregiver, String environmentPreset) {
        ConsultationType consultationType = ConsultationType.builder()
                .typeId(UUID.randomUUID().toString())
                .name(name)
                .description(description)
                .defaultDurationMinutes(defaultDurationMinutes)
                .requiresCaregiver(requiresCaregiver)
                .environmentPreset(environmentPreset)
                .active(true)
                .build();

        return consultationTypeRepository.save(consultationType);
    }

    // ========== READ ==========

    @Override
    public List<ConsultationType> getAllConsultationTypes() {
        return consultationTypeRepository.findAll();
    }

    @Override
    public ConsultationType getConsultationTypeById(String id) {
        return consultationTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation type not found with id: " + id));
    }

    @Override
    public ConsultationType getConsultationTypeByName(String name) {
        ConsultationType type = consultationTypeRepository.findByName(name);
        if (type == null) {
            throw new ResourceNotFoundException("Consultation type not found with name: " + name);
        }
        return type;
    }

    @Override
    public List<ConsultationType> getActiveConsultationTypes() {
        return consultationTypeRepository.findByActiveTrue();
    }

    @Override
    public List<ConsultationType> getTypesRequiringCaregiver() {
        return consultationTypeRepository.findByRequiresCaregiverTrue();
    }

    @Override
    public List<ConsultationType> searchTypes(String keyword) {
        return consultationTypeRepository.findByDescriptionContainingIgnoreCase(keyword);
    }

    @Override
    public List<ConsultationType> getTypesByMaxDuration(int minutes) {
        return consultationTypeRepository.findByDefaultDurationMinutesLessThanEqual(minutes);
    }

    // ========== UPDATE ==========

    @Override
    public ConsultationType updateConsultationType(String id, ConsultationType typeDetails) {
        ConsultationType existingType = getConsultationTypeById(id);

        if (typeDetails.getName() != null) {
            existingType.setName(typeDetails.getName());
        }

        if (typeDetails.getDescription() != null) {
            existingType.setDescription(typeDetails.getDescription());
        }


        if (typeDetails.getEnvironmentPreset() != null) {
            existingType.setEnvironmentPreset(typeDetails.getEnvironmentPreset());
        }

        existingType.setRequiresCaregiver(typeDetails.isRequiresCaregiver());
        existingType.setActive(typeDetails.isActive());

        return consultationTypeRepository.save(existingType);
    }

    @Override
    public ConsultationType activateType(String id) {
        ConsultationType type = getConsultationTypeById(id);
        type.setActive(true);
        return consultationTypeRepository.save(type);
    }

    @Override
    public ConsultationType deactivateType(String id) {
        ConsultationType type = getConsultationTypeById(id);
        type.setActive(false);
        return consultationTypeRepository.save(type);
    }

    @Override
    public ConsultationType updateDuration(String id, int defaultDurationMinutes) {
        ConsultationType type = getConsultationTypeById(id);
        type.setDefaultDurationMinutes(defaultDurationMinutes);
        return consultationTypeRepository.save(type);
    }

    @Override
    public ConsultationType updateEnvironmentPreset(String id, String environmentPreset) {
        ConsultationType type = getConsultationTypeById(id);
        type.setEnvironmentPreset(environmentPreset);
        return consultationTypeRepository.save(type);
    }

    // ========== DELETE ==========

    @Override
    public void deleteConsultationType(String id) {
        ConsultationType type = getConsultationTypeById(id);
        consultationTypeRepository.delete(type);
    }

    @Override
    public void deleteAllConsultationTypes() {
        consultationTypeRepository.deleteAll();
    }

    // ========== BUSINESS LOGIC ==========

    @Override
    public int calculateAlzheimerDuration(int defaultDuration) {
        return (int)(defaultDuration * 1.25); // +25%
    }

    @Override
    public boolean isTypeAvailableForPatient(String typeId, String patientStage) {
        ConsultationType type = getConsultationTypeById(typeId);

        // Logic based on patient stage
        if (patientStage.equals("AVANCE")) {
            // Advanced stage patients need caregiver
            return type.isRequiresCaregiver();
        }

        return type.isActive();
    }

    @Override
    public List<ConsultationType> getRecommendedTypesForPatient(String patientStage) {
        List<ConsultationType> allTypes = getAllConsultationTypes();

        if (patientStage.equals("LEGER")) {
            return allTypes.stream()
                    .filter(ConsultationType::isActive)
                    .toList();
        } else if (patientStage.equals("MODERE")) {
            return allTypes.stream()
                    .filter(t -> t.isActive() && t.getDefaultDurationMinutes() <= 40)
                    .toList();
        } else if (patientStage.equals("AVANCE")) {
            return allTypes.stream()
                    .filter(t -> t.isActive() && t.isRequiresCaregiver() && t.getDefaultDurationMinutes() <= 30)
                    .toList();
        }

        return List.of();
    }

    @Override
    public long countConsultationsByType(String typeId) {
        ConsultationType type = getConsultationTypeById(typeId);
        // This would need a custom query in AppointmentRepository
        // For now return 0
        return 0;
    }
}