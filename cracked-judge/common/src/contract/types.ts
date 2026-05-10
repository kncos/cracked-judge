export const JOB_STATUS_CODES = [
  "AC",
  "NZE",
  "TLE",
  "MLE",
  "OLE",
  "IE",
] as const;

export type JobStatus = (typeof JOB_STATUS_CODES)[number];
