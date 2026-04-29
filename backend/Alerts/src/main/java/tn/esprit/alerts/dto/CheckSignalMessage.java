// src/main/java/tn/esprit/alerts/dto/CheckSignalMessage.java
package tn.esprit.alerts.dto;

import lombok.Data;

@Data
public class CheckSignalMessage {
    private String type;       // "offer" | "answer" | "ice-candidate" | "check-request" | "cancel" | "snapshot-request"
    private String from;       // userId of sender
    private String to;         // userId of target
    private Object payload;    // SDP or ICE candidate or null
}