import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "util";

const printHelp = () => {
  // --kernel-name and --output-name options
  const lines = [
    `  -k  --kernel-name    File name of the kernel image not a path, literal name`,
    `  -o  --output-path    Output path for the VM configuration file include name`,
    `  -h  --help           print this menu`,
  ];
  console.log(lines.join("\n"));
};

const baseConf = {
  "boot-source": {
    kernel_image_path: "base/vmlinux-6.1.164",
    boot_args:
      "quiet loglevel=3 reboot=k panic=1 console=ttyS0 pci=off nomodule root=/dev/vda rw init=/sbin/busybox init",
  },
  drives: [
    {
      drive_id: "rootfs",
      path_on_host: "base/rootfs.ext4",
      is_root_device: true,
      is_read_only: false,
    },
  ],
  "machine-config": {
    vcpu_count: 1,
    mem_size_mib: 1024,
  },
  vsock: {
    guest_cid: 3,
    uds_path: "./run/v.sock",
  },
};

const main = () => {
  const { values, positionals } = parseArgs({
    args: Bun.argv,
    options: {
      "kernel-name": {
        type: "string",
        short: "k",
        multiple: false,
      },
      "output-path": {
        type: "string",
        short: "o",
        multiple: false,
      },
    },
    strict: true,
    allowPositionals: true,
  });

  const kname = values["kernel-name"];
  if (!kname || !kname.trim()) {
    printHelp();
    console.error("Kernel name not provided. Need the file name (not a path)");
    process.exit(-1);
  }
  const newConf = JSON.stringify(
    {
      ...baseConf,
      "boot-source": {
        ...baseConf["boot-source"],
        kernel_image_path: `base/${kname}`,
      },
    },
    null,
    2,
  );

  const output = values["output-path"] || "./vm-config.json";
  try {
    // const outPath = path.resolve(output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${newConf}\n`); // end with newline
  } catch (err) {
    printHelp();
    console.error(`Failed to write to ${output}: ${err}`);
    console.error("This could be because you gave an invalid path.");
    console.error("or the default resolved path was unexpected.");
    console.error(`FAILED TO WRITE: ${output}`);
  }
};

main();
