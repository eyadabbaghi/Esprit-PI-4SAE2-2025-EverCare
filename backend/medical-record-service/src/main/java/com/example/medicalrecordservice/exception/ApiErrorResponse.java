package com.example.medicalrecordservice.exception;

import java.util.Map;

public record ApiErrorResponse(String message, Map<String, String> errors) {

    public static ApiErrorResponse withMessage(String message) {
        return new ApiErrorResponse(message, null);
    }
}
