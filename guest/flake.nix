# guest/flake.nix
{
  description = "Guest VM nixos config";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      firecrackerKernel = (import ./targets/kernel.nix { inherit pkgs; }).firecrackerKernel;
    in
    {
      nixosModules = {
        default = ./configuration.nix;
        firecracker = ./targets/firecracker.nix;
        isolate = ./isolate.nix;
      };

      nixosConfigurations.my-guest = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          self.nixosModules.default
          self.nixosModules.firecracker
          self.nixosModules.isolate
          { nixpkgs.hostPlatform = system; }
        ];
      };

      packages.${system} = {
        # Accessing the build artifacts directly from the evaluated config
        # rootfs-tar = self.nixosConfigurations.my-guest.config.system.build.tarball;

        # This is cleaner: The 'bundle' logic is now a standalone package
        # that takes the 'toplevel' (the built system) as an input.
        firecracker-bundle = pkgs.callPackage ./targets/bundle.nix {
          nixosConfig = self.nixosConfigurations.my-guest.config;
          inherit firecrackerKernel;
        };

        default = self.packages.${system}.firecracker-bundle;
      };
    };
}
