# Terraform Workflow

ActionsCoreLib tiene soporte nativo para proyectos Terraform/Terragrunt a través del tipo `terraform`. Este documento describe los stages disponibles, las validaciones de seguridad que aplica ActionsCoreLib automáticamente, y la política de aprobación de deploys.

## Tipo de proyecto

```yaml
# action.yaml
version: "1.0"
type: terraform
```

Con `type: terraform`, ActionsCoreLib activa el `TerraformWorkflow`, que habilita los stages `plan`, `checkov`, `deploy` y `release`.

---

## Stages

### `plan`

Ejecuta comandos de planificación. ActionsCoreLib valida que ningún comando contenga los subcomandos `apply`, `destroy` ni `force-unlock` — estos pertenecen exclusivamente al stage `deploy`.

```yaml
- name: plan
  commands:
    - terragrunt init -input=false
    - terragrunt plan -input=false -out=tfplan.binary
    - terragrunt show -json tfplan.binary > tfplan.json
  summary:
    title: "Terraform Plan"
    command: terragrunt show -no-color tfplan.binary
    format: diff
```

El campo `summary` escribe el output del plan al **GitHub Job Summary** del run, para que el aprobador pueda revisar los cambios antes de disparar el deploy.

**Errores que lanza ActionsCoreLib:**
| Código | Causa |
|--------|-------|
| `PLAN_COMMAND_FORBIDDEN` | Un comando del stage contiene `apply`, `destroy` o `force-unlock` |
| `MISSING_STAGE_COMMANDS` | El stage no tiene ningún comando |

---

### `checkov`

Escanea el plan JSON con Checkov en lugar de escanear el directorio. Requiere que el stage `plan` haya generado `tfplan.json` previamente en el mismo runner.

```yaml
- name: checkov
  checkov:
    framework: terraform_plan
    planFile: tfplan.json   # default si se omite
```

Cuando `framework: terraform_plan`, ActionsCoreLib llama a Checkov con `-f tfplan.json` en lugar de `-d .`. Esto permite detectar problemas de seguridad sobre el plan exacto que se va a aplicar.

---

### `deploy`

Aplica el plan. ActionsCoreLib valida tres cosas para `type: terraform`:

1. **No puede contener `plan`** — los comandos de plan pertenecen al stage anterior.
2. **Todo `apply` debe referenciar un archivo de plan** — no se permite `terragrunt apply` ni `terragrunt apply -auto-approve` sin un argumento de archivo. Esto previene que el deploy re-planee en el spot y aplique cambios que no pasaron por revisión.
3. **El entorno declarado debe coincidir con la rama** — `develop` solo puede targetear `dev`, `release/*` solo `qa`/`staging`, `master` solo `prod`. Ver [Validación rama → entorno](#validación-rama--entorno).

```yaml
- name: deploy
  deploy:
    environment: staging    # rama release/* → staging o qa (correcto)
    # environment: prod     # ERROR en release/*: ACCOUNT_BRANCH_MISMATCH
    accounts:               # opcional — IDs o nombres de cuentas AWS para logging
      - "123456789012"
  commands:
    - terragrunt run-all apply tfplan.binary   # correcto: referencia el plan
    # - terragrunt apply               # ERROR: bare apply prohibido
    # - terragrunt apply -auto-approve # ERROR: sin archivo de plan
```

**Errores que lanza ActionsCoreLib:**
| Código | Causa |
|--------|-------|
| `DEPLOY_PLAN_COMMAND_FORBIDDEN` | Un comando del stage contiene `plan` |
| `DEPLOY_MISSING_PLAN_REF` | Un `apply` no tiene argumento de archivo de plan |
| `MISSING_STAGE_COMMANDS` | El stage no tiene ningún comando |
| `MISSING_DEPLOY_ENV` | Falta el bloque `deploy:` |
| `ACCOUNT_BRANCH_MISMATCH` | `deploy.environment` no corresponde a la rama actual |
| `INVALID_DEPLOY_ENV` | `deploy.environment` no es un valor válido (`dev`, `qa`, `staging`, `prod`) |

---

## Validación rama → entorno

ActionsCoreLib enforcea la correspondencia entre rama git y entorno de destino en los stages `plan` y `deploy`. Esta validación previene que un deploy accidental desde `develop` llegue a producción.

### Tabla de permisos

| Rama | Entorno permitido | Entorno prohibido |
|------|-------------------|-------------------|
| `develop` | `dev` | `qa`, `staging`, `prod` |
| `release/*` | `qa`, `staging` | `dev`, `prod` |
| `master` / `main` | `prod` | `dev`, `qa`, `staging` |
| `feature/*` | sin restricción | — |
| `hotfix/*` | sin restricción | — |
| `pullRequest` | sin restricción | — |

### Fallback automático

Si `deploy.environment` se omite (o el bloque `deploy: {}` está vacío), ActionsCoreLib deriva el entorno desde la rama:

| Rama | Entorno derivado |
|------|-----------------|
| `master` | `prod` |
| `release/*` | `staging` |
| `develop` | `dev` |

```yaml
# Configuración mínima válida — entorno se deriva de la rama
- name: deploy
  deploy: {}
  commands:
    - terragrunt run-all apply tfplan.binary
```

### Campo `accounts` (opcional)

Permite documentar las cuentas AWS que recibirán el deploy. ActionsCoreLib las registra en el log para trazabilidad pero no hace validación adicional sobre los IDs.

```yaml
- name: deploy
  deploy:
    environment: prod
    accounts:
      - "174917982419"   # management
      - "987654321098"   # prod workloads
```

### Validación en `plan`

El stage `plan` también valida la correspondencia rama → entorno si se declara `deploy.environment`. Esto permite detectar misconfiguraciones antes de que lleguen al stage de apply:

```yaml
- name: plan
  deploy:
    environment: staging   # si la rama es develop, falla aquí con ACCOUNT_BRANCH_MISMATCH
  commands:
    - terragrunt run-all plan --terragrunt-non-interactive -out tfplan.binary
```

---

### `release`

Crea el tag de versión semántica en el repo. Se activa automáticamente en `main` si el stage `plan-checkov` pasó.

```yaml
- name: release
```

No requiere comandos — ActionsCoreLib gestiona el tagging internamente usando el campo `metadata.version` del `action.yaml`.

---

## Seguridad del plan binary

Los archivos `tfplan.binary` y `tfplan.json` pueden contener valores sensibles (contraseñas, connection strings) que Terraform resuelve antes de planear. Por este motivo **no se suben como artifacts** entre jobs.

En cambio, el flujo de `deploy.yml` ejecuta plan y deploy como steps consecutivos dentro del mismo job, compartiendo el filesystem efímero del runner:

```
plan-and-deploy job (un solo runner)
  └── step: Plan    → escribe tfplan.binary en $GITHUB_WORKSPACE
  └── step: Deploy  → lee tfplan.binary del mismo $GITHUB_WORKSPACE
```

El runner y su filesystem se destruyen al terminar el job. El binario nunca sale del runner.

---

## Stage `setup-terragrunt`

Descarga e instala Terragrunt en el runner. La versión se obtiene de `dropstat/platform-config/tool-versions.yaml` — no está hardcodeada en el workflow.

```yaml
- uses: dropstat/ActionsCoreLib@main
  with:
    stage: setup-terragrunt
```

No requiere ningún input. ActionsCoreLib descarga el binario de las GitHub Releases de Terragrunt, lo instala en `/usr/local/bin/terragrunt` y le asigna permisos de ejecución.

Para actualizar la versión de Terragrunt, editar `tool-versions.yaml` en `platform-config` y mergear — sin modificar ningún workflow.

---

## Política de aprobación de deploys

### Por qué está en platform-config y no en `action.yaml`

La política de quién puede aprobar un deploy está definida en `dropstat/platform-config/deploy-policy.yaml`, **no en el `action.yaml` del proyecto**. Si estuviera en el repo del developer, cualquier developer podría editarla y autorizarse a sí mismo.

### Mecanismo dual

ActionsCoreLib selecciona automáticamente el modo de verificación según los secrets disponibles:

**Modo A — Teams (requiere `ORG_READ_TOKEN`):**
Verifica membresía activa del actor en los GitHub teams configurados en `deploy-policy.yaml`. Requiere un PAT con scope `read:org`.

**Modo B — Permiso de repo (solo `GITHUB_TOKEN`):**
Verifica el nivel de permiso del colaborador en el repo:

```
GET /repos/{owner}/{repo}/collaborators/{username}/permission
→ { "permission": "admin" | "maintain" | "write" | "read" | "none" }
```

Solo un owner de la org o admin del repo puede elevar el permiso de alguien a `maintain` o `admin` — un developer no puede hacerlo por sí mismo.

### Dónde se configura la política

**Archivo:** `dropstat/platform-config/deploy-policy.yaml`

```yaml
terraform:
  teams:
    - platform-team
  users:
    - mondrias
  min_permission: maintain
```

Para cambiar la política hay que hacer un PR en `platform-config`. El cambio aplica inmediatamente en la próxima ejecución de cualquier pipeline — sin reconstruir ActionsCoreLib.

Ver `docs/platform-config.md` y `docs/deploy-approval.md` para detalles completos.

### Cómo fluye al workflow

1. El job `config` en `deploy.yml` ejecuta `ActionsCoreLib@main` con `stage: config`.
2. ActionsCoreLib lee `platform-config` y emite:
   ```
   deploy_approver_teams = "platform-team"
   deploy_approver_users = "mondrias"
   deploy_min_permission = "maintain"
   ```
3. El job `validate` ejecuta dos stages:
   - `validate-confirm` — verifica que `confirm == "deploy"`
   - `validate-approver` — verifica que el actor tiene permiso según la política
4. Si alguno falla, el deploy no corre.

### Gestión de acceso

Para autorizar a alguien (Modo B — sin teams):
- UI: repo → **Settings** → **Collaborators and teams** → cambiar rol a `Maintain`
- CLI: `gh api repos/dropstat/terraform-null/collaborators/<username> -X PUT -f permission=maintain`

Para autorizar via teams (Modo A): agregar el username a `deploy-policy.yaml` en `platform-config` o al team de GitHub.

Para revocar: bajar el rol a `Write` o menos, o quitar del team.

### Comportamiento por tipo de proyecto

| `type` en action.yaml | Configuración en deploy-policy.yaml |
|-----------------------|-------------------------------------|
| `terraform`           | `min_permission: maintain` (default) |
| `infra`               | `min_permission: maintain` (default) |
| `deploy`              | configurable |
| `app`, `library`, etc. | sin restricción |

Tipos sin entrada en `deploy-policy.yaml` no bloquean el deploy.
