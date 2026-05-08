{ pkgs, lib, ... }:
pkgs.testers.nixosTest {
  name = "guest-runtime-tests";

  nodes.machine = {
    imports = [
      ../modules/guest-test-runtime.nix
      ./base-config.nix
    ];

    environment.systemPackages = with pkgs; [
      awscli2
    ];

    guest-test-runtime.enable = true;
    networking.useDHCP = false;
    virtualisation.cores = 8;
    virtualisation.memorySize = 12288;

    services.minio = {
      enable = true;
      rootCredentialsFile = "/etc/minio-credentials";
    };

    environment.variables = {
      AWS_ACCESS_KEY_ID = "minioadmin";
      AWS_SECRET_ACCESS_KEY = "minioadmin";
      AWS_DEFAULT_REGION = "us-east-1";
    };

    environment.etc.minio-credentials = {
      text = ''
        MINIO_ROOT_USER=minioadmin
        MINIO_ROOT_PASSWORD=minioadmin
      '';
    };
  };

  testScript = ''
    machine.wait_for_unit("multi-user.target")
    machine.succeed((
      "aws --endpoint-url http://localhost:9000 "
      "--no-verify-ssl "
      "s3 mb s3://mybucket"
    ))

    FILE = "/tmp/example.txt"

    machine.succeed(f"echo \"test\" > {FILE}")

    machine.succeed((
      "aws --endpoint-url http://localhost:9000 "
      f"s3 cp {FILE} s3://mybucket/example.txt"
    ))

    machine.succeed(f"rm {FILE}")

    machine.succeed((
      "aws --endpoint-url http://localhost:9000 "
      f"s3 cp s3://mybucket/example.txt {FILE}"
    ))

    machine.succeed(f"test $(cat {FILE}) = \"test\"")

    machine.succeed("cj-guest-test")
  '';
}
