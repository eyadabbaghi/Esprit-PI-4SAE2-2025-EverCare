package tn.esprit.alerts.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.security.Principal;
import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-check")
                .setAllowedOriginPatterns("*")
                .setHandshakeHandler(new DefaultHandshakeHandler() {
                    @Override
                    protected Principal determineUser(ServerHttpRequest request,
                                                      WebSocketHandler wsHandler,
                                                      Map<String, Object> attributes) {
                        // ✅ Read userId from query param
                        String userId = UriComponentsBuilder
                                .fromUri(request.getURI())
                                .build()
                                .getQueryParams()
                                .getFirst("userId");

                        if (userId != null && !userId.isBlank()) {
                            System.out.println("🔑 HandshakeHandler setting principal: " + userId);
                            return () -> userId;
                        }

                        // fallback
                        return () -> java.util.UUID.randomUUID().toString();
                    }
                });

        registry.addEndpoint("/ws-check")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    // ✅ Keep interceptor as backup but it's no longer the primary mechanism
    @Override
    public void configureClientInboundChannel(
            org.springframework.messaging.simp.config.ChannelRegistration registration) {
        registration.interceptors(new org.springframework.messaging.support.ChannelInterceptor() {
            @Override
            public org.springframework.messaging.Message<?> preSend(
                    org.springframework.messaging.Message<?> message,
                    org.springframework.messaging.MessageChannel channel) {
                org.springframework.messaging.simp.stomp.StompHeaderAccessor accessor =
                        org.springframework.messaging.support.MessageHeaderAccessor.getAccessor(
                                message,
                                org.springframework.messaging.simp.stomp.StompHeaderAccessor.class);
                if (accessor != null &&
                        org.springframework.messaging.simp.stomp.StompCommand.CONNECT
                                .equals(accessor.getCommand())) {
                    String userId = accessor.getLogin();
                    if (userId != null && !userId.isBlank()) {
                        accessor.setUser(() -> userId);
                    }
                }
                return message;
            }
        });
    }
}