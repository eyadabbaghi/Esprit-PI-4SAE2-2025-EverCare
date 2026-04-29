package tn.esprit.activities.dto;

import lombok.Data;
import java.util.List;

@Data
public class TranslatedActivityDTO {
    private String name;
    private String description;
    private List<String> instructions;
    private List<String> benefits;
    private List<String> precautions;
}