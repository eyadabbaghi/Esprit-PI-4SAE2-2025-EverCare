package tn.esprit.dailymeservice.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TypeCountDTO {
    private String type;
    private long count;
}