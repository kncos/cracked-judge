{
  description = "CrackedJudge - RCE as a Service";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";

    bun2nix.url = "github:nix-community/bun2nix";
    bun2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  outputs =
    {
      self,
      nixpkgs,
      ...
    }:
    let
      system = "x86_64-linux";
      # see: https://nix-community.github.io/bun2nix/overlay.html
      # adds bun2nix binary to pkgs
      overlays = import ./nix/overlays.nix { inherit self; };
      pkgs = import nixpkgs {
        inherit system overlays;
      };
    in
    {
      nixosConfigurations.firecracker = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          {
            nixpkgs.overlays = overlays;
            firecracker.all.enable = true;
          }
          ./nix/firecracker
        ];
      };

      rootfs = import ./nix/pkgs/fc-rootfs.nix {
        inherit pkgs;
        nixosConfig = self.nixosConfigurations.firecracker.config;
      };
      vmlinux = import ./nix/pkgs/fc-kernel.nix { inherit pkgs system; };
      vm-config = import ./nix/pkgs/vm-config.nix { inherit pkgs; };
      # directory with all of the stuff the firecracker process itself needs.
      # if we had an initrd we would also include that, but its unused now
      firecracker-bundle = pkgs.runCommand "firecracker-bundle" { } ''
        mkdir -p $out
        cp "${self.vmlinux}" $out/vmlinux
        cp "${self.vm-config}" $out/vm-config.json
        cp "${self.rootfs}/nixos.img" $out/rootfs.ext4
      '';

      host-runtime = import ./nix/pkgs/host-runtime.nix { inherit pkgs; };
      # just needs the root dir but for everything else the defaults are fine
      hostConfig = import ./nix/pkgs/host-config.nix {
        inherit pkgs;
        depsRoot = self.firecracker-bundle;
      };

      packages.${system} =
        let
          fc = self.nixosConfigurations.firecracker;
        in
        {

          firecracker = fc.config.firecracker.all.package;
          hostRuntime = pkgs.writeShellApplication {
            name = "run-orchestrator";

            runtimeInputs = with pkgs; [
              firecracker
            ];

            text = ''
              #!/bin/sh
              BASE=$(mktemp -d /tmp/firecracker-base-XXXXXXXX/)
              mount --bind 
            '';
          };
        };
    };
}
