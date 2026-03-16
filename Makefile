
# common directories
DEST 			?= vmroot
TMP_DIR 	:= $(shell mktemp -d /tmp/crackedjudge-XXXXXX)
REPO_DIR 	:= $(TMP_DIR)/repos
VMBASE 		:= $(DEST)/base

# targets
FIRECRACKER_OUT		:=$(DEST)/firecracker
JAILER_OUT				:=$(DEST)/jailer
KERNEL_STAMP_OUT	:=$(VMBASE)/.kernel_stamp
ROOTFS_OUT				:=$(VMBASE)/rootfs.ext4

# all silent for this make file
.SILENT:
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

# default target
.PHONY: all
all: $(KERNEL_STAMP_OUT) $(ROOTFS_OUT) binaries cleanup-all-workspaces

# firecracker repository stuff. We use a stamp as the target so we can
# only clone the repo once and allow multiple targets to depend on it
FC_REPO := https://github.com/firecracker-microvm/firecracker.git
FC_TAG := v1.15.0
FC_REPO_DIR := $(REPO_DIR)/firecracker
FC_REPO_STAMP := $(REPO_DIR)/.fc_repo_stamp
$(FC_REPO_STAMP):
	echo "Cloning firecracker repo..."
	rm -rf $(FC_REPO_DIR)
	mkdir -p $(FC_REPO_DIR)
	git clone --depth 1 --branch $(FC_TAG) --progress $(FC_REPO) $(FC_REPO_DIR)/.
	touch $@

# create directory structure where targets end up
.PHONY: directories
directories:
	mkdir -p $(DEST)/base $(DEST)/jail/firecracker $(DEST)/run $(DEST)/workspace

# kernel version might get bumped, so use a stamp. Kernel ends up in vmbase
$(KERNEL_STAMP_OUT): | directories $(FC_REPO_STAMP)
	echo ">>> Starting kernel build"

	# true because this returns non-zero even though it succeeds.. for some reason	
	time $(FC_REPO_DIR)/tools/devtool build_ci_artifacts kernels 6.1 || true
	echo ">>> KERNEL BUILD FINISHED. see time above"

	cp $(FC_REPO_DIR)/resources/x86_64/vmlinux-6.1.* $(VMBASE)
	KERNEL_NAME=$$(ls $(VMBASE)/vmlinux-6.1.* | grep -v "config" | head -n 1 | xargs basename) && \
	  echo "Kernel that was built: $${KERNEL_NAME}" && \
		echo "Building vmconfig that points to kernel: base/$${KERNEL_NAME}" && \
		bun run scripts/make-vm-conf.ts -k "$${KERNEL_NAME}" -o "$(VMBASE)/vm-config.json" && \
		echo "Wrote vm config to: $(VMBASE)/vm-config.json"
	touch $(KERNEL_STAMP_OUT)

.PHONY: kernel
kernel: $(KERNEL_STAMP_OUT)

# builds the firecracker and jailer binaries. & syntax means we only run 
# the recipe once but can call both/either, these builds are coupled
$(FIRECRACKER_OUT) $(JAILER_OUT) &: | directories $(FC_REPO_STAMP)
	echo ">>> Starting firecracker and jailer binary builds"
	time $(FC_REPO_DIR)/tools/devtool build --release 1>/dev/null
	echo ">>> FIRECRACKER & JAILER FINISHED. see time above"

	if ! cp $(FC_REPO_DIR)/build/cargo_target/*/release/jailer -t $(DEST); then \
		echo ">>> Failed to copy jailer binary? attempted to copy these:"; \
		find $(FC_REPO_DIR) -type f -name "jailer" | sed 's/^/  /'; \
	fi
	if ! cp $(FC_REPO_DIR)/build/cargo_target/*/release/firecracker -t $(DEST); then \
		echo ">>> Failed to copy firecracker binary? attempted to copy these:"; \
		find $(FC_REPO_DIR) -type f -name "firecracker" | sed 's/^/  /'; \
	fi

# convenience target
.PHONY: binaries
binaries: $(FIRECRACKER_OUT) $(JAILER_OUT)

MKOSI_DIR      := mkosi
MKOSI_FILES    := $(shell find $(MKOSI_DIR) -maxdepth 1 -type f 2>/dev/null | sort)
MKOSI_EXTRA    := $(shell find $(MKOSI_DIR)/mkosi.extra -type f 2>/dev/null | sort)
MKOSI_DEPS     := $(MKOSI_FILES) $(MKOSI_EXTRA)
MKOSI_CACHE    := $(MKOSI_DIR)/mkosi.cache

$(ROOTFS_OUT): | directories
	mkdir -p $(MKOSI_CACHE)
	time (pushd $(MKOSI_DIR) && \
	mkosi build && \
	popd && \
	truncate -s 8G $@ && \
	unshare --map-auto --map-root-user mkfs.ext4 -F -d $(MKOSI_DIR)/mkosi.output/image $@ && \
	rm -rf $(MKOSI_DIR)/mkosi.output/ && \
	chmod 777 $@)
	echo ">>> Rootfs image built"

.PHONY: rootfs
rootfs: $(ROOTFS_OUT)

.PHONY: vmroot
vmroot: all 

.PHONY: rebuild
rebuild: cleanup-all-workspaces rebuild-kernel rebuild-rootfs rebuild-binaries

.PHONY: rebuild-kernel
rebuild-kernel:
	rm -f $(VMBASE)/vmlinux* $(KERNEL_STAMP_OUT)
	$(MAKE) $(KERNEL_STAMP_OUT)

.PHONY: rebuild-rootfs
rebuild-rootfs:
	sudo rm -rf $(MKOSI_DIR)/mkosi.output
	rm -f $(ROOTFS_OUT)
	$(MAKE) $(ROOTFS_OUT)

.PHONY: rebuild-binaries
rebuild-binaries:
	rm -f $(FIRECRACKER_OUT) $(JAILER_OUT)
	$(MAKE) binaries

.PHONY: clean
clean: | cleanup-all-workspaces
	sudo rm -rf $(DEST) $(MKOSI_DIR)/mkosi.output

.PHONY: cleanup
cleanup-all-workspaces:
	(find /tmp/ -name 'crackedjudge-*' -type d 2>/dev/null | sort | sed 's/^/[REMOVING] /') || true
	(sudo /bin/bash -c "find /tmp/ -name 'crackedjudge-*' -type d 2>/dev/null | sort | xargs rm -rf;") || \
		echo "Failed to remove directories, maybe you need sudo?"

help:
	rm -rf $(TMP_DIR)
	echo "Targets:"
	echo "  help                 Show this help message"
	echo "  all                  Build everything (default)"
	echo "  clean                Remove all build artifacts"
	echo "  clean-workspaces     Remove all workspace directories"
	echo "  kernel 							 build the microvm kernel"
	echo "  rootfs 							 build the microvm rootfs.ext4"
	echo "  vmconfig             copy vm-config.json to its destination"
	echo "  binaries             build the firecracker and jailer binaries"
	echo "  directories          make empty directory structure for vmroot if it doesn't exist"
	echo "  rebuild              Force rebuild everything"
	echo "  rebuild-kernel       Force kernel rebuild only"
	echo "  rebuild-rootfs       Force rootfs rebuild only"
	echo "  rebuild-binaries Force firecracker + jailer rebuild"

