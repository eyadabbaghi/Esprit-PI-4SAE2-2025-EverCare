package everCare.appointments.dtos;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PdfEmailRequest {

    private String recipientEmail;
    private String subject;
    private String body;
    private String patientEmail;
    private String patientName;
    private String doctorName;
    private String prescriptionId;
    private String pdfBase64;

}

