# Plataforma CI/CD — dropstat-org

## Arquitectura

```
dropstat-org/
├── gha-actions-core-lib    ← Motor central (Node.js action + CI org-wide)
├── gha-actions-config      ← Políticas de deploy (approvers, permisos)
├── .github                 ← Perfil de la org (excluido del CI obligatorio)
└── [repos de producto]     ← Cada repo tiene su action.yaml + deploy.yml
```

## Cómo funciona el CI obligatorio

Cada push o PR a cualquier repo de la org dispara automáticamente el CI definido en `gha-actions-core-lib/.github/workflows/ci.yml`, sin necesidad de agregar nada en el repo destino.

Esto se logra mediante un **Org Ruleset** (ID 16774808) de tipo `workflows` configurado en GitHub → Organization Settings → Rules.

El ruleset aplica a todos los repos excepto: `.github`, `gha-actions-core-lib`, `gha-actions-config`.

## Flujo por tipo de repo

El `config` stage lee el `action.yaml` del repo y detecta el tipo automáticamente.

### Terraform (`type: terraform`)
```
Config → Plan → Checkov Terraform
```

### App / Library (`type: app | library`)
```
Config → Compile → Unit Test → Linter → Semgrep → SonarQube → Trivy → Checkov → Publish
```
Los stages deshabilitados en `action.yaml` quedan en `skipped`.

## Estructura del `action.yaml` de cada repo

```yaml
version: "1.0"
type: terraform          # app | library | terraform | infra | deploy | generic

metadata:
  projectId: mi-proyecto
  serviceId: mi-servicio
  version: "1.0.0"

stages:
  - name: plan
    commands:
      - terragrunt init -input=false
      - terragrunt run-all plan -input=false
  - name: checkov_tf
    checkov:
      framework: terraform_plan
  - name: deploy
    deploy:
      environment: prod
    commands:
      - terragrunt run-all apply --terragrunt-non-interactive -auto-approve
  - name: release
```

## Deploy manual (Terraform)

El deploy no corre en CI. Se dispara manualmente con:

```bash
gh workflow run deploy.yml -f environment=prod -f confirm=deploy
```

Flujo interno: `Config → Validate → Plan → Deploy (con aprobación de Environment)`

## Política de deploy (`gha-actions-config/deploy-policy.yaml`)

Define quién puede aprobar deploys en todos los repos de la org:

```yaml
teams: []          # equipos con permiso de deploy (ej: [devops, platform])
users: []          # usuarios individuales con permiso
min_permission: write  # permiso mínimo requerido en el repo
```

Si el archivo no existe, el action usa estos mismos valores como default.

---

## Lecciones aprendidas

### 1. Required Workflows y repos privados
- La API de Required Workflows (`/orgs/{org}/actions/required_workflows`) está deprecada desde enero 2024. Usar **Rulesets API** (`POST /orgs/{org}/rulesets` con `rules: [{type: "workflows"}]`).
- Los required workflows **solo pueden referenciar acciones del mismo repo fuente o repos públicos**. Si el workflow está en `repo-A` y referencia `repo-B` (privado), falla con "pre-flight 0 jobs".
- Solución: el required workflow y el action que usa deben estar en el mismo repo (`gha-actions-core-lib`).

### 2. `uses: ./` en required workflows
- `uses: ./` resuelve contra el workspace del **repo destino** (el que dispara el CI), no contra el repo fuente del workflow.
- Si el action está embebido en el repo fuente (`.github/actions/opscore/`), el runner lo busca en el destino → error "Can't find action.yml".
- Solución correcta: usar `uses: dropstat-org/gha-actions-core-lib@main` (referencia completa al repo fuente).

### 3. El action tardaba 4-10 minutos
**Síntoma:** el step `Run dropstat-org/gha-actions-core-lib@main` terminaba en <1 segundo pero el job tardaba 4+ minutos.

**Causa:** el action usa Octokit (cliente HTTP de GitHub) para consultar `gha-actions-config`. Al terminar el request, el cliente HTTP de Node.js deja conexiones **keep-alive** abiertas. Node.js no puede salir mientras haya conexiones activas → el runner las mata por timeout (~4 min) → aparece "Cleaning up orphan processes" en los logs.

**Fix en `src/index.ts`:**
```typescript
// antes
run();

// después
run().then(() => process.exit(0)).catch(() => process.exit(1));
```

**Intentos que no resolvieron el problema:**
- Cambiar `node24` → `node20` (bajó de 10 a 4.5 min — Node 20 está pre-instalado en el runner, evita descargar el runtime)
- Eliminar `node_modules` del repo (el download del action tarda <1 seg de todas formas)
- Hacer el repo público (sin impacto en el tiempo)

### 4. `node_modules` no debe estar en git
Un action Node.js compilado con `ncc` es autocontenido en `dist/bundle/index.js`. Commitear `node_modules` (13,500 archivos) es innecesario y ensucia el historial. Agregar al `.gitignore`:
```
node_modules/
dist/stages/
dist/workflows/
...
```
Solo se necesita trackear `dist/bundle/index.js` y `dist/bundle/licenses.txt`.

### 5. GitHub Environment approval en plan gratuito
El botón de aprobación nativo de GitHub Environments (required reviewers) requiere plan **Teams o superior**. En el plan Free no está disponible.
Alternativa usada: `workflow_dispatch` con input `confirm=deploy` como control manual de activación.

### 6. `run_name` vs `name` en workflows
- `name:` es el nombre estático del workflow (aparece en la lista de workflows de la UI).
- `run_name:` es el título de cada ejecución individual (puede usar expresiones dinámicas).
