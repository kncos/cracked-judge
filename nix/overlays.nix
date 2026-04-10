{ self }:
[
  self.inputs.bun2nix.overlays.default
  (final: prev: {
    isolate = prev.isolate.overrideAttrs (oldAttrs: {
      version = "2.2.1";
      src = prev.fetchFromGitHub {
        owner = "ioi";
        repo = "isolate";
        rev = "v2.2.1";
        hash = "sha256-haH4fjL3cWayYrpUDwD4hUNlxIoN6MdO3QgAqimi/+c=";
      };
    });

    firecracker = prev.callPackage ./pkgs/firecracker-bins.nix { };
  })
]
