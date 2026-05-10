package tn.esprit.user.security;

import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import tn.esprit.user.entity.User;
import tn.esprit.user.repository.UserRepository;

import java.util.Collections;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class LocalUserJwtAuthenticationConverter implements Converter<Jwt, UsernamePasswordAuthenticationToken> {

    private final UserRepository userRepository;

    @Override
    public UsernamePasswordAuthenticationToken convert(Jwt jwt) {
        User user = resolveUser(jwt)
                .orElseThrow(() -> new UsernameNotFoundException("Authenticated user not found"));

        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password("")
                .authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .build();

        return new UsernamePasswordAuthenticationToken(
                userDetails,
                jwt,
                userDetails.getAuthorities()
        );
    }

    private Optional<User> resolveUser(Jwt jwt) {
        String email = firstPresent(
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("preferred_username"),
                jwt.getClaimAsString("upn")
        );

        if (email != null) {
            Optional<User> byEmail = userRepository.findByEmailIgnoreCase(email);
            if (byEmail.isPresent()) {
                return byEmail;
            }
        }

        String keycloakId = firstPresent(jwt.getClaimAsString("keycloakId"), jwt.getSubject());
        if (keycloakId != null) {
            Optional<User> byKeycloakId = userRepository.findByKeycloakId(keycloakId);
            if (byKeycloakId.isPresent()) {
                return byKeycloakId;
            }
        }

        String userId = jwt.getSubject();
        return userId != null ? userRepository.findById(userId) : Optional.empty();
    }

    private String firstPresent(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
