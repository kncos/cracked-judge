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
      nixosConfigurations.firecracker = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          {
            firecracker.all.enable = true;
            firecracker.vm-config.rootfsPath = "rootfs.ext4";
            firecracker.vm-config.kernelPath = "vmlinux";
            worker-runtime.enable = true;
          }
          ./firecracker
          ./runtime
        ];
      };

      packages.${system} = {
        firecracker-bundle = self.nixosConfigurations.firecracker.config.firecracker.all.package;
        default = self.packages.${system}.firecracker-bundle;
      };

      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          firecracker
        ];
      };
    };
}
