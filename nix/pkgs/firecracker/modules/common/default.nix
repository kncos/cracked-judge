{ ... }:
{
  imports = [
    ./base.nix
    ./isolate.nix
  ];

  config = {
    isolate.enable = true;
  };
}
