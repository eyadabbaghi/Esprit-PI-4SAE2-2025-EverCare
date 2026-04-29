package tn.esprit.user.dto;

import lombok.Data;
import java.util.List;

@Data
public class FaceSetupRequest {
    private List<String> images; // 3-5 base64 images
}