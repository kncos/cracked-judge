{
  pkgs,
  nixpkgs,
  system ? "x86_64-linux",
}:
let
  firecracker-guest-bundle = import ./firecracker {
    inherit pkgs nixpkgs system;
  };

  cj-host = import ./cj-host { inherit pkgs; };
  host-config = import ./host-config {
    inherit pkgs;
    # readonly for the host, it just makes overlay binds with this lower dir
    depsRoot = "${firecracker-guest-bundle}";
    jailerBinaryPath = "${pkgs.firecracker}/bin/jailer";
    firecrackerBinaryPath = "${pkgs.firecracker}/bin/firecracker";
  };
in
pkgs.runCommand "host-bundle" { } ''
  mkdir -p $out
  cp "${cj-host}/bin/cj-host" "$out/cj-host"
  cp "${host-config}" "$out/host-config.json"
  touch "$out/README.txt"
  echo "(debug) firecracker bundle is at path: ${firecracker-guest-bundle}" >> "$out/README.txt"
''
