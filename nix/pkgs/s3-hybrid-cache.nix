{
  rustPlatform,
  fetchFromGitHub,
  ...
}:
rustPlatform.buildRustPackage (finalAttrs: {
  pname = "s3-hybrid-cache";
  version = "1.12.1";
  src = fetchFromGitHub {
    owner = "kncos";
    repo = "sample-s3-hybrid-cache";
    rev = "802ca4ade5cdc1d872cd1e0ad5865a08b812f98d";
    hash = "sha256-thoIWBG9jWubzaLXbYDnuiqnjCCK7UMa9yplZYmMsBw=";
  };

  cargoHash = "sha256-Uken+S0c1KWXY4wWUDfD+ZDvGveB7jPEN/r2Sw6rkIw=";
  cargoTestFlags = [ "--lib" ];
})
