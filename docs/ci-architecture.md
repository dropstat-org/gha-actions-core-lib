# CI/CD Architecture

## Overview

The pipeline follows a three-layer model where each layer has one responsibility:

```
ci.yml           → WHEN (permissions only — triggers managed at org level)
action.yaml      → WHAT (commands, environments, tools)
actions-core-lib → HOW (logic, security gates, artifact management)
```

---

## Habilitar el pipeline en un nuevo repo

Sigue estos pasos en orden. Un repo necesita exactamente dos archivos para unirse al pipeline centralizado.

### Paso 1 — Crear `action.yaml` en la raíz del repo

Elige la plantilla según el tipo de repo:

**App / Library / Generic**
```yaml
version: "1.0"
type: app          # app | library | generic

metadata:
  projectId: my-project   # nombre del producto/dominio
  serviceId: my-service   # nombre del servicio
  version: "1.0.0"

tools:
  node: "20"       # versión del runtime principal

stages:
  - name: compile
  - name: unit_test
  - name: trivy
  - name: publish
  - name: release
```

**Terraform**
```yaml
version: "1.0"
type: terraform

metadata:
  projectId: my-project
  serviceId: my-infra
  version: "1.0.0"

tools:
  terraform:  "1.7.5"
  terragrunt: "0.55.18"

stages:
  - name: plan
    commands:
      - terragrunt run-all plan --terragrunt-working-dir management/orgs --terragrunt-parallelism 1
  - name: checkov_tf
  - name: deploy
    deploy:
      environment: prod
    commands:
      - terragrunt run-all apply --terragrunt-working-dir management/orgs --terragrunt-parallelism 1 -auto-approve
```

**Generic con comandos personalizados**
```yaml
version: "1.0"
type: generic

metadata:
  projectId: my-project
  serviceId: my-service
  version: "1.0.0"

stages:
  - name: generic
    commands:
      - echo "mi comando personalizado"
      - npm run validate
```

> **Stages disponibles:** `compile` · `unit_test` · `linter` · `semgrep` · `sonarqube` · `trivy` · `checkov` · `checkov_tf` · `plan` · `publish` · `pre_deploy` · `deploy` · `post_deploy` · `release` · `generic`

---

### Paso 2 — Crear `.github/workflows/ci.yml`

Este archivo es **idéntico para todos los repos** (solo el comentario de tipo varía).
Puedes generarlo automáticamente o crearlo a mano:

```yaml
name: CI

# Triggers - branch CI is managed centrally via the org ruleset "Required CI workflow".
# To add/remove branches: github.com/organizations/dropstat-org/settings/rules
# This file only enables manual runs and declares the permissions this repo needs.
on:
  workflow_dispatch:

# Permissions
# GitHub validates ALL permissions declared by ANY job in the called reusable workflow
# at startup - even jobs that will be skipped at runtime for this repo type.
# All four permissions must be present or the workflow fails with startup_failure.
# contents: write is required because the release job in the called workflow declares it,
# even though this repo may have no release stage.
permissions:
  id-token:        write    # OIDC tokens - plan/deploy jobs in called workflow
  contents:        write    # release job in called workflow requires write
  packages:        write    # publish/deploy jobs in called workflow
  security-events: write    # semgrep/trivy SARIF upload in called workflow


# Pipeline
# What runs is driven by action.yaml.
# Do not add jobs here -- put logic in action.yaml or the library.
jobs:
  pipeline:
    uses: dropstat-org/gha-actions-core-lib/.github/workflows/actions-core-lib.yml@main
    secrets: inherit
```

**Generarlo automáticamente** (si el repo está clonado bajo `C:\dropStat`):
```powershell
cd C:\dropStat
python patch-ci-workflows.py --dry-run   # preview
python patch-ci-workflows.py             # aplica y pushea
```

---

### Paso 3 — Verificar que CI arranca

Haz un push a cualquier rama con nombre válido o dispara un run manual:
```
github.com/dropstat-org/<repo>/actions → Run workflow
```

El primer job que debe aparecer es **Config**. Si ves `startup_failure` sin ningún job, revisa la sección [Troubleshooting](#troubleshooting).

---

### Paso 4 — (Opcional) Proteger la rama principal

El org ruleset **Required CI workflow** ya exige que CI pase antes de mergear a `main`, `develop`, `feature/**`, `release/**` y `hotfix/**`. No hay que configurar nada adicional en el repo.

---

## Branch trigger management (org level)

Branch CI is **not** configured in individual `ci.yml` files. It is managed centrally via
two GitHub org rulesets:

### Required CI workflow (id: 16774808)

Automatically triggers `actions-core-lib.yml` on every push/PR to matching branches
across all org repos (except `gha-actions-core-lib`, `gha-actions-config`, `.github`).

| Branches that trigger CI |
|---|
| `main` |
| `develop` |
| `feature/**` |
| `release/**` |
| `hotfix/**` |

To change which branches trigger CI:
```
github.com/organizations/dropstat-org/settings/rules → "Required CI workflow"
```

This ruleset also enforces CI as a **required status check** before merging to any of these
branches — PRs cannot be merged until the CI check passes.

### Branch naming convention (id: 16854162)

Blocks creation of branches that don't match the naming pattern. Only these names are allowed:

| Pattern | Examples |
|---|---|
| `main` | `main` |
| `develop` | `develop` |
| `feature/.+` | `feature/JIRA-123`, `feature/add-login` |
| `release/.+` | `release/1.2.0`, `release/2026-Q2` |
| `hotfix/.+` | `hotfix/fix-auth-crash` |

Bypass: `OrganizationAdmin` can create branches outside the pattern if needed.

To update the pattern:
```
github.com/organizations/dropstat-org/settings/rules → "Branch naming convention"
```

---

## Three-layer model (reference)

### Layer 1 — `ci.yml` (consumer repo)

**What belongs here:** only `permissions:` + `uses:` call to the reusable workflow. Nothing else.

**What does NOT belong here:** branch lists, paths filters, job definitions, environment names,
tool versions, commands. All of that lives in `action.yaml` or this library.

### Layer 2 — `action.yaml` (consumer repo)

Defines **what** the pipeline does for this specific repo. Repo-specific stages, commands,
tools, environments, and metadata.

### Layer 3 — `actions-core-lib` (this repo)

Contains all pipeline logic: stage execution, artifact management, security gates, plan
extraction, SARIF uploads, release tagging, deploy approval flow.

Consumer repos never add job logic to `ci.yml` — they extend the pipeline only through
`action.yaml`.

---

## Two-repo structure of the library

| Repo | Visibilidad | Contenido |
|------|-------------|-----------|
| `dropstat-org/gha-actions-core-lib` | **Público** | `dist/bundle/index.js` (compilado), `action.yml`, workflows reutilizables, docs |
| `dropstat-org/gha-actions-core-lib-src` | **Privado** | Código fuente TypeScript, tests, build tools |

El fuente TypeScript vive en el repo privado. Cada push a `main` en el privado compila con
`@vercel/ncc` y pushea el bundle al repo público automáticamente vía `build.yml`.
Los consumer repos nunca ven el código fuente.

---

## Troubleshooting

### `startup_failure` — ningún job aparece

GitHub valida **todos** los `permissions:` de todos los jobs del workflow llamado al arranque,
incluso si esos jobs no van a correr. Si algún permiso del llamado supera el permiso del
caller, falla antes de provisionar ningún runner.

**Causa más común:** `ci.yml` con `contents: read` — el job `release` en `actions-core-lib.yml`
declara `permissions: contents: write`, lo que eleva el requerimiento para todos.

**Fix:** Asegúrate de que el `ci.yml` tiene los cuatro permisos en nivel `write`:

```yaml
permissions:
  id-token:        write
  contents:        write    # ← debe ser write, no read
  packages:        write
  security-events: write
```

Regenera con `python C:\dropStat\patch-ci-workflows.py` para garantizar el template correcto.

### Solo corre el job `Config` y nada más

El stage declarado en `action.yaml` no está habilitado. Causas posibles:

1. **Stage name incorrecto** — verifica que el nombre en `action.yaml` sea exactamente uno de los
   stages soportados (ver lista en Paso 1).
2. **Stage no permitido en esta rama** — algunos stages solo corren en `main`/`develop`.
3. **Dependencia fallida** — si `compile` falla, `unit_test`, `linter`, `trivy`, etc. se saltan.

### CI no se dispara al hacer push

Verifica que la rama sigue la convención de nombres. Solo arrancan CI las ramas:
`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`.

Ramas con nombres fuera del patrón (p. ej. `fix-bug`, `TEST-123`) no disparan CI y además
el ruleset **Branch naming convention** bloqueará su creación.

---

## Terraform specifics

### OIDC — `TERRAGRUNT_NON_INTERACTIVE`

The `plan` and `deploy` jobs in `actions-core-lib.yml` set these env vars:

```yaml
env:
  TF_IN_AUTOMATION: "true"
  TF_INPUT: "false"
  TERRAGRUNT_NON_INTERACTIVE: "true"
```

Without `TERRAGRUNT_NON_INTERACTIVE`, terragrunt prompts "include external dependencies? [y/N]"
during `run-all` commands (including the `show -json` step generated internally by PlanExtractor).
This causes the Node.js `exec.exec` call to block indefinitely.

### OIDC trust — `job_workflow_ref`

The AWS OIDC role (`GitHubActions-PlatformInfra`) trusts tokens where:
- `sub` = `repo:dropstat-org/aws-platform-deploy:*`
- `job_workflow_ref` = `dropstat-org/gha-actions-core-lib/.github/workflows/actions-core-lib.yml@refs/heads/main`

This means only pipelines running through this library can assume the role, even if someone
adds a custom workflow to the consumer repo.

---

## Updating all consumer `ci.yml` files

The script `C:\dropStat\patch-ci-workflows.py` regenerates `ci.yml` for all repos under
`C:\dropStat` based on their `action.yaml`.

```powershell
# Preview changes
python patch-ci-workflows.py --dry-run

# Apply and push
python patch-ci-workflows.py
```

Run it after any template change to propagate to all locally-cloned repos.
For repos not cloned locally, update via GitHub API or clone first.
