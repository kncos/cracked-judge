# nix/modules/s3-hybrid-cache.nix
{
  pkgs,
  lib,
  config,
  ...
}:
let
  cfg = config.services.s3-hybrid-cache;

  # only include keys whose values are not null
  optionalAttrs' = lib.filterAttrs (_: v: v != null);

  cacheSection = optionalAttrs' {
    cache_dir = cfg.cache.cacheDir;
    max_cache_size = cfg.cache.maxCacheSize;
    ram_cache_enabled = cfg.cache.ramCacheEnabled;
    max_ram_cache_size = cfg.cache.maxRamCacheSize;
    eviction_algorithm = cfg.cache.evictionAlgorithm;
    get_ttl = cfg.cache.getTtl;
    head_ttl = cfg.cache.headTtl;
    put_ttl = cfg.cache.putTtl;
    write_cache_enabled = cfg.cache.writeCacheEnabled;
    write_cache_percent = cfg.cache.writeCachePercent;
    actively_remove_cached_data = cfg.cache.activelyRemoveCachedData;
  };

  compressionSection = optionalAttrs' {
    enabled = cfg.compression.enabled;
    content_aware = cfg.compression.contentAware;
    threshold = cfg.compression.threshold;
    preferred_algorithm = cfg.compression.preferredAlgorithm;
  };

  connectionPoolSection = optionalAttrs' {
    keepalive_enabled = cfg.connectionPool.keepaliveEnabled;
    max_idle_per_host = cfg.connectionPool.maxIdlePerHost;
    max_lifetime = cfg.connectionPool.maxLifetime;
    idle_timeout = cfg.connectionPool.idleTimeout;
    connection_timeout = cfg.connectionPool.connectionTimeout;
    dns_refresh_interval = cfg.connectionPool.dnsRefreshInterval;
  };

  serverSection = optionalAttrs' {
    http_port = cfg.server.httpPort;
    https_port = cfg.server.httpsPort;
    max_concurrent_requests = cfg.server.maxConcurrentRequests;
    request_timeout = cfg.server.requestTimeout;
  };

  loggingSection = optionalAttrs' {
    access_log_dir = cfg.logging.accessLogDir;
    app_log_dir = cfg.logging.appLogDir;
    access_log_enabled = cfg.logging.accessLogEnabled;
    log_level = cfg.logging.logLevel;
  };

  configFile = (pkgs.formats.yaml { }).generate "s3-hybrid-cache.yaml" (optionalAttrs' {
    server = if serverSection == { } then null else serverSection;
    cache = if cacheSection == { } then null else cacheSection;
    compression = if compressionSection == { } then null else compressionSection;
    connection_pool = if connectionPoolSection == { } then null else connectionPoolSection;
    logging = if loggingSection == { } then null else loggingSection;
  });

  nullOr =
    type:
    lib.mkOption {
      type = lib.types.nullOr type;
      default = null;
    };
  nullOrStr = nullOr lib.types.str;
  nullOrInt = nullOr lib.types.int;
  nullOrBool = nullOr lib.types.bool;
  nullOrFloat = nullOr lib.types.float;
in
{
  options.services.s3-hybrid-cache = {
    enable = lib.mkEnableOption "s3-hybrid-cache S3 caching proxy";

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.callPackage ../pkgs/s3-hybrid-cache.nix { };
      description = "The s3-hybrid-cache package to use.";
    };

    server = {
      httpPort = lib.mkOption {
        type = lib.types.nullOr lib.types.port;
        default = 80;
        description = "HTTP proxy port (caching enabled).";
      };
      httpsPort = lib.mkOption {
        type = lib.types.nullOr lib.types.port;
        default = null;
        description = "HTTPS passthrough port (no caching). Null to disable.";
      };
      maxConcurrentRequests = lib.mkOption {
        type = lib.types.nullOr lib.types.int;
        default = null;
        description = "Maximum number of concurrent requests.";
      };
      requestTimeout = nullOrStr // {
        description = "Request timeout, e.g. \"30s\".";
      };
    };

    cache = {
      cacheDir = lib.mkOption {
        type = lib.types.str;
        default = "/var/cache/s3-hybrid-cache";
        description = "Directory to store cached data.";
      };
      maxCacheSize = lib.mkOption {
        type = lib.types.int;
        default = 10737418240; # 10GB
        description = "Maximum disk cache size in bytes.";
      };
      ramCacheEnabled = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Enable in-memory (RAM) cache.";
      };
      maxRamCacheSize = lib.mkOption {
        type = lib.types.int;
        default = 268435456; # 256MB
        description = "Maximum RAM cache size in bytes.";
      };
      evictionAlgorithm = lib.mkOption {
        type = lib.types.enum [
          "lru"
          "tinylfu"
        ];
        default = "tinylfu";
        description = "Cache eviction algorithm.";
      };
      getTtl = lib.mkOption {
        type = lib.types.str;
        default = "315360000s";
        description = "TTL for cached GET responses. Use a very long value for immutable content.";
      };
      headTtl = lib.mkOption {
        type = lib.types.str;
        default = "315360000s";
        description = "TTL for cached HEAD responses. Set high to avoid revalidation overhead.";
      };
      putTtl = lib.mkOption {
        type = lib.types.str;
        default = "315360000s";
        description = "TTL for write-through cached objects.";
      };
      writeCacheEnabled = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Enable write-through caching for PUT operations.";
      };
      writeCachePercent = lib.mkOption {
        type = lib.types.float;
        default = 10.0;
        description = "Percentage of disk cache reserved for write-through cache (1-50).";
      };
      activelyRemoveCachedData = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Actively remove expired cache entries in the background. False = lazy expiration.";
      };
    };

    compression = {
      enabled = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Enable response compression. Disable if caching tarballs or already-compressed data.";
      };
      contentAware = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Skip compression for already-compressed formats (images, archives, etc.).";
      };
      threshold = lib.mkOption {
        type = lib.types.int;
        default = 4096;
        description = "Minimum response size in bytes before compression is applied.";
      };
      preferredAlgorithm = lib.mkOption {
        type = lib.types.enum [ "lz4" ];
        default = "lz4";
        description = "Compression algorithm to use.";
      };
    };

    connectionPool = {
      keepaliveEnabled = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Reuse TCP/TLS connections to S3.";
      };
      maxIdlePerHost = lib.mkOption {
        type = lib.types.int;
        default = 10;
        description = "Maximum idle connections per S3 host.";
      };
      maxLifetime = lib.mkOption {
        type = lib.types.str;
        default = "300s";
        description = "Maximum connection lifetime.";
      };
      idleTimeout = lib.mkOption {
        type = lib.types.str;
        default = "60s";
        description = "Idle connection timeout.";
      };
      connectionTimeout = lib.mkOption {
        type = lib.types.str;
        default = "10s";
        description = "Connection establishment timeout.";
      };
      dnsRefreshInterval = lib.mkOption {
        type = lib.types.str;
        default = "60s";
        description = "How often to refresh DNS for S3 endpoints.";
      };
    };

    logging = {
      accessLogDir = lib.mkOption {
        type = lib.types.str;
        default = "/var/log/s3-hybrid-cache/access";
        description = "Directory for access logs.";
      };
      appLogDir = lib.mkOption {
        type = lib.types.str;
        default = "/var/log/s3-hybrid-cache/app";
        description = "Directory for application logs.";
      };
      accessLogEnabled = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Enable access logging.";
      };
      logLevel = lib.mkOption {
        type = lib.types.enum [
          "error"
          "warn"
          "info"
          "debug"
          "trace"
        ];
        default = "info";
        description = "Application log level.";
      };
    };

    environmentFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = ''
        Path to a file containing environment variables for the service,
        e.g. AWS credentials. Passed as EnvironmentFile to systemd.
        Example contents:
          AWS_ACCESS_KEY_ID=...
          AWS_SECRET_ACCESS_KEY=...
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.services.s3-hybrid-cache = {
      description = "s3-hybrid-cache S3 caching proxy";
      wantedBy = [ "multi-user.target" ];
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];

      serviceConfig = {
        ExecStart = "${cfg.package}/bin/s3-proxy -c ${configFile}";
        Restart = "always";
        RestartSec = "5s";
        StateDirectory = "s3-hybrid-cache";
        LogsDirectory = "s3-hybrid-cache";
        DynamicUser = true;
      }
      // lib.optionalAttrs (cfg.environmentFile != null) {
        EnvironmentFile = cfg.environmentFile;
      };
    };
  };
}
