export interface SpecFileRecord {
    specFileName: string;
    datetime: string;
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
  