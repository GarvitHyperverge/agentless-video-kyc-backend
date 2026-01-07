import { DocumentSide, DocumentType } from "../types/idCardValidation.types";

// Request DTO 
export interface VerifyIdCardRequestDto {
  imagePath: string;
  transactionId: string;
  countryId: string;
  documentId: DocumentType;
  expectedDocumentSide: DocumentSide;
}