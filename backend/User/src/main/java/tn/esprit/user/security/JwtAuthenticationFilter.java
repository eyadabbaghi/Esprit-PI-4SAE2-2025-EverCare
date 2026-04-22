package tn.esprit.user.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        System.out.println("=== JwtAuthenticationFilter ===");
        System.out.println("Request URI: " + request.getRequestURI());
        System.out.println("Method: " + request.getMethod());

        final String authHeader = request.getHeader("Authorization");
        System.out.println("Auth header: " + authHeader);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("No Bearer token, continuing filter chain without authentication");
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        System.out.println("JWT extracted: " + jwt);

        final String userEmail;
        try {
            userEmail = jwtUtil.extractUsername(jwt);
            System.out.println("Extracted email: " + userEmail);
        } catch (Exception e) {
            System.out.println("JWT parsing failed: " + e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            System.out.println("Loading user details for email: " + userEmail);
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
            System.out.println("User details loaded: " + userDetails.getUsername());

            if (jwtUtil.isTokenValid(jwt, userDetails)) {
                System.out.println("Token is valid, setting authentication");
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } else {
                System.out.println("Token is invalid (expired or wrong user)");
            }
        } else {
            System.out.println("userEmail is null or authentication already exists");
        }

        filterChain.doFilter(request, response);
    }
}