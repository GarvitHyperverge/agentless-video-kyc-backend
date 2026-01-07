/**
 * Response DTO from HyperVerge ID card extraction API
 */
export interface IdCardExtractionResponseDto {
  fullName: string;
  dateOfBirth: string;
  fatherName: string;
  idNumber: string;
}
