import { DocumentSide, DocumentType, FieldsExtracted } from "../types/idCardValidation.types";

// Request DTO 
export interface VerifyIdCardRequestDto {
  imagePath: string;
  transactionId: string;
  countryId: string;
  documentId: DocumentType;
  expectedDocumentSide: DocumentSide;
}

// Response DTO
export interface HypervergeSuccessResponse {
  status: 'success';
  statusCode: string;
  result: {
    details: Array<{
      idType: string;
      fieldsExtracted: FieldsExtracted;
    }>;
    summary: {
      action: 'Pass' | 'Fail' | 'Manual_Review';
      details: string[];
    };
  };
  metaData: {
    requestId: string;
    transactionId: string;
  };
}

export interface HypervergeFailureResponse {
  status: 'failure';
  statusCode: string;
  metadata: {
    requestId: string;
    transactionId: string;
  };
  result: {
    error: string;
  };
}

export type HypervergeResponse = HypervergeSuccessResponse | HypervergeFailureResponse;