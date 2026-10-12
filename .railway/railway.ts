import { defineRailway, github, group, postgres, project, service, volume } from "railway/iac";

const GITHUB_REPO = "LordFitoi/exvia";
const BACKEND_DOMAIN = "exvia.up.railway.app";
const DATABASE_REGION = "us-west2";

export default defineRailway(() => {
  const db = postgres("Postgres", { region: DATABASE_REGION });
  // postgres() defaults to a plain image; the live database has none set and
  // changing it would redeploy the database.
  db.source = undefined;
  db.networking = { privateNetworkEndpoint: "postgres", tcpProxies: { "5432": {} } };

  const dbVolume = volume("postgres-volume", {
    region: DATABASE_REGION,
    sizeMB: 5000,
    allowOnlineResize: true,
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  });

  const server = service("Server", {
    source: github(GITHUB_REPO, { branch: "main", checkSuites: false }),
    build: { builder: "RAILPACK" },
    preDeploy: "python manage.py migrate",
    start: "python manage.py collectstatic --noinput && gunicorn config.wsgi",
    replicas: { [DATABASE_REGION]: 1 },
    networking: {
      privateNetworkEndpoint: "server",
      serviceDomains: { [BACKEND_DOMAIN]: {} },
    },
    env: {
      DISABLE_COLLECTSTATIC: "1",
      PORT: "8000",
      PGDATABASE: db.env.PGDATABASE,
      PGUSER: db.env.PGUSER,
      PGPASSWORD: db.env.PGPASSWORD,
      PGHOST: db.env.PGHOST,
      PGPORT: db.env.PGPORT,
    },
  });

  const frontend = service("frontend", {
    source: github(GITHUB_REPO, { branch: "main", rootDirectory: "frontend" }),
    build: { builder: "RAILPACK", buildCommand: "pnpm build" },
    start: "pnpm start",
  });

  return project("Exvia", {
    resources: [dbVolume, group("Django", [server, db]), frontend],
  });
});
