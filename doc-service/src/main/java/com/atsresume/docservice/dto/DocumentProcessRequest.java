package com.atsresume.docservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentProcessRequest {
    private String originalFile; // Base64 encoded
    private List<Integer> acceptedEdits;
    private List<SuggestedEdit> suggestedEdits;
    private String jobDescription;
} 