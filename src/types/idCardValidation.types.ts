// Supported document types
export type DocumentType = 'pan' | 'aadhaar' | 'passport' | 'dl' | 'voter_id';

// Document side
export type DocumentSide = 'front' | 'back';

// Response Fields 
interface FieldExtracted {
  value: string;
  confidence: string;
}
  
interface AddressField extends FieldExtracted {
  street?: string;
  district?: string;
  zipCode?: string;
  province?: string;
  houseNumber?: string;
  additionalInfo?: string;
}

export interface FieldsExtracted {
  firstName?: FieldExtracted;
  middleName?: FieldExtracted;
  lastName?: FieldExtracted;
  fullName?: FieldExtracted;
  dateOfBirth?: FieldExtracted;
  dateOfIssue?: FieldExtracted;
  dateOfExpiry?: FieldExtracted;
  countryCode?: FieldExtracted;
  type?: FieldExtracted;
  gender?: FieldExtracted;
  address?: AddressField;
  idNumber?: FieldExtracted;
  placeOfBirth?: FieldExtracted;
  placeOfIssue?: FieldExtracted;
  yearOfBirth?: FieldExtracted;
  age?: FieldExtracted;
  fatherName?: FieldExtracted;
  motherName?: FieldExtracted;
  husbandName?: FieldExtracted;
  spouseName?: FieldExtracted;
  nationality?: FieldExtracted;
  mrzString?: FieldExtracted;
  homeTown?: FieldExtracted;
}

export interface PanCardExtractedData {
  fullName: string;
  dateOfBirth: string;
  fatherName: string;
  idNumber: string;
}