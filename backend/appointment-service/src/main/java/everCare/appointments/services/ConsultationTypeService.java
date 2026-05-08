package everCare.appointments.services;

import everCare.appointments.entities.ConsultationType;
import java.util.List;

public interface ConsultationTypeService {

    // ========== CREATE ==========
    ConsultationType createConsultationType(ConsultationType consultationType);
    ConsultationType createConsultationType(String name, String description, int defaultDurationMinutes,
                                            boolean requiresCaregiver, String environmentPreset);

    // ========== READ ==========
    List<ConsultationType> getAllConsultationTypes();
    ConsultationType getConsultationTypeById(String id);
    ConsultationType getConsultationTypeByName(String name);
    List<ConsultationType> getActiveConsultationTypes();
    List<ConsultationType> getTypesRequiringCaregiver();
    List<ConsultationType> searchTypes(String keyword);
    List<ConsultationType> getTypesByMaxDuration(int minutes);

    // ========== UPDATE ==========
    ConsultationType updateConsultationType(String id, ConsultationType typeDetails);
    ConsultationType activateType(String id);
    ConsultationType deactivateType(String id);
    ConsultationType updateDuration(String id, int defaultDurationMinutes);
    ConsultationType updateEnvironmentPreset(String id, String environmentPreset);

    // ========== DELETE ==========
    void deleteConsultationType(String id);
    void deleteAllConsultationTypes();

    // ========== BUSINESS LOGIC ==========
    int calculateAlzheimerDuration(int defaultDuration);
    boolean isTypeAvailableForPatient(String typeId, String patientStage);
    List<ConsultationType> getRecommendedTypesForPatient(String patientStage);
    long countConsultationsByType(String typeId);
}