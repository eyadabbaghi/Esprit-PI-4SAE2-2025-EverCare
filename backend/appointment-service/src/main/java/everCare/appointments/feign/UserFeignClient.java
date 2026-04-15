/**
 * UserFeignClient - Feign client to fetch user data from User microservice.
 * 
 * CHANGED: Replaced local User entity and UserRepository with Feign client.
 * This eliminates data duplication and ensures consistency across microservices.
 * 
 * The User microservice (port 8096) is the single source of truth for user data.
 */
package everCare.appointments.feign;

import everCare.appointments.dtos.UserSimpleDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

/**
 * CHANGED: Added direct URL to bypass Eureka discovery for local testing.
 * Remove url and use name only when Eureka is properly configured.
 */
@FeignClient(
    name = "user-service",
    url = "http://localhost:8096",
    configuration = everCare.appointments.config.FeignClientConfig.class
)
public interface UserFeignClient {

    /**
     * Get user by ID
     */
    @GetMapping("/EverCare/users/{id}")
    UserSimpleDTO getUserById(@PathVariable("id") String id);

    /**
     * Get user by email
     */
    @GetMapping("/EverCare/users/by-email")
    UserSimpleDTO getUserByEmail(@RequestParam("email") String email);

    /**
     * Search users by role
     */
    @GetMapping("/EverCare/users/search")
    List<UserSimpleDTO> searchUsersByRole(@RequestParam("q") String term, @RequestParam("role") String role);

    /**
     * Get caregivers for a patient
     */
    @GetMapping("/users/{patientId}/caregivers")
    List<UserSimpleDTO> getCaregiversByPatientId(@PathVariable("patientId") String patientId);
}
