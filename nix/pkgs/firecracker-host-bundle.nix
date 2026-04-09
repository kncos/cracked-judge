{
  pkgs,
  nixpkgs,
  system ? "x86_64-linux",
}:
let
  firecracker-guest-bundle = import ./firecracker {
    inherit pkgs nixpkgs system;
  };

  cj-host = import ./cj-host.nix { inherit pkgs; };
  host-config = import ./host-config.nix {
    inherit pkgs;
    # copied to the runtime directory by the host process
    depsSource = "${firecracker-guest-bundle}";
    jailerBinaryPath = "${pkgs.pkgsStatic.firecracker}/bin/jailer";
    firecrackerBinaryPath = "${pkgs.pkgsStatic.firecracker}/bin/firecracker";
  };
in
pkgs.runCommand "host-bundle" { } ''
  mkdir -p $out
  cp "${cj-host}/bin/cj-host" "$out/cj-host"
  cp "${host-config}" "$out/host-config.json"
  touch "$out/README.txt"
  echo "(debug) firecracker bundle is at path: ${firecracker-guest-bundle}" >> "$out/README.txt"
''
