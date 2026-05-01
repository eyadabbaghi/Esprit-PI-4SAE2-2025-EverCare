package com.example.cognitivestimulationservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class CognitiveStimulationServiceApplicationTests {

	@Test
	void contextLoads() {
		CognitiveStimulationServiceApplication app = new CognitiveStimulationServiceApplication();
		assertNotNull(app);
	}

}