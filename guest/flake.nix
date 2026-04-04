# guest/flake.nix
{
  description = "Guest VM nixos config";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      lib = pkgs.lib;
    in
    {
      packages.${system} = {
        # Accessing the build artifacts directly from the evaluated config
        # rootfs-tar = self.nixosConfigurations.my-guest.config.system.build.tarball;

        # This is cleaner: The 'bundle' logic is now a standalone package
        # that takes the 'toplevel' (the built system) as an input.
        firecracker-bundle = pkgs.symlinkJoin {
          name = "firecracker-bundle";
          paths = [
            (import ./firecracker/disk-image.nix)
            {
              inherit pkgs lib;
            }
            (import ./firecracker/vm-config.nix)
            { inherit pkgs lib; }
            (import ./firecracker/kernel.nix)
            { inherit pkgs lib; }
          ];
        };

        default = self.packages.${system}.firecracker-bundle;
      };
    };
}
