package org.example.trackingservice.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "location_pings")
public class LocationPing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String patientId;

    private Double lat;
    private Double lng;

    private LocalDateTime timestamp;

    // ================= METIER FIELDS =================

    private Boolean insideSafeZone; // stored in DB

    private Double speed; // optional

    private Integer riskScore; // stored in DB

    // ================= ADVANCED FIELDS =================

    private String trend; // IMPROVING / WORSENING / STABLE

    @Column(length = 1000)
    private String riskFactorsRaw; // CSV storage

    public LocationPing() {
        this.timestamp = LocalDateTime.now();
    }

    // ================= GETTERS / SETTERS =================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public Boolean getInsideSafeZone() { return insideSafeZone; }
    public void setInsideSafeZone(Boolean insideSafeZone) { this.insideSafeZone = insideSafeZone; }

    public Double getSpeed() { return speed; }
    public void setSpeed(Double speed) { this.speed = speed; }

    public Integer getRiskScore() { return riskScore; }
    public void setRiskScore(Integer riskScore) { this.riskScore = riskScore; }

    public String getTrend() { return trend; }
    public void setTrend(String trend) { this.trend = trend; }

    public String getRiskFactorsRaw() { return riskFactorsRaw; }
    public void setRiskFactorsRaw(String riskFactorsRaw) { this.riskFactorsRaw = riskFactorsRaw; }

    @Transient
    public java.util.List<String> getRiskFactors() {
        if (riskFactorsRaw == null || riskFactorsRaw.isBlank()) return java.util.List.of();
        return java.util.Arrays.stream(riskFactorsRaw.split(";"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    public void setRiskFactors(java.util.List<String> factors) {
        if (factors == null || factors.isEmpty()) {
            this.riskFactorsRaw = "";
        } else {
            this.riskFactorsRaw = String.join("; ", factors);
        }
    }
}
