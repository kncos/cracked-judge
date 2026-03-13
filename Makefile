KERNEL_VERSION := 6.1.163
KERNEL_FILE    := vmlinux-$(KERNEL_VERSION)
ROOTFS         := rootfs.ext4
VMROOT         ?= vmroot

MKOSI_DIR      := mkosi
MKOSI_FILES    := $(MKOSI_DIR)/mkosi.conf $(MKOSI_DIR)/mkosi.postinst.chroot $(MKOSI_DIR)/mkosi.prepare $(MKOSI_DIR)/mkosi.build
MKOSI_EXTRA    := $(shell find $(MKOSI_DIR)/mkosi.extra -type f 2>/dev/null | sort)
MKOSI_DEPS     := $(MKOSI_FILES) $(MKOSI_EXTRA)

FC_REPO        := https://github.com/firecracker-microvm/firecracker.git
FC_TAG         := v1.15.0

# Final output paths
FC_BIN         := $(VMROOT)/firecracker
JAILER_BIN     := $(VMROOT)/jailer
KERNEL_OUT     := $(VMROOT)/base/$(KERNEL_FILE)
ROOTFS_OUT     := $(VMROOT)/base/$(ROOTFS)
VMCONFIG_OUT   := $(VMROOT)/base/vm-config.json

.PHONY: all clean rebuild rebuild-kernel rebuild-rootfs rebuild-firecracker help vmroot

all: vmroot

vmroot: $(FC_BIN) $(JAILER_BIN) $(KERNEL_OUT) $(ROOTFS_OUT) $(VMCONFIG_OUT)

# ── Directory Structure ───────────────────────────────────────────────────────
VMROOT_DIRS := $(VMROOT)/base \
               $(VMROOT)/jail/firecracker \
               $(VMROOT)/socks \
               $(VMROOT)/workspace

$(VMROOT_DIRS):
	mkdir -p $@

# ── Shared Workdir Helper ─────────────────────────────────────────────────────
# Usage: $(call clone_fc_repo,<workdir>)
define clone_fc_repo
	git clone --depth 1 --branch $(FC_TAG) --progress $(FC_REPO) $(1)/firecracker 2>&1
endef

# ── Kernel ────────────────────────────────────────────────────────────────────
$(KERNEL_OUT): | $(VMROOT)/base
	@echo ">>> Starting kernel build"
	$(eval WORKDIR := $(shell mktemp -d ./build-tmp-XXXXXXXX))
	$(call clone_fc_repo,$(WORKDIR))
	cd $(WORKDIR)/firecracker && \
	  stdbuf -oL -eL ./tools/devtool build_ci_artifacts kernels 6.1 2>&1 | \
	    stdbuf -oL sed 's/^/[devtool] /'
	cp $(WORKDIR)/firecracker/resources/x86_64/$(KERNEL_FILE) $@
	sudo rm -rf $(WORKDIR)
	@echo ">>> Kernel build complete"

# ── Firecracker + Jailer ──────────────────────────────────────────────────────
# Build both binaries together; each file target checks if rebuild is needed.
# Uses a temp stamp during build that gets cleaned up after copying.
$(FC_BIN) $(JAILER_BIN): | $(VMROOT)
	@if [ -f $(FC_BIN) ] && [ -f $(JAILER_BIN) ]; then \
	  echo ">>> Firecracker/jailer already exist"; \
	else \
	  echo ">>> Starting firecracker/jailer build"; \
	  WORKDIR=$$(mktemp -d ./build-tmp-XXXXXXXX); \
	  $(call clone_fc_repo,$$WORKDIR); \
	  cd $$WORKDIR/firecracker && \
	    stdbuf -oL -eL ./tools/devtool build --release 2>&1 | \
	      stdbuf -oL sed 's/^/[devtool] /'; \
	  cp $$(find $$WORKDIR/firecracker/build -path '*/release/firecracker' -type f) $(FC_BIN); \
	  cp $$(find $$WORKDIR/firecracker/build -path '*/release/jailer' -type f) $(JAILER_BIN); \
	  sudo rm -rf $$WORKDIR; \
	  echo ">>> Firecracker/jailer build complete"; \
	fi

# ── RootFS ────────────────────────────────────────────────────────────────────
$(MKOSI_DIR)/mkosi.output/image: $(MKOSI_DEPS)
	@echo ">>> Building rootfs via mkosi"
	cd $(MKOSI_DIR) && sudo rm -rf mkosi.output/
	cd $(MKOSI_DIR) && sudo mkosi build
	cd $(MKOSI_DIR) && sudo chown -R $(shell whoami): mkosi.output/

$(ROOTFS_OUT): $(MKOSI_DIR)/mkosi.output/image | $(VMROOT)/base
	@echo ">>> Packing ext4 image"
	truncate -s 2G $@
	unshare --map-auto --map-root-user mkfs.ext4 -F -d $(MKOSI_DIR)/mkosi.output/image $@
	sudo rm -rf $(MKOSI_DIR)/mkosi.output/
	@echo ">>> RootFS build complete"

# ── VM Config ─────────────────────────────────────────────────────────────────
$(VMCONFIG_OUT): | $(VMROOT)/base
	@echo ">>> Copying vm-config.json"
	cp vm-config.json $@

# ── Convenience targets ───────────────────────────────────────────────────────
rebuild: rebuild-kernel rebuild-rootfs rebuild-firecracker

rebuild-kernel:
	sudo rm -f $(KERNEL_OUT)
	$(MAKE) $(KERNEL_OUT)

rebuild-rootfs:
	sudo rm -f $(ROOTFS_OUT)
	$(MAKE) $(ROOTFS_OUT)

rebuild-firecracker:
	sudo rm -f $(FC_BIN) $(JAILER_BIN)
	$(MAKE) $(FC_BIN) $(JAILER_BIN)

clean:
	sudo rm -rf $(VMROOT) $(MKOSI_DIR)/mkosi.output/ ./build-tmp-*/

help:
	@echo "Targets:"
	@echo "  all                  Build everything (default)"
	@echo "  rebuild              Force rebuild everything"
	@echo "  rebuild-kernel       Force kernel rebuild only"
	@echo "  rebuild-rootfs       Force rootfs rebuild only"
	@echo "  rebuild-firecracker  Force firecracker + jailer rebuild"
	@echo "  clean                Remove all build artifacts"