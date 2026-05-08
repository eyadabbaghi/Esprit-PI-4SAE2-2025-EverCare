package everCare.appointments.specifications;

import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Prescription;
import org.springframework.data.jpa.domain.Specification;

public final class MedicamentSpecifications {

    private MedicamentSpecifications() {
    }

    public static Specification<Medicament> withFilters(
            String keyword,
            Boolean actif,
            String laboratoire,
            String forme,
            String dosage,
            Boolean used
    ) {
        return Specification.where(keyword(keyword))
                .and(equalsField("actif", actif))
                .and(containsField("laboratoire", laboratoire))
                .and(containsField("forme", forme))
                .and(containsField("dosage", dosage))
                .and(isUsed(used));
    }

    private static Specification<Medicament> keyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }

            String likeValue = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("nomCommercial")), likeValue),
                    cb.like(cb.lower(root.get("denominationCommuneInternationale")), likeValue),
                    cb.like(cb.lower(root.get("codeCIP")), likeValue)
            );
        };
    }

    private static Specification<Medicament> equalsField(String field, Object value) {
        return (root, query, cb) -> value == null ? null : cb.equal(root.get(field), value);
    }

    private static Specification<Medicament> containsField(String field, String value) {
        return (root, query, cb) -> {
            if (value == null || value.isBlank()) {
                return null;
            }

            return cb.like(cb.lower(root.get(field)), "%" + value.toLowerCase() + "%");
        };
    }

    private static Specification<Medicament> isUsed(Boolean used) {
        return (root, query, cb) -> {
            if (used == null) {
                return null;
            }

            var subquery = query.subquery(String.class);
            var prescription = subquery.from(Prescription.class);
            subquery.select(prescription.get("prescriptionId"))
                    .where(cb.equal(prescription.get("medicament"), root));

            return used ? cb.exists(subquery) : cb.not(cb.exists(subquery));
        };
    }
}
