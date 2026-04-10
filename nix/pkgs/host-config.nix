{
  pkgs,
  depsSource,
  runtimeRoot ? "/tmp/cracked-judge/",
  jailerBinaryPath ? "jailer",
  firecrackerBinaryPath ? "firecracker",
}:
pkgs.writeText "host-config.json" (
  builtins.toJSON {
    inherit
      depsSource
      runtimeRoot
      jailerBinaryPath
      firecrackerBinaryPath
      ;
  }
)
