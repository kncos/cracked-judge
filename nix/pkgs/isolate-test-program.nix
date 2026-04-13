{
  rustPlatform,
}:
rustPlatform.buildRustPackage (finalAttrs: {
  pname = "isolate-test-program";
  version = "0.1.0";

  src = ../../src/_isolate-test-program;

  cargoLock = {
    lockFile = ./Cargo.lock;
  };

  release = true;
})
