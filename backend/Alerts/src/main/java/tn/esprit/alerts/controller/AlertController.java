package tn.esprit.alerts.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.alerts.client.NotificationClient;
import tn.esprit.alerts.dto.*;
import tn.esprit.alerts.service.AlertService;
import tn.esprit.alerts.service.SmsService;
import java.util.List;

@RestController
@RequestMapping("/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;
    private final SmsService smsService;
    private final NotificationClient notifClient;
    @PostMapping
    public ResponseEntity<AlertResponse> createAlert(@Valid @RequestBody AlertRequest request) {
        AlertResponse response = alertService.createAlert(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AlertResponse> getAlert(@PathVariable String id) {
        AlertResponse response = alertService.getAlert(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/by-incident/{incidentId}")
    public ResponseEntity<List<AlertResponse>> getAlertsByIncident(@PathVariable String incidentId) {
        List<AlertResponse> responses = alertService.getAlertsByIncident(incidentId);
        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/{id}/acknowledge")
    public ResponseEntity<AlertResponse> acknowledgeAlert(@PathVariable String id) {
        AlertResponse response = alertService.acknowledgeAlert(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<AlertResponse> resolveAlert(@PathVariable String id) {
        AlertResponse response = alertService.resolveAlert(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAlert(@PathVariable String id) {
        alertService.deleteAlert(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<AlertResponse>> getAllAlerts() {
        List<AlertResponse> responses = alertService.getAllAlerts();
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AlertResponse> updateAlert(@PathVariable String id, @Valid @RequestBody AlertRequest request) {
        AlertResponse response = alertService.updateAlert(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/emergency-sms")
    public ResponseEntity<Void> sendEmergencySms(@RequestBody SmsRequest request) {
        String body = "🚨 EMERGENCY: " + request.getPatientName() +
                " did not confirm alert \"" + request.getAlertLabel() + "\"" +
                " for incident: " + request.getIncidentTitle() +
                ". Please check on them immediately.";
        smsService.sendSms(request.getCaregiverPhone(), body);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sos-call")
    public ResponseEntity<Void> triggerSosCall(@RequestBody SosRequest request) {
        smsService.makeCall(request.getCaregiverPhone(), request.getPatientName());
        return ResponseEntity.ok().build();
    }


    @PostMapping("/snapshot-notify")
    public ResponseEntity<Void> notifySnapshot(@RequestBody SnapshotNotifyRequest request) {
        EviCareNotificationRequest notif = new EviCareNotificationRequest();
        notif.setActivityId(request.getCaregiverEmail()); // target identifier
        notif.setAction("SNAPSHOT_ALERT");
        notif.setDetails("📸 Patient " + request.getPatientName() + " did not respond to the check. A snapshot was captured. Please check immediately.");
        notifClient.send(notif);
        return ResponseEntity.ok().build();
    }
}