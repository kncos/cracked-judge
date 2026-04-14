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

    # firecracker = prev.pkgsStatic.callPackage ./pkgs/firecracker-bins.nix { };
    firecracker = prev.firecracker.overrideAttrs (oldAttrs: {
      version = "1.15.1";

      src = prev.fetchFromGitHub {
        owner = "firecracker-microvm";
        repo = "firecracker";
        rev = "v1.15.1";
        hash = "sha256-H3dj11Q0MgLST1TWJ5rmfPePxjXrXOYI2Xf/3uUdICU=";
      };

      cargoDeps = oldAttrs.cargoDeps.overrideAttrs (_: {
        inherit (oldAttrs) src;
        outputHash = "sha256-N2WYnFTlz4NUAU/tjy18SPvxdDVDIIaqgu44e6unOHs=";
      });
    });
  })
]
