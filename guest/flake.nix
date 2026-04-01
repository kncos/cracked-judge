# guest/flake.nix
{
  description = "Guest VM nixos config";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      nixosModules.default = import ./configuration.nix;
      nixosModules.firecracker = import ./targets/firecracker.nix;
      nixosModules.kernel = import ./targets/kernel.nix;

      nixosConfigurations.my-guest = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          self.nixosModules.default
          self.nixosModules.firecracker
          self.nixosModules.kernel
          { nixpkgs.hostPlatform = system; }
        ];
      };

      packages.${system} =
        let
          bundle = pkgs.callPackage ./targets/bundle.nix {
            nixosConfig = self.nixosConfigurations.my-guest.config;
            firecrackerKernel = self.nixosConfigurations.my-guest.config._module.args.firecrackerKernel;
          };
        in
        {
          rootfs-tar = self.nixosConfigurations.my-guest.config.system.build.tarball;
          firecracker-bundle = bundle;
          default = bundle;
        };
    };
}
