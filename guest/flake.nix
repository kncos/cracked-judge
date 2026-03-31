{
  description = "Guest VM nixos config";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    {
      nixosModules.default = import ./configuration.nix;
      nixosConfigurations.my-guest = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          self.nixosModules.default
          { nixpkgs.hostPlatform = "x86_64-linux"; } # explicit
        ];
      };
      packages.x86_64-linux.rootfs = self.nixosConfigurations.my-guest.config.system.build.tarball;
    };
}
