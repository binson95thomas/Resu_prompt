package com.atsresume.docservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "OK");
        response.put("service", "ResuPrompt Document Service");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("port", 8080);
        
        return ResponseEntity.ok(response);
    }
} 