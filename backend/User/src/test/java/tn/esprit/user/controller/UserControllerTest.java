package tn.esprit.user.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tn.esprit.user.dto.UserDto;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.UserRepository;
import tn.esprit.user.service.UserService;

import java.util.Set;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new UserController(userService, userRepository)).build();
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
}
