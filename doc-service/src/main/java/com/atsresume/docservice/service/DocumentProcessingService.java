package com.atsresume.docservice.service;

import com.atsresume.docservice.dto.SuggestedEdit;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
@Slf4j
public class DocumentProcessingService {

    public byte[] processDocument(byte[] originalDocument, List<Integer> acceptedEdits, 
                                List<SuggestedEdit> suggestedEdits, String jobDescription) {
        try {
            // Validate that we have a valid DOCX document
            if (originalDocument == null || originalDocument.length == 0) {
                throw new IllegalArgumentException("Document content is empty or null");
            }
            
            // Check if the document starts with the DOCX signature
            if (originalDocument.length < 4 || 
                originalDocument[0] != 0x50 || originalDocument[1] != 0x4B || 
                originalDocument[2] != 0x03 || originalDocument[3] != 0x04) {
                throw new IllegalArgumentException("Invalid DOCX file format. File must be a valid .docx document.");
            }
            
            // Load the original DOCX document
            XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(originalDocument));
            
            // Apply accepted edits to the document
            applyEditsToDocument(document, acceptedEdits, suggestedEdits);
            
            // Save the processed document
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.write(outputStream);
            document.close();
            
            return outputStream.toByteArray();
        } catch (IllegalArgumentException e) {
            log.error("Invalid document format: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Error processing document", e);
            throw new RuntimeException("Failed to process document: " + e.getMessage(), e);
        }
    }

    public byte[] exportToPDF(byte[] docxDocument) {
        try {
            // For now, create a simple PDF with placeholder content
            // In production, this would convert the DOCX to PDF while preserving formatting
            
            PDDocument pdfDocument = new PDDocument();
            PDPage page = new PDPage();
            pdfDocument.addPage(page);
            
            PDPageContentStream contentStream = new PDPageContentStream(pdfDocument, page);
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 16);
            contentStream.newLineAtOffset(100, 700);
            contentStream.showText("Optimized CV");
            contentStream.endText();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            contentStream.newLineAtOffset(100, 650);
            contentStream.showText("This is an optimized version of your CV");
            contentStream.endText();
            
            contentStream.close();
            
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            pdfDocument.save(outputStream);
            pdfDocument.close();
            
            return outputStream.toByteArray();
        } catch (IOException e) {
            log.error("Error exporting to PDF", e);
            throw new RuntimeException("Failed to export to PDF", e);
        }
    }

    private void applyEditsToDocument(XWPFDocument document, List<Integer> acceptedEdits, 
                                    List<SuggestedEdit> suggestedEdits) {
        try {
            // Apply accepted edits to the document
            for (Integer editIndex : acceptedEdits) {
                if (editIndex >= 0 && editIndex < suggestedEdits.size()) {
                    SuggestedEdit edit = suggestedEdits.get(editIndex);
                    applyEditToDocument(document, edit);
                }
            }
        } catch (Exception e) {
            log.error("Error applying edits to document", e);
            throw new RuntimeException("Failed to apply edits", e);
        }
    }

    private void applyEditToDocument(XWPFDocument document, SuggestedEdit edit) {
        // Prefer bullet-level editing if available
        String target = edit.getOriginalBullet() != null && !edit.getOriginalBullet().isEmpty()
            ? edit.getOriginalBullet() : edit.getOriginal();
        String replacement = edit.getImprovedBullet() != null && !edit.getImprovedBullet().isEmpty()
            ? edit.getImprovedBullet() : edit.getSuggested();

        if (target == null || replacement == null) return;

        for (XWPFParagraph paragraph : document.getParagraphs()) {
            // Use a cleaned-up version of the text for comparison
            String paragraphText = paragraph.getText().trim().replaceAll("\\s+", " ");
            String targetText = target.trim().replaceAll("\\s+", " ");

            if (paragraphText.equals(targetText)) {
                List<XWPFRun> runs = paragraph.getRuns();
                if (!runs.isEmpty()) {
                    // --- Most Conservative Approach: Only change the text ---
                    
                    // 1. Set the text of the first run to the full replacement.
                    //    The original formatting of this run will be preserved by POI.
                    runs.get(0).setText(replacement, 0);

                    // 2. Remove all other runs from this paragraph (if any).
                    //    This cleans up the rest of the original line.
                    for (int i = runs.size() - 1; i > 0; i--) {
                        paragraph.removeRun(i);
                    }
                }
                break; // Exit after finding and replacing the paragraph
            }
        }
    }

    public String extractTextFromDocument(byte[] documentBytes) {
        try {
            XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(documentBytes));
            StringBuilder text = new StringBuilder();
            
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                text.append(paragraph.getText()).append("\n");
            }
            
            document.close();
            return text.toString();
        } catch (Exception e) {
            log.error("Error extracting text from document", e);
            throw new RuntimeException("Failed to extract text", e);
        }
    }
} 