package org.example.trackingservice;

import org.example.trackingservice.entities.SavedPlace;
import org.example.trackingservice.repositories.SavedPlaceRepository;
import org.example.trackingservice.services.PatientValidationService;
import org.example.trackingservice.services.SavedPlaceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SavedPlaceServiceTest {

    @Mock
    private SavedPlaceRepository repo;

    @Mock
    private PatientValidationService patientValidationService;

    @InjectMocks
    private SavedPlaceService service;

    @Test
    void addShouldValidatePatientAndApplyDefaultRadius() {

        SavedPlace place = new SavedPlace();
        place.setPatientId("P1");
        place.setLabel("Home");
        place.setLat(36.8);
        place.setLng(10.1);
        place.setRadius(null);

        when(repo.save(place)).thenReturn(place);

        SavedPlace saved = service.add(place);

        verify(patientValidationService).validatePatientExists("P1");
        assertEquals(350.0, place.getRadius());
        assertSame(place, saved);
    }
}
