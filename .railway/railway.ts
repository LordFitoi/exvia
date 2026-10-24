import { defineRailway, github, group, postgres, preserve, project, redis, service, volume } from "railway/iac";

const GITHUB_REPO = "LordFitoi/exvia";
const APP_DOMAIN = "exvia.up.railway.app";
const BACKEND_PRIVATE_URL = "http://server.railway.internal:8000";
const DATABASE_REGION = "us-west2";
const MEDIA_MOUNT_PATH = "/data/media";

export default defineRailway(() => {
  const db = postgres("Postgres", { region: DATABASE_REGION });
  // postgres() defaults to a plain image; the live database has none set and
  // changing it would redeploy the database.
  db.source = undefined;
  db.networking = { privateNetworkEndpoint: "postgres", tcpProxies: { "5432": {} } };

  // Backs the Channels layer so WebSocket messages reach every Server replica.
  // Nothing in it must survive a restart, so it has no volume.
  const cache = redis("Redis", { region: DATABASE_REGION });
  cache.networking = { privateNetworkEndpoint: "redis" };

  const dbVolume = volume("postgres-volume", {
    region: DATABASE_REGION,
    sizeMB: 5000,
    allowOnlineResize: true,
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  });

  // Uploaded images (avatars, clan images, notice attachments). The container
  // disk is wiped on every deploy, so they live on a volume mounted at MEDIA_ROOT.
  const mediaVolume = volume("media-volume", {
    region: DATABASE_REGION,
    sizeMB: 5000,
    allowOnlineResize: true,
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  });

  const server = service("Server", {
    source: github(GITHUB_REPO, { branch: "main", checkSuites: false }),
    build: { builder: "RAILPACK" },
    preDeploy: "python manage.py migrate",
    start: "python manage.py collectstatic --noinput && uvicorn config.asgi:application --host 0.0.0.0 --port $PORT",
    replicas: { [DATABASE_REGION]: 1 },
    networking: { privateNetworkEndpoint: "server" },
    volumeMounts: { [MEDIA_MOUNT_PATH]: mediaVolume },
    env: {
      DISABLE_COLLECTSTATIC: "1",
      PORT: "8000",
      MEDIA_ROOT: MEDIA_MOUNT_PATH,
      PGDATABASE: db.env.PGDATABASE,
      PGUSER: db.env.PGUSER,
      PGPASSWORD: db.env.PGPASSWORD,
      PGHOST: db.env.PGHOST,
      PGPORT: db.env.PGPORT,
      REDIS_URL: cache.env.REDIS_URL,
    },
  });

  const frontend = service("frontend", {
    source: github(GITHUB_REPO, { branch: "main", rootDirectory: "frontend" }),
    build: { builder: "RAILPACK", buildCommand: "pnpm build" },
    start: "pnpm start",
    networking: { serviceDomains: { [APP_DOMAIN]: {} } },
    env: {
      BACKEND_URL: BACKEND_PRIVATE_URL,
      // Link previews need absolute URLs, so the app has to know its own public address.
      SITE_URL: `https://${APP_DOMAIN}`,
      // Mapbox public token, set once in the Railway dashboard; preserve() keeps it on apply.
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: preserve(),
    },
  });

  return project("Exvia", {
    resources: [dbVolume, mediaVolume, group("Django", [server, db, cache]), frontend],
  });
});
