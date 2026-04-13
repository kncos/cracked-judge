{ pkgs }:
let

in
pkgs.nixosTest {
  nodes.machine =
    (pkgs.callPackage ./nixos-system.nix {
      isDebug = true;
      system = "x86_64-linux";
    }).config;

  testScript = ''
    machine.wait_for_unit("multi-user.target")
    result = machine.execute("cj-guest-test")
    print(result[0])
    print(result[1])
  '';
}
