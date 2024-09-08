export interface SpecFileRecord {
  specFileName: string;
  datetime: string;
  totalDuration: number; // Total duration of the spec file
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

export interface SpecFileLink {
  name: string;
  runUrl: string;
  status: string;
  totalDuration: number; // Add total duration of the spec file
  tests: {
    title: string;
    status: string;
    duration: number;
    retry: number;
  }[]; // Add test details inside spec files
}
