package org.example.trackingservice;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class TrackingServiceApplicationTests {

	@Test
	void contextLoads() {
		TrackingServiceApplication app = new TrackingServiceApplication();
		assertNotNull(app);
	}

}