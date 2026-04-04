{ pkgs, ... }:
let
  # this is specifically for the 6.1.155 version which is pretty recent as of 2026-04-01
  version = "6.1.155";
  kernelByArch = {
    x86_64 = {
      url = "https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.15/x86_64/vmlinux-${version}";
      hash = "sha256-4g5G0MNsVcDRAU6yBXYXGz89kiJg2feSAXrv9Trz1PI=";
    };
    aarch64 = {
      url = "https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.15/aarch64/vmlinux-${version}";
      hash = "sha256-41RLEGA6y/PbSSy1LgANIrogLLS2O5rdAnVlaD4RxZE=";
    };
  };

  arch = pkgs.stdenv.hostPlatform.linuxArch;
in
pkgs.fetchurl (kernelByArch.${arch} or (throw "Unsupported host platform arch for kernel: ${arch}"))
