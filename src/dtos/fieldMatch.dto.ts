/**
 * Response DTO from HyperVerge field match API
 */
export interface FieldMatchResponseDto {
  allMatched: boolean;
  results: {
    name: { value1: string; value2: string; match: boolean };
    dateOfBirth: { value1: string; value2: string; match: boolean };
    fatherName: { value1: string; value2: string; match: boolean };
    idNumber: { value1: string; value2: string; match: boolean };
  };
}
