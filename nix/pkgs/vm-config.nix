{
  pkgs,
  vcpus ? 1,
  memory ? 1024,
  useSocket ? true,
  useInitrd ? false,
  ...
}:

pkgs.writeText "vm-config.json" (
  builtins.toJSON (
    {
      boot-source = {
        kernel_image_path = "./deps/vmlinux";
        boot_args = "console=ttyS0 reboot=k panic=1 pci=off root=/dev/vda rw init=/run/current-system/sw/bin/init";
      };

      drives = [
        {
          drive_id = "rootfs";
          path_on_host = "./deps/rootfs.ext4";
          is_root_device = true;
          is_read_only = false;
        }
      ];

      machine-config = {
        vcpu_count = vcpus;
        mem_size_mib = memory;
      };
    }
    # initrd isn't even generated currently
    // pkgs.lib.optionalAttrs useInitrd {
      boot-source = {
        initrd_path = "./deps/initrd";
      };
    }
    // pkgs.lib.optionalAttrs useSocket {
      vsock = {
        guest_cid = 3;
        uds_path = "./run/v.sock";
      };
    }
  )
)
