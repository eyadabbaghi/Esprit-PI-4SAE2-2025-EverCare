package tn.esprit.activities.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tn.esprit.activities.enums.AlzheimerStage;

import java.io.IOException;
import java.util.List;

@Converter
public class StageListConverter implements AttributeConverter<List<AlzheimerStage>, String> {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<AlzheimerStage> attribute) {
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error converting stage list to JSON", e);
        }
    }

    @Override
    public List<AlzheimerStage> convertToEntityAttribute(String dbData) {
        try {
            return objectMapper.readValue(dbData, new TypeReference<List<AlzheimerStage>>() {});
        } catch (IOException e) {
            throw new RuntimeException("Error converting JSON to stage list", e);
        }
    }
}