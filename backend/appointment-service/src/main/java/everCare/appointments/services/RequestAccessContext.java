package everCare.appointments.services;

import everCare.appointments.entities.UserRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

@Component
public class RequestAccessContext {

    public String requireUserId() {
        String userId = getHeader("X-User-Id");
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing requester identity.");
        }
        return userId;
    }

    public UserRole requireRole() {
        String role = getHeader("X-User-Role");
        if (role == null || role.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing requester role.");
        }

        try {
            return UserRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unsupported requester role.");
        }
    }

    private String getHeader(String name) {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return null;
        }
        return attributes.getRequest().getHeader(name);
    }
}
