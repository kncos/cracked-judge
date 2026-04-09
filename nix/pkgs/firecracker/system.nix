{
  nixpkgs,
  system ? "x86_64-linux",
  extraModules ? [ ],
}:
nixpkgs.lib.nixosSystem {
  inherit system;
  modules = [
    ./modules/rootfs/configuration.nix
  ]
  # extra modules
  ++ extraModules;
}
