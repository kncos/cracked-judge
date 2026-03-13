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
KERNEL_OUT     := $(VMROOT)/base/vmlinux
ROOTFS_OUT     := $(VMROOT)/base/$(ROOTFS)
VMCONFIG_OUT   := $(VMROOT)/base/vm-config.json

.PHONY: all clean rebuild rebuild-kernel rebuild-rootfs rebuild-firecracker help vmroot sudo-validate

all: vmroot

# Cache sudo credentials upfront so builds don't block on password prompt
sudo-validate:
	@echo ">>> Validating sudo credentials..."
	@sudo -v

vmroot: sudo-validate $(FC_BIN) $(JAILER_BIN) $(KERNEL_OUT) $(ROOTFS_OUT) $(VMCONFIG_OUT)

# ── Directory Structure ───────────────────────────────────────────────────────
$(VMROOT) $(VMROOT)/base $(VMROOT)/jail/firecracker $(VMROOT)/socks $(VMROOT)/workspace:
	mkdir -p $@

# ── Shared Workdir Helper ─────────────────────────────────────────────────────
# Usage: $(call clone_fc_repo,<workdir>)
define clone_fc_repo
	git clone --depth 1 --branch $(FC_TAG) --progress $(FC_REPO) $(1)/firecracker 2>&1
endef

# ── Kernel ────────────────────────────────────────────────────────────────────
# Note: devtool builds to resources/x86_64/ (release) and resources/x86_64/debug/
# devtool uses Docker which creates root-owned files, so cleanup needs sudo
$(KERNEL_OUT): | $(VMROOT)/base
	@echo ">>> Starting kernel build"
	WORKDIR=$$(mktemp -d /tmp/firecracker-build-XXXXXXXX); \
	$(call clone_fc_repo,$$WORKDIR) && \
	cd $$WORKDIR/firecracker && \
	  stdbuf -oL -eL ./tools/devtool build_ci_artifacts kernels 6.1 2>&1 | \
	    stdbuf -oL sed 's/^/[devtool] /'; \
	echo ">>> Copying kernel..."; \
	cp $$WORKDIR/firecracker/resources/x86_64/vmlinux-6.1.* $(VMROOT)/base/; \
	sudo rm -rf $$WORKDIR; \
	echo ">>> Kernel build complete"

# ── Firecracker + Jailer ──────────────────────────────────────────────────────
# Build both binaries together; each file target checks if rebuild is needed.
# devtool uses Docker which creates root-owned files, so cleanup needs sudo
$(FC_BIN) $(JAILER_BIN): | $(VMROOT)
	@if [ -f $(FC_BIN) ] && [ -f $(JAILER_BIN) ]; then \
	  echo ">>> Firecracker/jailer already exist"; \
	else \
	  echo ">>> Starting firecracker/jailer build"; \
	  WORKDIR=$$(mktemp -d /tmp/firecracker-build-XXXXXXXX); \
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
MKOSI_CACHE := $(MKOSI_DIR)/mkosi.cache

$(MKOSI_CACHE):
	mkdir -p $@

$(MKOSI_DIR)/mkosi.output/image: $(MKOSI_DEPS) | $(MKOSI_CACHE)
	@echo ">>> Building rootfs via mkosi"
	rm -rf $(MKOSI_DIR)/mkosi.output/
	cd $(MKOSI_DIR) && unshare --map-auto --map-root-user mkosi build --cache-dir mkosi.cache
	@echo ">>> Rootfs image built"

$(ROOTFS_OUT): $(MKOSI_DIR)/mkosi.output/image | $(VMROOT)/base
	@echo ">>> Packing ext4 image"
	truncate -s 2G $@
	unshare --map-auto --map-root-user mkfs.ext4 -F -d $(MKOSI_DIR)/mkosi.output/image $@
	rm -rf $(MKOSI_DIR)/mkosi.output/
	@echo ">>> RootFS build complete"

# ── VM Config ─────────────────────────────────────────────────────────────────
$(VMCONFIG_OUT): | $(VMROOT)/base
	@echo ">>> Copying vm-config.json"
	cp vm-config.json $@

# ── Convenience targets ───────────────────────────────────────────────────────
rebuild: sudo-validate rebuild-kernel rebuild-rootfs rebuild-firecracker

rebuild-kernel: sudo-validate
	rm -f $(KERNEL_OUT)
	$(MAKE) $(KERNEL_OUT)

rebuild-rootfs: sudo-validate
	rm -f $(ROOTFS_OUT)
	$(MAKE) $(ROOTFS_OUT)

rebuild-firecracker: sudo-validate
	rm -f $(FC_BIN) $(JAILER_BIN)
	$(MAKE) $(FC_BIN) $(JAILER_BIN)

clean:
	rm -rf $(VMROOT) $(MKOSI_DIR)/mkosi.output/ $(MKOSI_DIR)/mkosi.cache/
	sudo rm -rf /tmp/firecracker-build-*/

help:
	@echo "Targets:"
	@echo "  all                  Build everything (default)"
	@echo "  rebuild              Force rebuild everything"
	@echo "  rebuild-kernel       Force kernel rebuild only"
	@echo "  rebuild-rootfs       Force rootfs rebuild only"
	@echo "  rebuild-firecracker  Force firecracker + jailer rebuild"
	@echo "  clean                Remove all build artifacts"