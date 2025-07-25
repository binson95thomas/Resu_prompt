package com.atsresume.docservice.controller;

import com.atsresume.docservice.dto.DocumentProcessRequest;
import com.atsresume.docservice.dto.DocumentProcessResponse;
import com.atsresume.docservice.dto.ExportRequest;
import com.atsresume.docservice.dto.ExportResponse;
import com.atsresume.docservice.service.DocumentProcessingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;

@RestController
@RequestMapping("/api/document")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DocumentController {

    private final DocumentProcessingService documentProcessingService;

    @PostMapping("/process")
    public ResponseEntity<DocumentProcessResponse> processDocument(@RequestBody DocumentProcessRequest request) {
        try {
            byte[] originalDocument = Base64.getDecoder().decode(request.getOriginalFile());
            byte[] processedDocument = documentProcessingService.processDocument(
                originalDocument,
                request.getAcceptedEdits(),
                request.getSuggestedEdits(),
                request.getJobDescription()
            );

            DocumentProcessResponse response = DocumentProcessResponse.builder()
                .document(Base64.getEncoder().encodeToString(processedDocument))
                .success(true)
                .message("Document processed successfully")
                .build();

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            DocumentProcessResponse response = DocumentProcessResponse.builder()
                .success(false)
                .message("Invalid document format: " + e.getMessage())
                .build();

            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("Error processing document", e);
            DocumentProcessResponse response = DocumentProcessResponse.builder()
                .success(false)
                .message("Failed to process document: " + e.getMessage())
                .build();

            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/export")
    public ResponseEntity<ExportResponse> exportDocument(@RequestBody ExportRequest request) {
        try {
            byte[] document = Base64.getDecoder().decode(request.getDocument());
            byte[] pdfDocument = documentProcessingService.exportToPDF(document);

            ExportResponse response = ExportResponse.builder()
                .pdf(Base64.getEncoder().encodeToString(pdfDocument))
                .success(true)
                .message("Document exported successfully")
                .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ExportResponse response = ExportResponse.builder()
                .success(false)
                .message("Failed to export document: " + e.getMessage())
                .build();

            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Document Service is running");
    }
} 