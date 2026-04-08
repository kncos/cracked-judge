{
  pkgs,
  depsRoot ? "/run/cracked-judge/deps/",
  jailerRoot ? "/run/cracked-judge/jail/",
  hostRuntimeRoot ? "/run/cracked-judge/run/",
  jailerBinaryPath ? "jailer",
  firecrackerBinaryPath ? "firecracker",
}:
pkgs.writeText "host-config.json" (
  builtins.toJSON {
    inherit
      depsRoot
      jailerRoot
      hostRuntimeRoot
      jailerBinaryPath
      firecrackerBinaryPath
      ;
  }
)
