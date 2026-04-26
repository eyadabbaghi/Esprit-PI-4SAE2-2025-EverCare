package tn.esprit.user.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tn.esprit.user.entity.User;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class FaceLoginTokenService {

    private final SecretKey signingKey;
    private final long expirationSeconds;

    public FaceLoginTokenService(
            @Value("${face-login.jwt.secret:ZXZlcmNhcmUtZmFjZS1sb2dpbi1sb2NhbC1zaWduaW5nLWtleS1jaGFuZ2UtbWUtc2FmZWx5LTEyMzQ1Njc4OTA=}") String secret,
            @Value("${face-login.jwt.expiration-seconds:3600}") long expirationSeconds
    ) {
        this.signingKey = buildSigningKey(secret);
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(expirationSeconds);

        return Jwts.builder()
                .setIssuer("evercare-face-login")
                .setSubject(user.getUserId())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiresAt))
                .claim("email", user.getEmail())
                .claim("preferred_username", user.getEmail())
                .claim("role", user.getRole() != null ? user.getRole().name() : null)
                .claim("keycloakId", user.getKeycloakId())
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public SecretKey getSigningKey() {
        return signingKey;
    }

    private SecretKey buildSigningKey(String secret) {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (IllegalArgumentException ignored) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}