# Deployment

The app is deployed to the **e-INFRA CZ / CERIT-SC Kubernetes cloud**
(`dyn.cloud.e-infra.cz`) via a Helm chart, with images built by GitLab CI
and pushed to the CERIT Harbor registry (`cerit.io/v_gibas`).

## Topology

| Component        | Kind                    | Image                                  | Public host                                |
| ---------------- | ----------------------- | -------------------------------------- | ------------------------------------------ |
| Web (SPA)        | Deployment + nginx      | `marketplace-web`                      | `marketplace.dyn.cloud.e-infra.cz`         |
| API (Bun/Elysia) | Deployment              | `marketplace-api`                      | `marketplace-api.dyn.cloud.e-infra.cz`     |
| PostgreSQL 17    | CloudNativePG `Cluster` | `ghcr.io/cloudnative-pg/postgresql:17` | — (in-cluster)                             |
| Redis            | StatefulSet             | `redis:7-alpine`                       | — (in-cluster)                             |
| MinIO            | StatefulSet             | `minio/minio`                          | `marketplace-storage.dyn.cloud.e-infra.cz` |

`DATABASE_URL` is wired automatically from the CloudNativePG-generated secret
`marketplace-db-app` (`uri` key) — nothing to set by hand.

## Pipeline

`.gitlab-ci.yml` keeps the existing `install → lint → tests → e2e` jobs for all
branches/MRs, and adds two deploy-only stages:

- **build** — Kaniko builds `marketplace-api` and `marketplace-web`.
- **deploy** — `helm upgrade --install`.

These run **only on `master` or `deployment`**, and are chained off `install`
via `needs` (DAG) so **lint, tests and prettier never block a deploy**.

### Required CI/CD variables (Settings → CI/CD → Variables)

| Variable                  | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `HUB_REGISTRY_USER`       | Harbor robot/user name                               |
| `HARBOR_PASSWORD`         | Harbor password / robot token                        |
| `KUBECONFIG`              | File-type variable: kubeconfig for the namespace     |
| `VITE_TURNSTILE_SITE_KEY` | Public Turnstile site key (baked into the web build) |

## One-time namespace setup

1. Ensure the **CloudNativePG** operator is available (it is, on e-INFRA CZ).

2. Create the app secret (everything except the DB connection string):

   ```sh
   kubectl -n gibas-ns create secret generic marketplace-secrets \
     --from-literal=BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
     --from-literal=TURNSTILE_SECRET_KEY=<cloudflare-turnstile-secret> \
     --from-literal=MINIO_ROOT_USER=marketplace \
     --from-literal=MINIO_ROOT_PASSWORD=$(openssl rand -hex 16) \
     --from-literal=SMTP_HOST=<smtp-host> \
     --from-literal=SMTP_PORT=587 \
     --from-literal=SMTP_USER=<smtp-user> \
     --from-literal=SMTP_PASS=<smtp-pass> \
     --from-literal=EMAIL_FROM=noreply@marketplace.dyn.cloud.e-infra.cz
   ```

Then push to `master` or `deployment` and the pipeline deploys.

## Local sanity checks

```sh
helm lint ./charts/marketplace
helm template marketplace ./charts/marketplace --namespace gibas-ns | less
```

## Notes & gotchas

- **Cross-origin auth cookies.** Web and API are on different hosts, exactly
  like local dev (`:3000` / `:3001`), and CORS is already configured with
  `credentials: include`. For cookies to stick cross-site over HTTPS, Better
  Auth must emit `SameSite=None; Secure` cookies — verify in the Better Auth
  config if sessions don't persist after login.
- **Migrations & seed** run in the API container entrypoint on startup
  (`SEED_ON_START=true`; seed is idempotent upsert). Keep `api.replicaCount: 1`
  so they don't race.
- **SPA build output** is served from `.output/public`. If a future TanStack
  Start / Nitro upgrade changes that path, update `apps/web/Dockerfile`.
- **Postgres image.** If `ghcr.io` pulls are throttled on the cluster, switch
  `database.imageName` to the CERIT mirror (e.g. `cerit.io/cloudnative-pg/postgresql:17`).
