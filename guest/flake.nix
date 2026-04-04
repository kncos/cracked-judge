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

      nixosConfigurations.firecracker = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          {
            firecracker.kernel.enable = true;
            firecracker.disk-image.enable = true;
            firecracker.vm-config.enable = true;
          }
          ./firecracker/firecracker.nix
          ./firecracker/isolate.nix
          ./firecracker/disk-image.nix
          ./firecracker/vm-config.nix
          ./firecracker/kernel.nix
        ];
      };

      packages.${system} = {
        firecracker-bundle = self.nixosConfigurations.firecracker.config.firecracker.vm-config.package;

        default = self.packages.${system}.firecracker-bundle;
      };
    };
}
