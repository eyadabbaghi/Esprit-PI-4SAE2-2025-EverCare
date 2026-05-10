package tn.esprit.user.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DoctorEmailSchemaRepair implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DoctorEmailSchemaRepair.class);

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        repair();
    }

    private void repair() {
        String database = jdbcTemplate.queryForObject("SELECT DATABASE()", String.class);
        if (database == null || database.isBlank() || !tableExists(database, "patient_doctor_emails")) {
            return;
        }

        ColumnDefinition userIdColumn = columnDefinition(database, "users", "user_id");
        ColumnDefinition emailColumn = columnDefinition(database, "users", "email");
        if (userIdColumn == null || emailColumn == null) {
            return;
        }

        try {
            List<String> foreignKeys = foreignKeys(database, "patient_doctor_emails");
            for (String foreignKey : foreignKeys) {
                jdbcTemplate.execute("ALTER TABLE patient_doctor_emails DROP FOREIGN KEY `%s`".formatted(foreignKey));
            }

            jdbcTemplate.execute("""
                    ALTER TABLE patient_doctor_emails
                    CONVERT TO CHARACTER SET %s COLLATE %s
                    """.formatted(userIdColumn.characterSet(), userIdColumn.collation()));

            jdbcTemplate.execute("""
                    ALTER TABLE patient_doctor_emails
                    MODIFY patient_id %s CHARACTER SET %s COLLATE %s NOT NULL
                    """.formatted(userIdColumn.columnType(), userIdColumn.characterSet(), userIdColumn.collation()));

            jdbcTemplate.execute("""
                    ALTER TABLE patient_doctor_emails
                    MODIFY doctor_email %s CHARACTER SET %s COLLATE %s NULL
                    """.formatted(emailColumn.columnType(), emailColumn.characterSet(), emailColumn.collation()));

            if (!foreignKeys.isEmpty()) {
                jdbcTemplate.execute("""
                        ALTER TABLE patient_doctor_emails
                        ADD CONSTRAINT fk_patient_doctor_emails_patient
                        FOREIGN KEY (patient_id) REFERENCES users(user_id)
                        """);
            }
        } catch (Exception ex) {
            log.warn("Could not repair patient_doctor_emails collation automatically: {}", ex.getMessage());
        }
    }

    private boolean tableExists(String database, String tableName) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = ? AND table_name = ?
                """, Integer.class, database, tableName);
        return count != null && count > 0;
    }

    private List<String> foreignKeys(String database, String tableName) {
        return jdbcTemplate.queryForList("""
                SELECT CONSTRAINT_NAME
                FROM information_schema.key_column_usage
                WHERE table_schema = ?
                  AND table_name = ?
                  AND referenced_table_name IS NOT NULL
                """, String.class, database, tableName).stream()
                .map(this::safeSqlToken)
                .filter(token -> !token.isBlank())
                .toList();
    }

    private ColumnDefinition columnDefinition(String database, String tableName, String columnName) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
                FROM information_schema.columns
                WHERE table_schema = ? AND table_name = ? AND column_name = ?
                """, database, tableName, columnName);

        if (rows.isEmpty()) {
            return null;
        }

        Map<String, Object> row = rows.get(0);
        String columnType = safeSqlToken(row.get("COLUMN_TYPE"));
        String characterSet = safeSqlToken(row.get("CHARACTER_SET_NAME"));
        String collation = safeSqlToken(row.get("COLLATION_NAME"));

        if (columnType.isBlank() || characterSet.isBlank() || collation.isBlank()) {
            return null;
        }

        return new ColumnDefinition(columnType, characterSet, collation);
    }

    private String safeSqlToken(Object value) {
        String token = String.valueOf(value == null ? "" : value).trim();
        return token.matches("[A-Za-z0-9_()]+") ? token : "";
    }

    private record ColumnDefinition(String columnType, String characterSet, String collation) {
    }
}
