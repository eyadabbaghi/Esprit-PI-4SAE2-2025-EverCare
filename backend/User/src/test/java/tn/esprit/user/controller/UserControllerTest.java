package tn.esprit.user.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tn.esprit.user.dto.UpdateUserRequest;
import tn.esprit.user.dto.UserDto;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.UserRepository;
import tn.esprit.user.service.UserService;

import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    private UserController userController;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        userController = new UserController(userService, userRepository);
        mockMvc = MockMvcBuilders.standaloneSetup(userController).build();
    }

    @Test
    void getUserByEmailReturnsDto() throws Exception {
        User user = User.builder()
                .userId("user-1")
                .keycloakId("kc-1")
                .name("Jane Doe")
                .email("jane@example.com")
                .role(UserRole.PATIENT)
                .caregivers(Set.of())
                .patients(Set.of())
                .build();

        when(userService.findByEmail("jane@example.com")).thenReturn(user);

        mockMvc.perform(get("/users/by-email").param("email", "jane@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("user-1"))
                .andExpect(jsonPath("$.email").value("jane@example.com"))
                .andExpect(jsonPath("$.keycloakId").value("kc-1"));
    }

    @Test
    void getUserByEmailHandlesMissingRelationshipSets() throws Exception {
        User user = User.builder()
                .userId("user-2")
                .keycloakId("kc-2")
                .name("John Doe")
                .email("john@example.com")
                .role(UserRole.PATIENT)
                .build();

        when(userService.findByEmail("john@example.com")).thenReturn(user);

        mockMvc.perform(get("/users/by-email").param("email", "john@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("user-2"))
                .andExpect(jsonPath("$.caregiverEmails").isArray());
    }

    @Test
    void getUserByIdReturnsDto() throws Exception {
        UserDto userDto = new UserDto();
        userDto.setUserId("user-1");
        userDto.setName("Jane Doe");
        userDto.setEmail("jane@example.com");

        when(userService.getUserDtoById("user-1")).thenReturn(userDto);

        mockMvc.perform(get("/users/user-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("user-1"))
                .andExpect(jsonPath("$.name").value("Jane Doe"))
                .andExpect(jsonPath("$.email").value("jane@example.com"));
    }

    @Test
    void updateProfileReturnsBadRequestForBusinessValidationErrors() throws Exception {
        UserDetails principal = org.springframework.security.core.userdetails.User.withUsername("patient@example.com")
                .password("x")
                .roles("USER")
                .build();

        when(userService.updateUser(eq("patient@example.com"), any()))
                .thenThrow(new RuntimeException("Connected email must belong to a caregiver"));

        ResponseEntity<?> response = userController.updateProfile(new UpdateUserRequest(), principal);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Connected email must belong to a caregiver", ((java.util.Map<?, ?>) response.getBody()).get("message"));
    }
}
