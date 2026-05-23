# Platform Config

ActionsCoreLib obtiene políticas de aprobación, configuración de seguridad y versiones de herramientas desde un repositorio de configuración de la organización. Esto permite actualizar políticas y versiones sin reconstruir ActionsCoreLib.

---

## Auto-detección de organización

ActionsCoreLib determina de qué organización y repositorio leer la configuración **de forma automática**, sin ninguna configuración adicional. Usa la variable de entorno `GITHUB_REPOSITORY_OWNER` que GitHub inyecta en todos los workflows.

```
Repo que corre el workflow:  dropstat/platform-infra
GITHUB_REPOSITORY_OWNER:    dropstat
→ fetcha configuración de:  https://raw.githubusercontent.com/dropstat/platform-config/main/
```

Esto significa que cualquier organización que adopte ActionsCoreLib usará **su propia** copia de `platform-config` automáticamente — sin editar el código de ActionsCoreLib.

### Override con `platform-config-repo`

Si el repo de configuración tiene un nombre distinto a `platform-config`, se puede sobreescribir con el input `platform-config-repo`:

```yaml
# En el Required Workflow de la organización (ActionsCoreLib.yml)
- uses: dropstat/ActionsCoreLib@main
  with:
    stage: config
    platform-config-repo: my-custom-config-repo
```

La URL resultante será `https://raw.githubusercontent.com/{GITHUB_REPOSITORY_OWNER}/{platform-config-repo}/main/`.

### Lógica de resolución

```
1. org  = GITHUB_REPOSITORY_OWNER  (ej: dropstat)
2. repo = input platform-config-repo  (default: platform-config)
3. URL  = https://raw.githubusercontent.com/{org}/{repo}/main/{file}
```

### Uso en múltiples organizaciones (fork)

Si una segunda organización (`my-company`) forkea o adopta ActionsCoreLib:

1. Crear `my-company/platform-config` con los mismos tres archivos YAML
2. Hacer fork o instalar ActionsCoreLib en `my-company`
3. Los workflows que corran en repos de `my-company` usarán `my-company/platform-config` automáticamente — sin cambiar nada en ActionsCoreLib

```
GITHUB_REPOSITORY_OWNER = my-company
→ fetcha: https://raw.githubusercontent.com/my-company/platform-config/main/
```

---

## Repositorio

**`{org}/platform-config`** — público, sin código ejecutable. Solo contiene tres archivos YAML que los administradores editan directamente.

```
platform-config/
├── deploy-policy.yaml    # quién puede aprobar deploys por tipo de proyecto
├── security-policy.yaml  # umbrales de severidad para Trivy, Checkov, Semgrep
└── tool-versions.yaml    # versiones de herramientas instaladas por ActionsCoreLib
```

ActionsCoreLib hace un fetch HTTP al inicio del proceso. Las respuestas se cachean en memoria — una sola petición por archivo por ejecución del runner.

Si el repositorio no está disponible o el fetch falla, ActionsCoreLib usa defaults internos y continúa. El pipeline no se bloquea por un fallo de red al cargar configuración.

---

## `deploy-policy.yaml`

Define quién puede aprobar deploys, por tipo de proyecto (`type` en `action.yaml`).

```yaml
terraform:
  teams:
    - platform-team
    - sre-team
  users:
    - mondrias
  min_permission: maintain

infra:
  teams:
    - platform-team
  users: []
  min_permission: maintain

deploy:
  teams:
    - devops-team
  users: []
  min_permission: write
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `teams` | `string[]` | Slugs de teams de GitHub. Un miembro activo de cualquiera de estos teams puede aprobar. |
| `users` | `string[]` | Usernames individuales con permiso explícito. |
| `min_permission` | `string` | Permiso mínimo de colaborador en el repo: `admin`, `maintain`, `write`. Usado como fallback si no hay `ORG_READ_TOKEN`. |

### Cómo aplica ActionsCoreLib la política

ActionsCoreLib selecciona el modo automáticamente según los secrets disponibles:

**Modo A — Teams (requiere `ORG_READ_TOKEN`):**
Si el secret `ORG_READ_TOKEN` está configurado, ActionsCoreLib verifica si el actor es miembro activo de alguno de los `teams` configurados, usando la API `/orgs/{org}/teams/{team}/memberships/{user}`.

**Modo B — Permiso de repo (solo `GITHUB_TOKEN`):**
Si `ORG_READ_TOKEN` no está disponible, ActionsCoreLib verifica el permiso del actor en el repo con `GET /repos/{owner}/{repo}/collaborators/{user}/permission` y lo compara contra `min_permission`.

En ambos modos, los `users` individuales siempre se chequean primero — si el actor está en la lista, pasa sin verificar teams ni permiso.

### Actualizar la política

1. Hacer PR en `platform-config` modificando `deploy-policy.yaml`.
2. Mergear a `main`.
3. El cambio toma efecto en la próxima ejecución de cualquier pipeline — sin reconstruir ActionsCoreLib.

---

## `security-policy.yaml`

Configura los umbrales de severidad y el comportamiento de `softFail` para los analizadores de seguridad.

```yaml
trivy:
  severity: CRITICAL,HIGH
  soft_fail: false

checkov:
  soft_fail: false

semgrep:
  soft_fail: false
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `severity` | `string` | (Solo Trivy) Severidades a reportar. Valores: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`. |
| `soft_fail` | `boolean` | Si `true`, el stage falla pero no bloquea el pipeline. Si `false`, un hallazgo detiene el pipeline. |

### Actualizar umbrales

Editar `security-policy.yaml` y mergear a `main`. El cambio aplica en la próxima ejecución.

Ejemplo — habilitar soft_fail en Trivy durante una migración:
```yaml
trivy:
  severity: CRITICAL,HIGH
  soft_fail: true   # temporal: no bloquea mientras se resuelven findings
```

---

## `tool-versions.yaml`

Versiones de las herramientas que ActionsCoreLib instala en los runners.

```yaml
sonarqube_scanner: 6.2.1.4610
trivy: 0.70.0
checkov: 3.2.527
semgrep: 1.162.0
terragrunt: 0.68.1
```

### Herramientas gestionadas

| Clave | Herramienta | Instalada por |
|-------|-------------|---------------|
| `sonarqube_scanner` | SonarQube Scanner CLI | stage `sonarqube` |
| `trivy` | Trivy (scanner de vulnerabilidades) | stage `trivy` |
| `checkov` | Checkov (scanner IaC) | stage `checkov` |
| `semgrep` | Semgrep (análisis estático) | stage `semgrep` |
| `terragrunt` | Terragrunt | stage `setup-terragrunt` |

### Actualizar una versión

1. Editar `tool-versions.yaml` con la nueva versión.
2. Hacer PR y mergear a `main`.
3. El cambio aplica en la próxima ejecución — todos los repos de la organización usarán la nueva versión sin modificar nada en sus pipelines.

---

## `PlatformConfigLoader` — API TypeScript

La clase `PlatformConfigLoader` en `src/config/PlatformConfigLoader.ts` expone tres métodos estáticos. Cada uno retorna una Promise que se resuelve la primera vez y se cachea para llamadas posteriores dentro del mismo proceso.

```typescript
import { PlatformConfigLoader } from '../../config/PlatformConfigLoader';

// Política de aprobación
const policies = await PlatformConfigLoader.deployPolicy();
const policy = policies['terraform'];
// → { teams: ['platform-team'], users: ['mondrias'], min_permission: 'maintain' }

// Política de seguridad
const security = await PlatformConfigLoader.securityPolicy();
security.trivy.severity  // 'CRITICAL,HIGH'
security.trivy.soft_fail // false

// Versiones de herramientas
const versions = await PlatformConfigLoader.toolVersions();
versions.trivy        // '0.70.0'
versions.terragrunt   // '0.68.1'
```

### Defaults internos

Si el repositorio `platform-config` no está disponible, ActionsCoreLib usa estos defaults:

| Dato | Default |
|------|---------|
| `deploy-policy.yaml` | Sin política (todos los tipos permitidos) |
| `security-policy.yaml` | `soft_fail: false`, severidad `CRITICAL,HIGH` para Trivy |
| `tool-versions.yaml` | Versiones hardcodeadas en `PlatformConfigLoader.ts` |

Los defaults están definidos en las constantes `DEPLOY_DEFAULTS`, `SECURITY_DEFAULTS` y `VERSIONS_DEFAULTS` dentro del archivo.

---

## Uso en stages

Cualquier stage puede consumir la configuración de platform-config:

```typescript
import { PlatformConfigLoader } from '../../config/PlatformConfigLoader';
import { Logger } from '../../utils/Logger';

async run(stage: StageConfig): Promise<void> {
  const { trivy: version } = await PlatformConfigLoader.toolVersions();
  Logger.info(`Instalando Trivy ${version}`);
  // ...
}
```

Los stages `TrivyStage`, `CheckovStage`, `SemgrepStage`, `SonarQubeStage` y `SetupTerragruntStage` ya usan `PlatformConfigLoader` internamente — no requieren configuración adicional.
