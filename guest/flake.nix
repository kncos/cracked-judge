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
      nixosConfigurations.firecracker = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          {
            isolate.enable = true;
            firecracker.kernel.enable = true;
            firecracker.disk-image.enable = true;
            firecracker.vm-config.enable = true;
            firecracker.vm-config.rootfsPath = "rootfs.ext4";
            firecracker.vm-config.kernelPath = "vmlinux";
          }
          ./firecracker/firecracker.nix
          ./firecracker/isolate.nix
          ./firecracker/disk-image.nix
          ./firecracker/vm-config.nix
          ./firecracker/kernel.nix
        ];
      };

      packages.${system} = {
        # firecracker-bundle = self.nixosConfigurations.firecracker.config.firecracker.vm-config.package;
        firecracker-bundle =
          let
            fc = self.nixosConfigurations.firecracker.config.firecracker;
            kernel = fc.kernel.package;
            config = fc.vm-config.package;
            rootfs = fc.disk-image.package + "/nixos.img";
          in
          pkgs.runCommand "firecracker-bundle" { } ''
            mkdir -p $out
            cp "${kernel}" $out/vmlinux
            cp "${config}" $out/vm-config.json
            cp "${rootfs}" $out/rootfs.ext4
          '';

        default = self.packages.${system}.firecracker-bundle;
      };
    };
}
