package tn.esprit.dailymeservice.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DayRateDTO {
    private String day;     // "Mon", "Tue"...
    private double rate;    // 0..100
}