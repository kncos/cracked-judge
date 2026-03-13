export type VmConfig = {
  jail: string;
  base: string;
  socks: string;
  workspace: string;
  sockPort?: string;
  uid: string;
  gid: string;
  // mode?: string;
  jailerBinary: string;
  firecrackerBinary: string;
};
