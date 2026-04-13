{
  nixpkgs,
  pkgs,
  system ? "x86_64-linux",
  isDebug ? true,
}:
nixpkgs.lib.nixosSystem {
  inherit system;
  modules = (
    if isDebug then
      [
        ./modules/debug
        { nixpkgs.pkgs = pkgs; }
      ]
    else
      [
        ./modules/release
        { nixpkgs.pkgs = pkgs; }
      ]
  );
}
