{
  nixpkgs,
  pkgs,
  system ? "x86_64-linux",
  extraModules ? [ ],
}:
nixpkgs.lib.nixosSystem {
  inherit system;
  modules = [
    ./modules/rootfs/configuration.nix
    { nixpkgs.pkgs = pkgs; }
  ]
  # extra modules
  ++ extraModules;
}
