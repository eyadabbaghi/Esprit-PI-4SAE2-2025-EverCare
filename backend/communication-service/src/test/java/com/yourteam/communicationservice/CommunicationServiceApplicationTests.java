package com.yourteam.communicationservice;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class CommunicationServiceApplicationTests {

	@Test
	void contextLoads() {
		CommunicationServiceApplication app = new CommunicationServiceApplication();
		assertNotNull(app);
	}

}