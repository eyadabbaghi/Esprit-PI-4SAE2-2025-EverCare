package everCare.appointments.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import everCare.appointments.dtos.PatientSimpleDTO;
import everCare.appointments.dtos.UserSimpleDTO;
import everCare.appointments.entities.Medicament;
import everCare.appointments.entities.Prescription;
import everCare.appointments.feign.PatientFeignClient;
import everCare.appointments.repositories.PrescriptionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionPdfService {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientFeignClient patientFeignClient;
    private final ObjectMapper objectMapper;

    // ── Color palette ──────────────────────────────────────────────────────────
    private static final DeviceRgb TEAL       = new DeviceRgb(15, 110, 86);    // #0F6E56
    private static final DeviceRgb TEAL_LIGHT = new DeviceRgb(225, 245, 238);  // #E1F5EE
    private static final DeviceRgb GRAY_LIGHT = new DeviceRgb(241, 239, 232);  // #F1EFE8
    private static final DeviceRgb GRAY_MID   = new DeviceRgb(95, 94, 90);     // #5F5E5A
    private static final DeviceRgb WHITE      = new DeviceRgb(255, 255, 255);

    // ── Public API ─────────────────────────────────────────────────────────────
    public byte[] generatePdf(String prescriptionId) {
        log.info("Starting PDF generation for prescription ID: {}", prescriptionId);

        try {
            log.info("Fetching prescription from database...");
            Prescription prescription = prescriptionRepository.findById(prescriptionId)
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Prescription not found with ID: " + prescriptionId));
            log.info("Prescription found: {}", prescription.getPrescriptionId());
            
// Validate prescription data to prevent NullPointerException
            if (prescription.getPatient() == null) {
                throw new RuntimeException("Patient information is missing for prescription ID: " + prescriptionId);
            }
            if (prescription.getDoctor() == null) {
                throw new RuntimeException("Doctor information is missing for prescription ID: " + prescriptionId);
            }
            if (prescription.getPatient().getUserId() == null) {
                throw new RuntimeException("Patient user ID is missing for prescription ID: " + prescriptionId);
            }
            if (prescription.getDoctor().getUserId() == null) {
                throw new RuntimeException("Doctor user ID is missing for prescription ID: " + prescriptionId);
            }
            
            log.info("Fetching patient data for user ID: {}", prescription.getPatient().getUserId());
            UserSimpleDTO userPatient = patientFeignClient
                    .getUserById(prescription.getPatient().getUserId());
            log.info("Patient data fetched successfully: {}", userPatient.getName());
            
if (userPatient == null) {
                throw new RuntimeException("Failed to fetch patient data for user ID: " + prescription.getPatient().getUserId());
            }
            
            // Map UserSimpleDTO to PatientSimpleDTO
            log.info("Mapping user data to patient DTO...");
            PatientSimpleDTO patient = new PatientSimpleDTO();
            patient.setUserId(userPatient.getUserId());
            patient.setName(userPatient.getName());
            patient.setEmail(userPatient.getEmail());
            patient.setPhone(userPatient.getPhone());
            patient.setCreatedAt(userPatient.getCreatedAt());
            patient.setDateOfBirth(userPatient.getDateOfBirth());
            patient.setEmergencyContact(userPatient.getEmergencyContact());
            patient.setProfilePicture(userPatient.getProfilePicture());
            patient.setDoctorEmail(userPatient.getDoctorEmail());
            
            log.info("Fetching doctor data for user ID: {}", prescription.getDoctor().getUserId());
            UserSimpleDTO doctor = patientFeignClient
                    .getUserById(prescription.getDoctor().getUserId());
            log.info("Doctor data fetched successfully: {}", doctor.getName());
            
if (doctor == null) {
                throw new RuntimeException("Failed to fetch doctor data for user ID: " + prescription.getDoctor().getUserId());
            }

            log.info("Generating QR code...");
            byte[] qrCode = generateQrCode(prescription);
            log.info("QR code generated successfully");

            log.info("Creating PDF document...");
            ByteArrayOutputStream pdfStream = new ByteArrayOutputStream();
            PdfWriter   writer = new PdfWriter(pdfStream);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document    doc    = new Document(pdfDoc);
            doc.setMargins(20, 20, 20, 20);

            // 1. Top teal accent band
            addAccentBand(doc);

            // 2. Letterhead
            addLetterhead(doc);

            // 3. Horizontal rule  ← FIXED: uses SolidLine (ILineDrawer), not SolidBorder
            SolidLine solidLine = new SolidLine(0.5f);
            solidLine.setColor(GRAY_MID);
            doc.add(new LineSeparator(solidLine));

            // 4. Meta band
            addMetaBand(doc, prescriptionId, prescription);

            // 5. Patient + Doctor block
            addInfoBlock(doc, patient, doctor);

            doc.add(new Paragraph(" "));

            // 6. Diagnosis / Medications label bar
            addDiagnosisBar(doc);

            // 7. Medications table
            addMedicationsTable(doc, prescription);

            doc.add(new Paragraph(" "));

            // 8. Signature + QR
            addSignatureAndQr(doc, doctor, qrCode, prescriptionId);

            doc.add(new Paragraph(" "));

            // 9. Footer
            addFooter(doc, prescription);

            doc.close();

            log.info("PDF generation successful for prescription ID: {}", prescriptionId);
            return pdfStream.toByteArray();

        } catch (EntityNotFoundException e) {
            log.warn("Prescription not found: {}", prescriptionId);
            throw e;
        } catch (Exception e) {
            log.warn("Error generating PDF for prescription ID {}: {}", prescriptionId, e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    // ── Layout sections ────────────────────────────────────────────────────────

    private void addAccentBand(Document doc) {
        Table band = new Table(1).setWidth(560);
        Cell  cell = new Cell()
                .setHeight(7)
                .setBackgroundColor(TEAL)
                .setBorder(Border.NO_BORDER);
        band.addCell(cell);
        doc.add(band);
    }

    private void addLetterhead(Document doc) {
        Table table = new Table(2).setWidth(560);

        table.addCell(new Cell()
                .setBorder(Border.NO_BORDER)
                .add(new Paragraph("EverCare Health Center")
                        .setFontSize(24).setBold().setFontColor(TEAL))
                .add(new Paragraph("12 Avenue Habib Bourguiba, Tunis 1001")
                        .setFontSize(9).setFontColor(GRAY_MID))
                .add(new Paragraph("+216 71 000 111  |  www.evercare.tn")
                        .setFontSize(9).setFontColor(GRAY_MID)));

        table.addCell(new Cell()
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("\u211E")           // ℞ unicode
                        .setFontSize(32).setBold().setFontColor(TEAL)));

        doc.add(table);
    }

    private void addMetaBand(Document doc, String prescriptionId, Prescription prescription) {
        Table table = new Table(4).setWidth(560).setBackgroundColor(GRAY_LIGHT);

        addMetaCell(table, "Prescription ID", prescriptionId);
        addMetaCell(table, "Date Issued",     formatDate(prescription.getDatePrescription()));
        addMetaCell(table, "Valid Until",     formatDate(prescription.getDateFin()));
        addMetaCell(table, "Appointment ID",
                prescription.getAppointment() != null
                        ? prescription.getAppointment().getAppointmentId()
                        : "N/A");

        doc.add(table);
    }

    private void addInfoBlock(Document doc, PatientSimpleDTO patient, UserSimpleDTO doctor) {
        Table table = new Table(2).setWidth(560);

        // Patient column
        Cell patCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setBorderRight(new SolidBorder(GRAY_MID, 0.5f))
                .setPaddingRight(12)
                .add(new Paragraph("PATIENT").setFontSize(9).setBold().setFontColor(TEAL))
                .add(new Paragraph(patient.getName()).setFontSize(10).setBold())
                .add(new Paragraph(patient.getEmail()).setFontSize(9).setFontColor(GRAY_MID));

        if (patient.getPhone() != null) {
            patCell.add(new Paragraph(patient.getPhone()).setFontSize(9).setFontColor(GRAY_MID));
        }
        table.addCell(patCell);

        // Doctor column
        Cell docCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setPaddingLeft(12)
                .add(new Paragraph("PRESCRIBER").setFontSize(9).setBold().setFontColor(TEAL))
                .add(new Paragraph(doctor.getName()).setFontSize(10).setBold());

        if (doctor.getSpecialization() != null) {
            docCell.add(new Paragraph(doctor.getSpecialization())
                    .setFontSize(9).setFontColor(GRAY_MID));
        }
        if (doctor.getMedicalLicense() != null) {
            docCell.add(new Paragraph("License: " + doctor.getMedicalLicense())
                    .setFontSize(8).setFontColor(GRAY_MID));
        }
        table.addCell(docCell);

        doc.add(table);
    }

    private void addDiagnosisBar(Document doc) {
        Table table = new Table(1).setWidth(560);
        Cell  cell  = new Cell()
                .setBackgroundColor(TEAL_LIGHT)
                .setBorderLeft(new SolidBorder(TEAL, 3))
                .setBorderRight(Border.NO_BORDER)
                .setBorderTop(Border.NO_BORDER)
                .setBorderBottom(Border.NO_BORDER)
                .add(new Paragraph("PRESCRIBED MEDICATIONS")
                        .setFontSize(9).setBold().setFontColor(TEAL));
        table.addCell(cell);
        doc.add(table);
    }

    private void addMedicationsTable(Document doc, Prescription prescription) {
        Table table = new Table(6).setWidth(560);

        // Header
        for (String h : new String[]{"#", "Medication", "Form & Dosage",
                "Frequency / Duration", "Instructions", "Qty"}) {
            table.addCell(new Cell()
                    .setBackgroundColor(TEAL)
                    .setBorder(Border.NO_BORDER)
                    .setPadding(6)
                    .add(new Paragraph(h)
                            .setFontSize(8).setBold().setFontColor(WHITE)));
        }

        // Data row
        Medicament med = prescription.getMedicament();

        String formDosage = joinNonNull(" ", med.getForme(), med.getDosage());
        String freqDuration = joinNonNull(" to ",
                prescription.getDateDebut() != null ? "From " + formatDate(prescription.getDateDebut()) : null,
                prescription.getDateFin()   != null ? formatDate(prescription.getDateFin()) : null);

        addDataCell(table, "1");
        addDataCell(table, nvl(med.getNomCommercial()));
        addDataCell(table, formDosage);
        addDataCell(table, freqDuration);
        addDataCell(table, nvl(prescription.getPosologie()));
        addDataCell(table, nvl(prescription.getInstructions()));

        doc.add(table);
    }

    private void addSignatureAndQr(Document doc, UserSimpleDTO doctor,
                                   byte[] qrCode, String prescriptionId) {
        Table table = new Table(2).setWidth(560);

        // Signature cell
        table.addCell(new Cell()
                .setBorder(Border.NO_BORDER)
                .add(new Paragraph(" ").setHeight(30))   // vertical spacer
                .add(new Paragraph("_________________________")
                        .setFontSize(9).setFontColor(GRAY_MID))
                .add(new Paragraph(doctor.getName())
                        .setFontSize(9).setBold())
                .add(new Paragraph(doctor.getSpecialization() != null
                        ? doctor.getSpecialization() : "")
                        .setFontSize(8).setFontColor(GRAY_MID)));

        // QR cell  ← FIXED: ImageDataFactory.create(bytes) — no ImageType enum
        Cell qrCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT);
        Image qrImg = new Image(ImageDataFactory.create(qrCode))
                .scaleToFit(80, 80);
        qrCell.add(new Paragraph("Scan to verify")
                .setFontSize(8).setFontColor(GRAY_MID)
                .setTextAlignment(TextAlignment.RIGHT));
        qrCell.add(qrImg);
        qrCell.add(new Paragraph(prescriptionId)
                .setFontSize(7).setFontColor(GRAY_MID)
                .setTextAlignment(TextAlignment.RIGHT));
        table.addCell(qrCell);

        doc.add(table);
    }

    private void addFooter(Document doc, Prescription prescription) {
        doc.add(new Paragraph(
                "Valid until " + formatDate(prescription.getDateFin()) +
                        " \u2014 This document contains confidential medical information. " +
                        "Unauthorized distribution is strictly prohibited.")
                .setFontSize(7.5f)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(GRAY_MID));
    }

    // ── QR code ────────────────────────────────────────────────────────────────

    private byte[] generateQrCode(Prescription prescription) throws WriterException, IOException {
        log.info("Generating QR code for prescription ID: {}", prescription.getPrescriptionId());

        Map<String, Object> medObj = new HashMap<>();
        medObj.put("name",      prescription.getMedicament().getNomCommercial());
        medObj.put("dosage",    prescription.getMedicament().getDosage());
        medObj.put("frequency", prescription.getPosologie());
        medObj.put("duration",  formatDate(prescription.getDateFin()));

        Map<String, Object> payload = new HashMap<>();
        payload.put("resourceType", "MedicationRequest");
        payload.put("id",           prescription.getPrescriptionId());
        payload.put("patient",      prescription.getPatient().getUserId());
        payload.put("practitioner", prescription.getDoctor().getUserId());
        payload.put("date",         prescription.getDatePrescription().toString());
        payload.put("validUntil",   prescription.getDateFin().toString());
        payload.put("medications",  new Map[]{medObj});

        String json = objectMapper.writeValueAsString(payload);

        BitMatrix matrix = new MultiFormatWriter()
                .encode(json, BarcodeFormat.QR_CODE, 300, 300);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", out);

        log.info("QR code generated successfully for prescription ID: {}",
                prescription.getPrescriptionId());
        return out.toByteArray();
    }

    // ── Cell helpers ───────────────────────────────────────────────────────────

    private void addMetaCell(Table table, String label, String value) {
        table.addCell(new Cell()
                .setBorder(Border.NO_BORDER)
                .setPadding(6)
                .add(new Paragraph(label).setFontSize(8).setFontColor(GRAY_MID))
                .add(new Paragraph(value).setFontSize(9).setBold()));
    }

    private void addDataCell(Table table, String value) {
        table.addCell(new Cell()
                .setBackgroundColor(GRAY_LIGHT)
                .setBorder(Border.NO_BORDER)
                .setPadding(7)
                .add(new Paragraph(value).setFontSize(9).setFontColor(GRAY_MID)));
    }

    // ── String utilities ───────────────────────────────────────────────────────

    private String nvl(String value) {
        return value != null ? value : "";
    }

    private String joinNonNull(String separator, String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                if (sb.length() > 0) sb.append(separator);
                sb.append(part);
            }
        }
        return sb.toString();
    }

    private String formatDate(LocalDate date) {
        if (date == null) return "N/A";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }
}
