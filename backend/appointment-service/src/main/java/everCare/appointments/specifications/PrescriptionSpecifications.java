package everCare.appointments.specifications;

import everCare.appointments.entities.Prescription;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public final class PrescriptionSpecifications {

    private PrescriptionSpecifications() {
    }

    public static Specification<Prescription> withFilters(
            String patientId,
            String doctorId,
            String medicamentId,
            String status,
            Boolean renewable,
            Boolean expired,
            Boolean expiringSoon,
            LocalDate dateFrom,
            LocalDate dateTo,
            Boolean hasAppointment
    ) {
        LocalDate today = LocalDate.now();
        LocalDate expiringLimit = today.plusDays(7);

        return Specification.where(equalsNested("patient", "userId", patientId))
                .and(equalsNested("doctor", "userId", doctorId))
                .and(equalsNested("medicament", "medicamentId", medicamentId))
                .and(equalsField("statut", status))
                .and(equalsField("renouvelable", renewable))
                .and(dateOnOrAfter("datePrescription", dateFrom))
                .and(dateOnOrBefore("datePrescription", dateTo))
                .and(hasAppointment(hasAppointment))
                .and(isExpired(expired, today))
                .and(isExpiringSoon(expiringSoon, today, expiringLimit));
    }

    private static Specification<Prescription> equalsField(String field, Object value) {
        return (root, query, cb) -> value == null ? null : cb.equal(root.get(field), value);
    }

    private static Specification<Prescription> equalsNested(String relation, String field, Object value) {
        return (root, query, cb) -> value == null ? null : cb.equal(root.join(relation).get(field), value);
    }

    private static Specification<Prescription> dateOnOrAfter(String field, LocalDate value) {
        return (root, query, cb) -> value == null ? null : cb.greaterThanOrEqualTo(root.get(field), value);
    }

    private static Specification<Prescription> dateOnOrBefore(String field, LocalDate value) {
        return (root, query, cb) -> value == null ? null : cb.lessThanOrEqualTo(root.get(field), value);
    }

    private static Specification<Prescription> hasAppointment(Boolean hasAppointment) {
        return (root, query, cb) -> {
            if (hasAppointment == null) {
                return null;
            }

            return hasAppointment ? cb.isNotNull(root.get("appointment")) : cb.isNull(root.get("appointment"));
        };
    }

    private static Specification<Prescription> isExpired(Boolean expired, LocalDate today) {
        return (root, query, cb) -> {
            if (expired == null) {
                return null;
            }

            if (expired) {
                return cb.and(
                        cb.isNotNull(root.get("dateFin")),
                        cb.lessThan(root.get("dateFin"), today)
                );
            }

            return cb.or(cb.isNull(root.get("dateFin")), cb.greaterThanOrEqualTo(root.get("dateFin"), today));
        };
    }

    private static Specification<Prescription> isExpiringSoon(Boolean expiringSoon, LocalDate today, LocalDate expiringLimit) {
        return (root, query, cb) -> {
            if (expiringSoon == null) {
                return null;
            }

            if (expiringSoon) {
                return cb.and(
                        cb.equal(root.get("statut"), "ACTIVE"),
                        cb.isNotNull(root.get("dateFin")),
                        cb.between(root.get("dateFin"), today, expiringLimit)
                );
            }

            return cb.or(
                    cb.notEqual(root.get("statut"), "ACTIVE"),
                    cb.isNull(root.get("dateFin")),
                    cb.lessThan(root.get("dateFin"), today),
                    cb.greaterThan(root.get("dateFin"), expiringLimit)
            );
        };
    }
}
