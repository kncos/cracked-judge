KERNEL_VERSION := 6.1.163
KERNEL_FILE    := vmlinux-$(KERNEL_VERSION)
ROOTFS         := rootfs.ext4
FIRECRACKER    := firecracker
JAILER         := jailer

MKOSI_FILES    := mkosi.conf mkosi.postinst.chroot mkosi.prepare mkosi.build
MKOSI_EXTRA    := $(shell find mkosi.extra -type f 2>/dev/null | sort)
MKOSI_DEPS     := $(MKOSI_FILES) $(MKOSI_EXTRA)

FC_REPO        := https://github.com/firecracker-microvm/firecracker.git
FC_TAG         := v1.15.0

.PHONY: all clean rebuild rebuild-kernel rebuild-rootfs rebuild-firecracker help

all: $(KERNEL_FILE) $(ROOTFS) $(FIRECRACKER) $(JAILER)

# ── Shared Workdir Helper ─────────────────────────────────────────────────────
# Usage: $(call clone_fc_repo,<workdir>)
# Clones the firecracker repo into <workdir>/firecracker
define clone_fc_repo
	git clone --depth 1 --branch $(FC_TAG) --progress $(FC_REPO) $(1)/firecracker 2>&1
endef

# ── Kernel ────────────────────────────────────────────────────────────────────
$(KERNEL_FILE):
	@echo ">>> Starting kernel build"
	$(eval WORKDIR := $(shell mktemp -d ./build-tmp-XXXXXXXX))
	$(call clone_fc_repo,$(WORKDIR))
	cd $(WORKDIR)/firecracker && \
	  stdbuf -oL -eL ./tools/devtool build_ci_artifacts kernels 6.1 2>&1 | \
	    stdbuf -oL sed 's/^/[devtool] /'
	cp $(WORKDIR)/firecracker/resources/x86_64/$(KERNEL_FILE)* .
	sudo rm -rf $(WORKDIR)
	@echo ">>> Kernel build complete"

# ── Firecracker + Jailer ──────────────────────────────────────────────────────
# Both binaries are produced by the same build step so they share a recipe.
# We use a sentinel file to let Make track completion of the single build step
# that produces both outputs.
.fc_build_stamp: 
	@echo ">>> Starting firecracker/jailer build"
	$(eval WORKDIR := $(shell mktemp -d ./build-tmp-XXXXXXXX))
	$(call clone_fc_repo,$(WORKDIR))
	cd $(WORKDIR)/firecracker && \
	  stdbuf -oL -eL ./tools/devtool build --release 2>&1 | \
	    stdbuf -oL sed 's/^/[devtool] /'
	cp $$(find $(WORKDIR)/firecracker/build -path '*/release/firecracker' -type f) .
	cp $$(find $(WORKDIR)/firecracker/build -path '*/release/jailer'      -type f) .
	rm -rf $(WORKDIR)
	touch $@
	@echo ">>> Firecracker/jailer build complete"

$(FIRECRACKER) $(JAILER): .fc_build_stamp

# ── RootFS ────────────────────────────────────────────────────────────────────
mkosi.output/image: $(MKOSI_DEPS)
	@echo ">>> Building rootfs via mkosi"
	sudo rm -rf mkosi.output/
	sudo mkosi build
	sudo chown -R $(shell whoami): mkosi.output/

$(ROOTFS): mkosi.output/image
	@echo ">>> Packing ext4 image"
	truncate -s 2G $@
	unshare --map-auto --map-root-user mkfs.ext4 -F -d mkosi.output/image $@
	@echo ">>> RootFS build complete"

# ── Convenience targets ───────────────────────────────────────────────────────
rebuild: rebuild-kernel rebuild-rootfs rebuild-firecracker

rebuild-kernel:
	rm -f $(KERNEL_FILE)
	$(MAKE) $(KERNEL_FILE)

rebuild-rootfs:
	rm -f $(ROOTFS)
	sudo rm -rf mkosi.output/
	$(MAKE) $(ROOTFS)

rebuild-firecracker:
	rm -f $(FIRECRACKER) $(JAILER) .fc_build_stamp
	$(MAKE) .fc_build_stamp

clean:
	rm -f $(KERNEL_FILE) $(ROOTFS) $(FIRECRACKER) $(JAILER) .fc_build_stamp
	sudo rm -rf mkosi.output/ ./build-tmp-*/

help:
	@echo "Targets:"
	@echo "  all                  Build everything (default)"
	@echo "  rebuild              Force rebuild everything"
	@echo "  rebuild-kernel       Force kernel rebuild only"
	@echo "  rebuild-rootfs       Force rootfs rebuild only"
	@echo "  rebuild-firecracker  Force firecracker + jailer rebuild"
	@echo "  clean                Remove all build artifacts"