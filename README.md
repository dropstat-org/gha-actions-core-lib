# dropstat ActionsCoreLib

TypeScript GitHub Action que centraliza el CI/CD de todos los repositorios de la organización. Equivale a la Jenkins Shared Library (Groovy) pero para GitHub Actions.

Los repositorios de la organización **no necesitan ningún workflow propio**. Solo declaran un archivo `action.yaml` en su raíz y el ActionsCoreLib se inyecta automáticamente vía [Required Workflows](#1-configurar-required-workflow-en-la-organización).

---

## Cómo funciona

```
Developer hace push
  │
  ▼
GitHub inyecta .github/workflows/ActionsCoreLib.yml (Required Workflow)
  │
  ▼
job config
  └─ actions/ActionsCoreLib@main stage=config
       Lee action.yaml → valida metadata → escribe outputs
       (compile_enabled=true, tools_java=17, ActionsCoreLib_type=app …)
  │
  ├─► job compile      (si compile_enabled=true)
  ├─► job unit_test    (si unit_test_enabled=true)
  ├─► job linter       (si linter_enabled=true)
  ├─► job sonarqube    (si sonarqube_enabled=true)
  ├─► job trivy        (si trivy_enabled=true)
  ├─► job checkov      (si checkov_enabled=true)
  ├─► job publish      (si publish_enabled=true)
  ├─► job release      (branch-aware: app/library/terraform)
  ├─► job pre_deploy   (si pre_deploy_enabled=true)
  ├─► job deploy       (si deploy_enabled=true)
  └─► job post_deploy  (si post_deploy_enabled=true)
```

Cada job ejecuta `actions/ActionsCoreLib@main` con el stage correspondiente. La Action lee el `action.yaml` del repo y corre los `commands` definidos.

---

## Modos de instalación

| Escenario | Mecanismo | Plan requerido |
|---|---|---|
| Organización dropstat (producción) | Required Workflows — inyección automática | GitHub Teams o Enterprise |
| Pruebas / cuenta personal | Workflow manual en cada repo | Cualquier plan (free incluido) |

---

## Opción A — Organización con Required Workflows (producción)

Este es el modo de operación normal en dropstat. El ActionsCoreLib se inyecta en todos los repositorios automáticamente — los developers **nunca tocan** `.github/workflows/`.

### Paso 1 — Hacer público el repositorio `ActionsCoreLib`

El repositorio `ActionsCoreLib` debe ser **público** (o interno en GitHub Enterprise) para que todos los repositorios de la organización puedan referenciar la Action.

### Paso 2 — Commitear el bundle compilado

La Action corre desde `dist/bundle/index.js`. Ese archivo debe estar commiteado en el repo:

```bash
cd actions/ActionsCoreLib
npm install
npm run build
git add dist/bundle/index.js dist/bundle/licenses.txt
git commit -m "build: bundle compilado"
git push
```

### Paso 3 — Configurar el Required Workflow en la organización

1. Ve a **GitHub Organization → Settings → Code and automation → Actions → Required workflows**
2. Haz clic en **Add workflow**
3. En el selector de repositorio elige `ActionsCoreLib`
4. En el selector de archivo elige `.github/workflows/ActionsCoreLib.yml`
5. En la rama elige `main` (o `master`)
6. Elige a qué repositorios aplicar: **All repositories** o un selector específico
7. Haz clic en **Add workflow**

> Desde este momento, GitHub inyecta el ActionsCoreLib automáticamente en cada push de los repositorios seleccionados. Los repos no necesitan ningún archivo `.github/workflows/`.

### Paso 4 — Configurar Secrets de organización

Ve a **Organization → Settings → Secrets and variables → Actions** y agrega:

| Secret | Descripción | Requerido por |
|---|---|---|
| `SONAR_TOKEN` | Token de autenticación de SonarQube | stage `sonarqube` |
| `SONAR_HOST_URL` | URL del servidor SonarQube (ej: `https://sonar.empresa.com`) | stage `sonarqube` |
| `AWS_ACCOUNT_ID` | ID de cuenta AWS (12 dígitos) | publish/deploy a ECR/ECS |
| `AWS_REGION` | Región AWS (ej: `us-east-1`) | publish/deploy a ECR/ECS |
| `ORG_READ_TOKEN` | PAT con scope `read:org` — habilita validación de aprobadores por GitHub Teams | stage `validate-approver` (Modo A) |

> `GITHUB_TOKEN` lo provee GitHub automáticamente en cada job — no hay que configurarlo.

> Las políticas de aprobación y versiones de herramientas se configuran en el repositorio `{org}/platform-config` — ver `docs/platform-config.md`.

### Configuración de organización (`platform-config`)

ActionsCoreLib lee la configuración de políticas desde **`{GITHUB_REPOSITORY_OWNER}/platform-config`** automáticamente. No requiere ningún cambio — la org se detecta de `GITHUB_REPOSITORY_OWNER` que GitHub inyecta en cada workflow.

Si el repo de configuración tiene un nombre distinto a `platform-config`, se sobreescribe con el input `platform-config-repo` en el Required Workflow:

```yaml
# .github/workflows/ActionsCoreLib.yml (Required Workflow)
- uses: dropstat/ActionsCoreLib@main
  with:
    stage: config
    platform-config-repo: my-policies-repo   # nombre personalizado
```

Ver `docs/platform-config.md` para detalles sobre multi-org y la estructura de archivos.

### Paso 5 — El developer crea su `action.yaml`

El developer crea el archivo `action.yaml` en la raíz de su repositorio (ver [ejemplos más abajo](#ejemplos-de-actionyaml)) y hace push. El ActionsCoreLib arranca automáticamente.

```
mi-repo/
├── action.yaml        ← único archivo que necesita el developer
├── src/
├── Dockerfile
└── ...
```

---

## Opción B — Sin organización (cuenta personal / pruebas)

Required Workflows requiere GitHub Teams. En una cuenta personal o plan free se puede probar todo igualmente — la única diferencia es que el workflow se agrega a mano en cada repo de prueba en lugar de inyectarse automáticamente.

### Paso 1 — Hacer fork del repositorio `ActionsCoreLib`

Haz fork de `alturaops/ActionsCoreLib` a tu cuenta personal, o crea un repositorio público con el mismo contenido. El repo debe ser **público** para que otros repos puedan referenciar la Action con `uses:`.

### Paso 2 — Compilar y commitear el bundle

```bash
cd actions/ActionsCoreLib
npm install
npm run build
git add dist/bundle/index.js dist/bundle/licenses.txt
git commit -m "build: bundle compilado"
git push
```

### Paso 3 — Crear el repo de prueba

Crea un repositorio de prueba (público o privado). Agrega dos archivos:

**`action.yaml`** — en la raíz del repo (igual que en producción):

```yaml
version: "1.0"
type: app

metadata:
  projectId: test
  serviceId: mi-servicio
  version: "1.0.0"

stages:
  - name: compile
    commands:
      - echo "compilando..."

  - name: unit_test
    commands:
      - echo "tests OK"
```

**`.github/workflows/ActionsCoreLib.yml`** — este es el paso manual que en producción hace GitHub automáticamente:

```yaml
name: ActionsCoreLib

on: [push, pull_request, workflow_dispatch]

jobs:
  config:
    name: Config
    runs-on: ubuntu-latest
    outputs:
      compile_enabled:   ${{ steps.ActionsCoreLib.outputs.compile_enabled }}
      unit_test_enabled: ${{ steps.ActionsCoreLib.outputs.unit_test_enabled }}
      linter_enabled:    ${{ steps.ActionsCoreLib.outputs.linter_enabled }}
      sonarqube_enabled: ${{ steps.ActionsCoreLib.outputs.sonarqube_enabled }}
      trivy_enabled:     ${{ steps.ActionsCoreLib.outputs.trivy_enabled }}
      checkov_enabled:   ${{ steps.ActionsCoreLib.outputs.checkov_enabled }}
      publish_enabled:   ${{ steps.ActionsCoreLib.outputs.publish_enabled }}
      ActionsCoreLib_type:     ${{ steps.ActionsCoreLib.outputs.ActionsCoreLib_type }}
    steps:
      - uses: actions/checkout@v4
      - id: ActionsCoreLib
        uses: TU_USUARIO/ActionsCoreLib/actions/ActionsCoreLib@main
        with:
          stage: config

  compile:
    name: Compile
    needs: config
    if: needs.config.outputs.compile_enabled == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: TU_USUARIO/ActionsCoreLib/actions/ActionsCoreLib@main
        with:
          stage: compile

  unit_test:
    name: Unit Test
    needs: [config, compile]
    if: needs.config.outputs.unit_test_enabled == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: TU_USUARIO/ActionsCoreLib/actions/ActionsCoreLib@main
        with:
          stage: unit_test

  linter:
    name: Linter
    needs: [config, compile]
    if: needs.config.outputs.linter_enabled == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: TU_USUARIO/ActionsCoreLib/actions/ActionsCoreLib@main
        with:
          stage: linter
```

> Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub.

### Paso 4 — Configurar Secrets en el repositorio de prueba

Ve a **Repositorio → Settings → Secrets and variables → Actions** y agrega los secrets que necesites:

| Secret | Cuándo lo necesitas |
|---|---|
| `SONAR_TOKEN` | Si incluyes el stage `sonarqube` |
| `SONAR_HOST_URL` | Si incluyes el stage `sonarqube` |
| `AWS_ACCOUNT_ID` / `AWS_REGION` | Si publicas a ECR |

### Paso 5 — Push y verificar

Haz push al repo de prueba. En la pestaña **Actions** verás los jobs ejecutándose: primero `config`, luego los jobs habilitados según tu `action.yaml`.

> La lógica de la Action es idéntica a producción. La única diferencia es que el `.github/workflows/ActionsCoreLib.yml` lo pones tú a mano una vez por repo de prueba, en vez de que la organización lo inyecte automáticamente.

---

## Nomenclatura de repositorios

Los repositorios deben seguir el formato **`{projectId}-{serviceId}`**:

| Parte | Regla | Ejemplo |
|---|---|---|
| `projectId` | Todo antes del **primer guion** | `pagos` en `pagos-ms-totales` |
| `serviceId` | Todo lo demás después del primer guion | `ms-totales` en `pagos-ms-totales` |

```
pagos-ms-totales     → projectId=pagos   serviceId=ms-totales
platform-api-gateway → projectId=platform serviceId=api-gateway
data-etl-service     → projectId=data    serviceId=etl-service
```

Estos valores deben coincidir exactamente con `metadata.projectId` y `metadata.serviceId` del `action.yaml`.

---

## Configurar un repositorio

El developer solo necesita crear **`action.yaml`** en la raíz del repositorio.

### Campos raíz

```yaml
version: "1.0"          # versión del schema (informativo)
type: app               # tipo de ActionsCoreLib — ver tabla más abajo
metadata:               # requerido
  projectId: pagos      # lowercase, solo letras/números/guiones, empieza con letra
  serviceId: ms-totales # mismas reglas
  version: "1.0.0"      # semver estricto X.X.X
tools:                  # versiones de herramientas (opcional, heredable por stage)
  java: "17"
  maven: "3.9"
env:                    # variables de entorno globales (opcional)
  MAVEN_OPTS: "-Xmx1024m"
stages:                 # lista de stages a ejecutar
  - name: compile
    ...
```

### Tipos de ActionsCoreLib

| `type` | Descripción | Branches permitidos |
|---|---|---|
| `app` | Construye y publica artefacto (Docker). **Nunca despliega.** | todos |
| `deploy` | Repo separado. Solo despliega a ambientes. | `master`, `develop` |
| `terraform` | IaC — lint + checkov + plan en PR, release en master | todos |
| `library` | Librería interna — snapshot en develop, release en master | todos |
| `infra` | Infra sin Terraform — linter en PR, tag en master | todos |
| `generic` | Sin restricciones de stages | todos |

---

## Estrategia de ramas

ActionsCoreLib enforcea automáticamente la correspondencia entre rama git y entorno de destino. Un deploy desde `develop` a `prod` es rechazado — no hay forma de bypasear esta validación desde el `action.yaml` del developer.

### Rama → Entorno

| Rama | Entorno permitido | Caso de uso |
|---|---|---|
| `develop` | `dev` únicamente | Integración continua, QA interno |
| `release/*` | `qa` o `staging` | Estabilización pre-release, pruebas de aceptación |
| `master` / `main` | `prod` únicamente | Producción |
| `feature/*` | sin restricción | Plans de validación, no despliega |
| `hotfix/*` | sin restricción | Corrección urgente con proceso completo |
| `hotfix-emergency/*` | sin restricción | Emergencia — puede omitir stages autorizados |
| `pull_request` | sin restricción | Solo lectura, no despliega |

### Fallback automático

Si `deploy.environment` se omite, ActionsCoreLib lo deriva de la rama:

```yaml
- name: deploy
  deploy: {}   # master → prod, release/* → staging, develop → dev
  commands:
    - terragrunt run-all apply tfplan.binary
```

### Error de mismatch

Intentar desplegar al entorno incorrecto lanza `ACCOUNT_BRANCH_MISMATCH`:

```
Branch 'develop' can only target [dev]
but stage declares environment 'prod'.
```

Ver `docs/branching-strategy.md` para la referencia completa con ejemplos, hotfix emergency, y códigos de error.

---

## Ejemplos de `action.yaml`

### Java/Maven — `type: app`

```yaml
version: "1.0"
type: app

metadata:
  projectId: pagos
  serviceId: ms-totales
  version: "2.1.0"

tools:
  java: "17"
  maven: "3.9"

env:
  MAVEN_OPTS: "-Xmx1024m"

stages:
  - name: compile
    commands:
      - mvn clean package -DskipTests

  - name: unit_test
    commands:
      - mvn test
    junitPath: "**/target/surefire-reports/*.xml"

  - name: linter
    commands:
      - mvn checkstyle:check

  - name: sonarqube

  - name: trivy

  - name: publish
    commands:
      - docker build -t pagos-ms-totales:$GITHUB_SHA .
    publish:
      docker:
        registry: ghcr
        image: pagos/ms-totales

  - name: release
```

### Java/Gradle — `type: app`

```yaml
version: "1.0"
type: app

metadata:
  projectId: pagos
  serviceId: auth-service
  version: "2.0.0"

tools:
  java: "21"
  gradle: "8.7"

stages:
  - name: compile
    commands:
      - ./gradlew clean assemble

  - name: unit_test
    commands:
      - ./gradlew test
    junitPath: "**/build/test-results/test/*.xml"

  - name: linter
    commands:
      - ./gradlew checkstyleMain

  - name: sonarqube

  - name: publish
    commands:
      - docker build -t pagos-auth-service:$GITHUB_SHA .
    publish:
      docker:
        registry: ghcr
        image: pagos/auth-service

  - name: release
```

### Node.js — `type: app`

```yaml
version: "1.0"
type: app

metadata:
  projectId: frontend
  serviceId: web-app
  version: "1.0.0"

tools:
  node: "20"
  pnpm: "9"

stages:
  - name: compile
    commands:
      - pnpm install --frozen-lockfile
      - pnpm run build

  - name: unit_test
    commands:
      - pnpm run test

  - name: linter
    commands:
      - pnpm run lint

  - name: sonarqube

  - name: publish
    commands:
      - docker build -t frontend-web-app:$GITHUB_SHA .
    publish:
      docker:
        registry: ghcr
        image: frontend/web-app

  - name: release
```

### Go — `type: app`

```yaml
version: "1.0"
type: app

metadata:
  projectId: platform
  serviceId: api-gateway
  version: "1.0.0"

tools:
  go: "1.22"

stages:
  - name: compile
    commands:
      - go build -v ./...

  - name: unit_test
    commands:
      - go test -v -coverprofile=coverage.out ./...

  - name: linter
    commands:
      - go vet ./...

  - name: sonarqube

  - name: trivy

  - name: publish
    commands:
      - docker build -t platform-api-gateway:$GITHUB_SHA .
    publish:
      docker:
        registry: ghcr
        image: platform/api-gateway

  - name: release
```

### Python — `type: app`

```yaml
version: "1.0"
type: app

metadata:
  projectId: data
  serviceId: etl-service
  version: "1.0.0"

tools:
  python: "3.12"

stages:
  - name: compile
    commands:
      - pip install -r requirements.txt

  - name: unit_test
    commands:
      - pytest tests/ --junitxml=test-results/junit.xml
    junitPath: "test-results/junit.xml"

  - name: linter
    commands:
      - ruff check .
      - mypy src/

  - name: sonarqube

  - name: trivy

  - name: publish
    commands:
      - docker build -t data-etl-service:$GITHUB_SHA .
    publish:
      docker:
        registry: ghcr
        image: data/etl-service

  - name: release
```

### Go + ECR — `type: app`

> Usar cuando la imagen va a AWS ECR en vez de GHCR. Requiere los secrets `AWS_ACCOUNT_ID` y `AWS_REGION` en la organización.

```yaml
version: "1.0"
type: app

metadata:
  projectId: platform
  serviceId: api-gateway
  version: "2.0.0"

tools:
  go: "1.22"

stages:
  - name: compile
    commands:
      - go build -o bin/api-gateway ./cmd/api-gateway

  - name: unit_test
    commands:
      - go test ./...

  - name: trivy

  - name: publish
    commands:
      - docker build -t platform-api-gateway:$GITHUB_SHA .
    publish:
      docker:
        registry: ecr
        image: platform/api-gateway

  - name: release
```

### Deploy a ECS — `type: deploy`

> ActionsCoreLib en un repositorio **separado** del de build. `pre_deploy` genera el reporte de cambios y lo publica en el Job Summary. El reviewer lo ve antes de aprobar el `deploy`.

```yaml
version: "1.0"
type: deploy

metadata:
  projectId: pagos
  serviceId: ms-totales-deploy
  version: "1.0.0"

env:
  AWS_DEFAULT_REGION: us-east-1
  CLUSTER: prod
  SERVICE: ms-totales

stages:
  - name: pre_deploy
    commands:
      # Describe el estado actual del servicio y guarda el diff en un archivo
      - aws ecs describe-services --cluster $CLUSTER --services $SERVICE --output json > ecs-state.json
      - aws ecs describe-task-definition --task-definition $SERVICE --output json > task-def.json
    artifacts:
      upload:
        - name: ecs-report
          path: ecs-state.json
    summary:
      title: "ECS Service — Estado antes del deploy"
      file: ecs-state.json
      format: json

  - name: deploy
    deploy:
      environment: production    # GitHub Environment con required reviewers
    commands:
      - aws ecs update-service --cluster $CLUSTER --service $SERVICE --force-new-deployment
      - aws ecs wait services-stable --cluster $CLUSTER --services $SERVICE

  - name: post_deploy
    commands:
      - ./scripts/smoke-test.sh
```

### Terraform — `type: terraform`

> `pre_deploy` corre el plan, escribe el output al Job Summary y sube el `tfplan` como artifact. El reviewer ve el plan antes de aprobar. `deploy` descarga el `tfplan` y hace el apply — sin re-planear.

```yaml
version: "1.0"
type: terraform

metadata:
  projectId: platform
  serviceId: infra-base
  version: "1.0.0"

env:
  TF_IN_AUTOMATION: "true"

stages:
  - name: checkov
    checkov:
      framework: terraform

  - name: linter
    commands:
      - terraform fmt -check -recursive
      - terraform validate

  - name: pre_deploy
    commands:
      - terraform init
      - terraform plan -out=tfplan -no-color 2>&1 | tee plan.txt
    artifacts:
      upload:
        - name: tfplan
          path: tfplan
        - name: plan-txt
          path: plan.txt
    summary:
      title: "Terraform Plan"
      file: plan.txt
      format: hcl

  - name: deploy
    deploy:
      environment: production    # GitHub Environment con required reviewers — ve el plan antes de aprobar
    artifacts:
      download:
        - name: tfplan
          path: .
    commands:
      - terraform apply -auto-approve tfplan

  - name: release
```

### Librería interna — `type: library`

> Snapshot a develop, release a master. Sin Docker — solo publish al package registry.

```yaml
version: "1.0"
type: library

metadata:
  projectId: shared
  serviceId: auth-lib
  version: "3.0.0"

tools:
  java: "21"
  maven: "3.9"

stages:
  - name: compile
    commands:
      - mvn clean package -DskipTests

  - name: unit_test
    commands:
      - mvn test
    junitPath: "**/target/surefire-reports/*.xml"

  - name: linter
    commands:
      - mvn checkstyle:check

  - name: sonarqube

  - name: release
    commands:
      - mvn deploy
```

### Infra scripts — `type: infra`

> Para scripts de infraestructura sin Terraform. Linter requerido en PR, tag en master.

```yaml
version: "1.0"
type: infra

metadata:
  projectId: platform
  serviceId: k8s-manifests
  version: "1.0.0"

stages:
  - name: linter
    commands:
      - kubectl --dry-run=client apply -f manifests/
      - yamllint manifests/

  - name: checkov
    checkov:
      framework: kubernetes

  - name: release
```

---

## Referencia de stages

### `compile`

Compila el proyecto. Requiere `commands`.

```yaml
- name: compile
  tools:              # opcional — sobreescribe tools globales para este stage
    java: "21"
  commands:
    - mvn clean package -DskipTests
```

### `unit_test`

Ejecuta tests unitarios. Requiere `commands`.

```yaml
- name: unit_test
  commands:
    - mvn test
  junitPath: "**/target/surefire-reports/*.xml"   # opcional
```

### `linter`

Ejecuta análisis estático. Requiere `commands`.

```yaml
- name: linter
  commands:
    - mvn checkstyle:check
```

### `sonarqube`

Análisis de calidad de código. Usa `SONAR_TOKEN` y `SONAR_HOST_URL` de secrets de organización.

La library maneja internamente: `projectKey` (= `artifactId`), `softFail=false`, upload de resultados.

```yaml
- name: sonarqube
  # sin configuración extra — funciona out of the box

  # escape hatch: parámetros adicionales al sonar-scanner
  sonar:
    args:
      - "-Dsonar.coverage.exclusions=**/generated/**"
```

### `trivy`

Escaneo de vulnerabilidades. Por defecto: filesystem scan, severidad `CRITICAL,HIGH`, upload SARIF al tab Security de GitHub. `softFail=false`.

```yaml
- name: trivy
  # sin configuración — escanea el filesystem con defaults de la organización

  # solo si necesitas escanear una imagen Docker en vez del filesystem:
  trivy:
    scanType: image
    imageRef: ghcr.io/org/pagos-ms-totales:abc123
```

### `checkov`

Análisis de políticas IaC. Por defecto: directorio `.`, upload SARIF, `softFail=false`.

```yaml
- name: checkov
  # sin configuración — analiza todo el repo con defaults

  # lo que el developer puede customizar:
  checkov:
    framework: terraform    # terraform | cloudformation | kubernetes | helm | etc.
    skipChecks:             # excepciones específicas del repo
      - CKV_AWS_20          # ej: bucket que es público por diseño
```

### `publish`

Construye y sube imagen Docker a GHCR o ECR. El tag se genera automáticamente desde el commit SHA. Si no se especifica `image`, se deriva de `GITHUB_REPOSITORY`.

```yaml
- name: publish
  commands:
    - docker build -t $ARTIFACT_ID:$GITHUB_SHA .
  publish:
    docker:
      registry: ghcr          # ghcr | ecr
      image: pagos/ms-totales  # opcional: default = GITHUB_REPOSITORY
```

### `release`

Branch-aware — la lógica es 100% interna según el tipo de ActionsCoreLib:

| ActionsCoreLib type | master | develop | pull_request |
|---|---|---|---|
| `app` | Promote imagen a prod + git tag | Promote a dev | Promote a qa |
| `library` | Publish release al registry | Publish snapshot | — |
| `terraform` / `infra` | Git tag | — | — |

```yaml
- name: release
  # no requiere ninguna configuración
```

### `pre_deploy` / `post_deploy`

Pasos antes/después del deploy. Acepta `commands`.

```yaml
- name: pre_deploy
  commands:
    - ./scripts/pre-checks.sh

- name: post_deploy
  commands:
    - ./scripts/smoke-test.sh
```

### `deploy`

Ejecuta el deploy real. Requiere `commands` y `deploy.environment`.

```yaml
- name: deploy
  deploy:
    environment: prod         # dev | qa | prod
  commands:
    - aws ecs update-service --cluster prod --service ms-totales --force-new-deployment
```

### `generic`

Stage libre sin restricciones. Útil para pasos one-off.

```yaml
- name: db-migrate
  type: generic
  commands:
    - flyway migrate
```

---

## Pasar archivos entre stages (`artifacts`)

Cada job corre en un runner limpio — los archivos no persisten entre stages. `artifacts` permite subir archivos al finalizar un stage y descargarlos en el siguiente.

```yaml
stages:
  - name: compile
    commands:
      - mvn clean package -DskipTests
    artifacts:
      upload:
        - name: jar              # identificador único en este workflow run
          path: target/*.jar     # soporta glob
          retentionDays: 1       # opcional — días que GitHub guarda el artifact

  - name: publish
    artifacts:
      download:
        - name: jar              # mismo nombre del upload
          path: target/          # directorio de destino (default: directorio actual)
    commands:
      - docker build -t myapp:$GITHUB_SHA .
```

**Usos típicos por ActionsCoreLib type:**

| Caso | upload en | download en |
|---|---|---|
| JAR compilado → build Docker | `compile` | `publish` |
| `tfplan` compilado → apply | `pre_deploy` | `deploy` |
| Binario Go → imagen Docker | `compile` | `publish` |
| Reporte de estado → logs | `pre_deploy` | cualquier stage posterior |

---

## Reporte antes del gate de aprobación (`summary`)

`summary` escribe contenido al **Job Summary** de GitHub — la página de resultados del job que el reviewer ve antes de aprobar un `environment` protegido.

```yaml
- name: pre_deploy
  commands:
    - terraform plan -out=tfplan -no-color 2>&1 | tee plan.txt
  artifacts:
    upload:
      - name: tfplan
        path: tfplan
  summary:
    title: "Terraform Plan"   # encabezado visible en el Job Summary
    file: plan.txt            # leer este archivo y escribirlo al summary
    format: hcl               # resaltado de sintaxis: text | hcl | json | diff | bash
```

Alternativamente, ejecutar un comando y capturar su stdout directamente:

```yaml
  summary:
    title: "ECS Task Definition"
    command: aws ecs describe-task-definition --task-definition mi-servicio --output json
    format: json
```

**Flujo completo con gate de aprobación:**

```
pre_deploy (corre libre)
  └─ terraform plan → plan.txt
  └─ escribe plan.txt al Job Summary
  └─ sube tfplan como artifact
       │
       ▼
deploy  ── environment: production ──► GitHub bloquea y notifica a reviewers
                                            Reviewer abre el workflow run
                                            Ve el Job Summary de pre_deploy con el plan
                                            Hace clic en "Approve and deploy"
       │
       ▼
  descarga tfplan artifact
  terraform apply -auto-approve tfplan   ← aplica exactamente lo que el reviewer aprobó
```

Para activar el gate de aprobación:
1. Ve a **Repositorio → Settings → Environments → New environment**
2. Nombre: `production` (o el que uses en `deploy.environment`)
3. Activa **Required reviewers** y agrega los aprobadores
4. El job `deploy` en `ActionsCoreLib.yml` ya declara `environment: production`

---

## Reglas de validación de metadata

| Campo | Regla | Ejemplo válido | Ejemplo inválido |
|---|---|---|---|
| `projectId` | lowercase, empieza con letra, solo `[a-z0-9-]` | `pagos` | `Pagos`, `my_project`, `1pagos` |
| `serviceId` | mismas reglas | `ms-totales` | `MyService`, `svc_1` |
| `version` | semver `X.X.X` (solo números) | `1.0.0`, `10.2.300` | `1.0`, `v1.0.0` |

El `artifactId` se genera automáticamente: `{projectId}-{serviceId}` → `pagos-ms-totales`.

---

## Herramientas disponibles (`tools`)

Las herramientas se pueden declarar a nivel global o por stage. El stage sobreescribe el global.

```yaml
tools:
  java: "17"       # o "21", "11"
  maven: "3.9"
  gradle: "8.5"
  node: "20"
  pnpm: "9"
  go: "1.22"
  python: "3.12"
  dotnet: "8"
```

> Los valores se exportan como variables de entorno (`JAVA_VERSION`, `NODE_VERSION`, etc.) para que los scripts de `commands` puedan usarlos o para herramientas de setup externas.

---

## Agregar un stage nuevo a la library (3 pasos)

```typescript
// 1. src/enums/StageName.ts
MY_STAGE = 'my_stage'

// 2. src/stages/MyStage.ts
import { Credentials }  from '../../utils/Credentials';
import { Env }          from '../../utils/Env';
import { FileUtil }     from '../../utils/FileUtil';
import { Logger }       from '../../utils/Logger';
import { StageMessage, StageOutputKey } from '../../utils/StageMessage';

export class MyStage extends AbstractStage {
  async run(stage: StageConfig): Promise<void> {
    await Logger.withGroup('my-stage', async () => {
      const token = Credentials.githubToken();
      Logger.info(`Run: ${Env.runUrl()}`);
      FileUtil.writeJson('output.json', { ok: true });
      StageMessage.emit(StageOutputKey.SCAN_PASSED, 'true');
    });
  }
}

// 3. src/registry/StageRegistry.ts — UNA línea
[StageName.MY_STAGE, MyStage],
```

Los utilitarios disponibles — `Credentials`, `Env`, `FileUtil`, `Logger`, `StageMessage` — están documentados en `docs/utilities.md`.

Si el stage es branch-aware, extiende `AbstractBranchStage` y sobreescribe `onMaster`, `onDevelop`, `onPullRequest`, `onDefault`.

Si es un analizador con exit codes, extiende `AbstractAnalyzerStage` e implementa `resultMap()`.

---

## Desarrollo local

```bash
cd actions/ActionsCoreLib

npm install          # instala dependencias
npm test             # corre los 45 tests unitarios
npm run build        # tsc + ncc → dist/bundle/index.js
```

El bundle `dist/bundle/index.js` debe estar commiteado — GitHub Actions lo descarga directamente al ejecutar el workflow.

---

## Estructura del repositorio

```
ActionsCoreLib/
├── actions/
│   └── ActionsCoreLib/
│       ├── src/               ← código fuente TypeScript
│       ├── dist/bundle/       ← bundle compilado (commiteado)
│       ├── action.yml         ← descriptor de la GHA
│       ├── package.json
│       └── README.md          ← este archivo
│
├── .github/
│   └── workflows/
│       └── ActionsCoreLib.yml       ← Required Workflow (inyectado en todos los repos)
│
└── gha-generator/             ← librería Python (genera YAML estático, uso legacy)
```
