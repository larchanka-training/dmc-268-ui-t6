# DMC-268 UI (Team 6)

Vite + React + TypeScript frontend for DMC-268 Team 6.

## Setup & Run

```bash
npm install
npm run dev
```

## CI/CD

GitHub Actions builds a Docker image, scans it, pushes to GHCR, and deploys to Hetzner staging with a `/health` check and automatic rollback. Design and secrets: [docs/CICD.md](docs/CICD.md). Staging VM is provisioned via Terraform in the [API repository](https://github.com/larchanka-training/dmc-268-api-t6) (`terraform/ui-staging/`).
