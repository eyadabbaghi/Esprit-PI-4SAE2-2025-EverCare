export interface MedicalDocument {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  createdAt: string;
}

export interface UploadMedicalDocumentResponse extends MedicalDocument {}
