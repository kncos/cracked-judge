export const JUDGE_STATUS_CODES = [
  "IE",
  "CE",
  "RE",
  "MLE",
  "TLE",
  "WA",
  "AC",
  "OLE",
] as const;

export type JudgeStatus = (typeof JUDGE_STATUS_CODES)[number];
