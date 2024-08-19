export interface SpecFileRecord {
  specFileName: string;
  datetime: string;
  totalDuration: number; // New field to store total duration of the spec file
  tests: { 
    title: string; 
    status: string; 
    duration: number; 
    retry: number;
    errorStack?: string;
    failureDetails?: string;
    attachments?: string[];
  }[];
}
