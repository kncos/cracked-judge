{ pkgs, lib, ... }:
pkgs.testers.nixosTest {
  name = "guest-runtime-tests";

  nodes.machine = {
    imports = [
      ./base-config.nix
    ];

    networking.useDHCP = false;
    virtualisation.cores = 4;
    virtualisation.memorySize = 6144;

    environment.systemPackages = with pkgs; [
      awscli2
    ];

    services = {
      s3-hybrid-cache = {
        enable = true;
      };

      minio = {
        enable = true;
        accessKey = "minioadmin";
        secretKey = "minioadmin";
      };
    };
  };

  testScript = ''
    machine.wait_for_unit("multi-user.target")

    temp_dir = "/tmp/some_aws_files/"
    machine.succeed(f"mkdir -p {temp_dir}");
  '';
}
