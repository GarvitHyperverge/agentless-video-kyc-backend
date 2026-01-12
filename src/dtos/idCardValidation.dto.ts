import { DocumentSide, DocumentType } from "../types";

// Request DTO 
export interface VerifyIdCardRequestDto {
  imageBuffer: Buffer;
  transactionId: string;
  countryId: string;
  documentId: DocumentType;
  expectedDocumentSide: DocumentSide;
}