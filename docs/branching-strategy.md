# Branching Strategy

ActionsCoreLib aplica reglas de validación por rama de forma automática. El tipo de rama determina qué entornos puede targetear un deploy, qué stages se habilitan, y qué excepciones existen para emergencias. Este documento es la referencia completa del modelo.

---

## Tipos de rama (`BranchType`)

| `BranchType` | Patrón de nombre | Descripción |
|---|---|---|
| `master` | `master` / `main` | Rama principal de producción |
| `develop` | `develop` | Rama de integración continua |
| `release` | `release/*` | Rama de estabilización pre-release |
| `feature` | `feature/*` | Ramas de desarrollo activo |
| `hotfix` | `hotfix/*` | Correcciones urgentes que siguen el proceso normal |
| `hotfixEmergency` | `hotfix-emergency/*` | Hotfix con excepción explícita de stages obligatorios |
| `pullRequest` | PR hacia cualquier rama | Pull requests — solo lectura, sin deploy |

El `BranchDetector` detecta el tipo de rama en tiempo de ejecución comparando `GITHUB_REF` y `GITHUB_HEAD_REF` contra estos patrones.

---

## Modelos de flujo soportados

ActionsCoreLib soporta los dos modelos de branching más usados. La distinción no requiere configuración — el modelo se infiere del conjunto de ramas que el repo usa.

### Modelo Gitflow

El flujo de trabajo estándar para equipos con ciclos de release definidos.

```
feature/xxx  ──► develop ──► release/1.2 ──► master
                  │               │              │
                  ▼               ▼              ▼
                 DEV           QA / STAGING     PROD
```

| Rama | Deploy target permitido | Stages activos |
|---|---|---|
| `feature/*` | Sin restricción (plan-only recomendado) | plan, checkov, linter |
| `develop` | `dev` únicamente | plan, checkov, linter, deploy |
| `release/*` | `qa`, `staging` únicamente | plan, checkov, linter, deploy |
| `master` | `prod` únicamente | plan, checkov, linter, deploy, release |

### Modelo Trunk-based

Para infraestructura o servicios que despliegan directamente desde `main`.

```
feature/xxx  ──► main
                  │
                  ▼
                 PROD  (solo rama main puede desplegar)
```

En trunk-based, solo `master`/`main` tiene el stage `deploy` habilitado. Las ramas `feature` solo corren validaciones (plan, checkov, linter) — nunca despliegan.

---

## Regla rama → entorno

Esta tabla define los entornos permitidos por tipo de rama. ActionsCoreLib lanza `ACCOUNT_BRANCH_MISMATCH` si el `deploy.environment` del stage no coincide.

| Rama | Entornos permitidos | Entornos prohibidos |
|---|---|---|
| `develop` | `dev` | `qa`, `staging`, `prod` |
| `release/*` | `qa`, `staging` | `dev`, `prod` |
| `master` | `prod` | `dev`, `qa`, `staging` |
| `feature/*` | sin restricción | — |
| `hotfix/*` | sin restricción | — |
| `hotfixEmergency/*` | sin restricción | — |
| `pullRequest` | sin restricción | — |

> Las ramas sin restricción pueden declarar cualquier entorno — útil para plans de validación (`feature/fix-networking` hace un plan contra `dev` para verificar). En la práctica, los plans en feature branches no despliegan.

### Fallback automático de entorno

Si el stage `deploy` no declara `deploy.environment`, ActionsCoreLib deriva el entorno de la rama actual:

| Rama | Entorno derivado |
|---|---|
| `master` | `prod` |
| `release/*` | `staging` |
| `develop` | `dev` |
| Otras | — (se requiere `environment` explícito) |

```yaml
# Explicit — siempre correcto
- name: deploy
  deploy:
    environment: prod
  commands:
    - terragrunt run-all apply tfplan.binary

# Implicit — se resuelve desde la rama en ejecución
- name: deploy
  deploy: {}
  commands:
    - terragrunt run-all apply tfplan.binary
```

---

## Entornos disponibles (`Environment`)

| Valor | Uso típico |
|---|---|
| `dev` | Entorno de desarrollo continuo, rama `develop` |
| `qa` | Quality assurance, rama `release/*` |
| `staging` | Pre-producción, rama `release/*` |
| `prod` | Producción, rama `master` |

---

## Stages habilitados por tipo de proyecto y rama

### `type: terraform`

| Stage | master | release | develop | feature | pull_request |
|---|---|---|---|---|---|
| `plan` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `checkov` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `linter` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `deploy` | ✓ | ✓ | ✓ | — | — |
| `release` (git tag) | ✓ (requerido) | — | — | — | — |

### `type: app`

| Stage | master | develop | pull_request | feature |
|---|---|---|---|---|
| `compile` | ✓ | ✓ | ✓ | ✓ |
| `unit_test` | ✓ | ✓ | ✓ | ✓ |
| `linter` | ✓ | ✓ | ✓ | ✓ |
| `sonarqube` | ✓ | ✓ | ✓ | ✓ |
| `trivy` | ✓ | ✓ | ✓ | ✓ |
| `publish` | ✓ | ✓ | ✓ (pre-release) | — |
| `release` | ✓ (promote prod) | ✓ (snapshot dev) | ✓ (qa) | — |

---

## Hotfix — flujo de emergencia

### `hotfix/*` — proceso normal

Una rama `hotfix/fix-critical-bug` sigue el proceso estándar completo: todos los stages obligatorios se ejecutan sin excepción. Solo se diferencia de `feature` en semántica — ActionsCoreLib la trata igual.

### `hotfixEmergency/*` — excepción autorizada

Una rama `hotfix-emergency/CVE-2024-xxxx` activa la excepción de emergencia. Permite omitir stages de análisis (linter, sonarqube, semgrep, checkov) si están en la lista `skippable_stages` definida en `platform-config/hotfix-policy.yaml`.

```yaml
# platform-config/hotfix-policy.yaml
allowed_repos:
  - platform-infra-base    # solo repos listados aquí pueden usar la excepción
skippable_stages:
  - linter
  - semgrep
  - sonarqube
  - checkov
```

**Restricciones de seguridad:**
- El repo debe estar explícitamente en `allowed_repos`. Si no está, ActionsCoreLib lanza `HOTFIX_EXCEPTION_NOT_ALLOWED`.
- `Trivy` y `unit_test` **nunca** son omisibles — no aparecen en `skippable_stages`.
- La excepción requiere que el admin apruebe el repo en `platform-config` de antemano.

```
Flujo hotfix-emergency:
  hotfix-emergency/fix-rce
    │
    ├── unit_test   ← siempre corre
    ├── trivy       ← siempre corre
    ├── (linter)    ← omitido si en skippable_stages y repo autorizado
    ├── (sonarqube) ← omitido
    ├── (checkov)   ← omitido
    ├── publish     ← siempre corre
    └── release     ← siempre corre
```

---

## Reglas de validación por stage y rama

### Stage `plan` (type: terraform)

| Validación | Aplica en | Error |
|---|---|---|
| Ningún comando puede contener `apply` | todas las ramas | `PLAN_COMMAND_FORBIDDEN` |
| Ningún comando puede contener `destroy` | todas las ramas | `PLAN_COMMAND_FORBIDDEN` |
| Ningún comando puede contener `force-unlock` | todas las ramas | `PLAN_COMMAND_FORBIDDEN` |
| Al menos un comando requerido | todas las ramas | `MISSING_STAGE_COMMANDS` |
| `deploy.environment` debe ser válido para la rama | develop, release, master | `ACCOUNT_BRANCH_MISMATCH` |

### Stage `deploy` (type: terraform)

| Validación | Aplica en | Error |
|---|---|---|
| Requiere bloque `deploy:` | todas las ramas | `MISSING_DEPLOY_ENV` |
| Al menos un comando requerido | todas las ramas | `MISSING_STAGE_COMMANDS` |
| Ningún comando puede contener `plan` | todas las ramas | `DEPLOY_PLAN_COMMAND_FORBIDDEN` |
| Todo `apply` debe referenciar archivo de plan | todas las ramas | `DEPLOY_MISSING_PLAN_REF` |
| `deploy.environment` debe coincidir con la rama | develop, release, master | `ACCOUNT_BRANCH_MISMATCH` |

### Stage `deploy` (type: app / deploy / generic)

| Validación | Aplica en | Error |
|---|---|---|
| Requiere bloque `deploy:` | todas las ramas | `MISSING_DEPLOY_ENV` |
| `deploy.environment` debe coincidir con la rama | develop, release, master | `ACCOUNT_BRANCH_MISMATCH` |

---

## Códigos de error relacionados con ramas

| Código | Causa | Solución |
|---|---|---|
| `ACCOUNT_BRANCH_MISMATCH` | `deploy.environment` no corresponde a la rama actual | Revisar la tabla rama → entorno. ¿Estás en `develop` intentando desplegar a `prod`? |
| `MISSING_DEPLOY_ENV` | Stage `deploy` sin bloque `deploy:` | Agregar `deploy: { environment: dev }` o `deploy: {}` para fallback automático |
| `INVALID_DEPLOY_ENV` | `deploy.environment` no es un valor válido del enum | Valores válidos: `dev`, `qa`, `staging`, `prod` |
| `PLAN_COMMAND_FORBIDDEN` | Stage `plan` contiene `apply`, `destroy` o `force-unlock` | Mover esos comandos al stage `deploy` |
| `DEPLOY_PLAN_COMMAND_FORBIDDEN` | Stage `deploy` contiene `plan` | Mover el plan al stage `plan` o `pre_deploy` |
| `DEPLOY_MISSING_PLAN_REF` | `terragrunt apply` sin archivo de plan | Usar `terragrunt apply tfplan.binary` (nunca bare apply) |
| `HOTFIX_EXCEPTION_NOT_ALLOWED` | Repo no está en `allowed_repos` de hotfix-policy | Agregar el repo a `platform-config/hotfix-policy.yaml` antes del hotfix |

---

## Cómo `BranchDetector` determina el tipo

`BranchDetector` usa las variables de entorno estándar de GitHub Actions:

```
GITHUB_REF         = refs/heads/develop
GITHUB_HEAD_REF    = feature/my-feature  (solo en pull_request events)
GITHUB_EVENT_NAME  = push | pull_request | workflow_dispatch
```

Orden de evaluación:
1. Si `GITHUB_EVENT_NAME == pull_request` → `BranchType.PULL_REQUEST`
2. Si `GITHUB_REF` termina en `/master` o `/main` → `BranchType.MASTER`
3. Si `GITHUB_REF` termina en `/develop` → `BranchType.DEVELOP`
4. Si `GITHUB_REF` contiene `/release/` → `BranchType.RELEASE`
5. Si `GITHUB_REF` contiene `/hotfix-emergency/` → `BranchType.HOTFIX_EMERGENCY`
6. Si `GITHUB_REF` contiene `/hotfix/` → `BranchType.HOTFIX`
7. Default → `BranchType.FEATURE`

---

## Ejemplos completos por rama

### Gitflow — `develop` deploying to `dev`

```yaml
# action.yaml en un repo terraform, rama develop
stages:
  - name: plan
    deploy:
      environment: dev     # correcto para develop
    commands:
      - terragrunt run-all plan --terragrunt-non-interactive -out tfplan.binary

  - name: deploy
    deploy:
      environment: dev     # correcto — develop solo puede targetear dev
    commands:
      - terragrunt run-all apply tfplan.binary
```

### Gitflow — `release/1.2` deploying to `staging`

```yaml
stages:
  - name: plan
    deploy:
      environment: staging  # correcto para release/*
    commands:
      - terragrunt run-all plan --terragrunt-non-interactive -out tfplan.binary

  - name: deploy
    deploy:
      environment: staging  # también válido: environment: qa
    commands:
      - terragrunt run-all apply tfplan.binary
```

### Trunk-based — `master` deploying to `prod`

```yaml
stages:
  - name: plan
    commands:
      - terragrunt run-all plan --terragrunt-non-interactive -out tfplan.binary
    # sin deploy.environment → no se valida branch-env en el plan

  - name: deploy
    deploy:
      environment: prod   # correcto para master
      # o simplemente: deploy: {}  (fallback automático a prod)
    commands:
      - terragrunt run-all apply tfplan.binary

  - name: release
```

### Feature branch — plan sin deploy

```yaml
# En feature branches el plan corre para validar
# pero no hay stage deploy habilitado en TerraformWorkflow
stages:
  - name: plan
    commands:
      - terragrunt run-all plan --terragrunt-non-interactive

  - name: checkov
    checkov:
      framework: terraform
```
