package com.atsresume.docservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuggestedEdit {
    private String section;
    private String original;
    private String suggested;
    private String reason;
    private String originalBullet;
    private String improvedBullet;
} 