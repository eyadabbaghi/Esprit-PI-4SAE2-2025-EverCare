package everCare.appointments.feign;

import everCare.appointments.dtos.CaregiverPatientsResponseDTO;
import everCare.appointments.dtos.PatientSimpleDTO;
import everCare.appointments.dtos.UserSimpleDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", configuration = everCare.appointments.config.FeignClientConfig.class)
public interface PatientFeignClient {

    @GetMapping("/EverCare/users/{id}")
    UserSimpleDTO getUserById(@PathVariable String id);

    @GetMapping("/EverCare/users/{id}/patients")
    CaregiverPatientsResponseDTO getPatientsByCaregiverId(@PathVariable String id);

}

