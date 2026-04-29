package tn.esprit.user;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients
public class UserApplication {

	static {
		// Disable JMX completely before any Spring context is created
		System.setProperty("spring.jmx.enabled", "false");
		// Optional: prefer IPv4 if needed
		System.setProperty("java.net.preferIPv4Stack", "true");
	}

	public static void main(String[] args) {
		SpringApplication.run(UserApplication.class, args);
	}
}