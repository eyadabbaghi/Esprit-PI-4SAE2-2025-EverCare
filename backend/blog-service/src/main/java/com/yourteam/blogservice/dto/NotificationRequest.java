package com.yourteam.blogservice.dto;


import lombok.Data;
import java.util.List;

@Data
public class NotificationRequest {
    private String activityId;
    private String action;
    private String details;
    private List<String> targetUserIds;
}