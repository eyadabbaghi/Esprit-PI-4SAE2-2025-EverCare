package org.example.trackingservice.controllers;

import org.example.trackingservice.services.LocationPingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/tracking")
public class TrackingController {

    private final LocationPingService locationPingService;

    public TrackingController(LocationPingService locationPingService) {
        this.locationPingService = locationPingService;
    }

    @GetMapping("/clusters/{patientId}")
    public List<ClusterPointResponse> getClusters(@PathVariable String patientId) {

        List<double[]> clusters = locationPingService.getClusters(patientId);
        List<ClusterPointResponse> response = new ArrayList<>();

        for (int i = 0; i < clusters.size(); i++) {
            double[] cluster = clusters.get(i);
            response.add(new ClusterPointResponse(cluster[0], cluster[1]));
        }

        return response;
    }

    @GetMapping("/danger-duration/{patientId}")
    public DangerDurationResponse getDangerDuration(@PathVariable String patientId) {
        long minutes = locationPingService.getDangerDurationMinutes(patientId);
        String level = locationPingService.getDangerLevel(minutes);
        return new DangerDurationResponse(minutes, level);
    }

    public static class ClusterPointResponse {
        private final double lat;
        private final double lng;

        public ClusterPointResponse(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }

        public double getLat() {
            return lat;
        }

        public double getLng() {
            return lng;
        }
    }

    public static class DangerDurationResponse {
        private final long minutes;
        private final String level;

        public DangerDurationResponse(long minutes, String level) {
            this.minutes = minutes;
            this.level = level;
        }

        public long getMinutes() {
            return minutes;
        }

        public String getLevel() {
            return level;
        }
    }
}
