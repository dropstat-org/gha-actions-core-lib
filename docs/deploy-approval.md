# Deploy Approval

ActionsCoreLib implementa un sistema de aprobación de dos pasos antes de permitir cualquier deploy. Ambos pasos están implementados en TypeScript siguiendo principios SOLID — sin scripts bash.

---

## Flujo completo

```
deploy.yml (workflow_dispatch)
  │
  ├─ job: config
  │    └── stage: config → emite deploy_min_permission, deploy_approver_teams, deploy_approver_users
  │
  ├─ job: validate
  │    ├── stage: validate-confirm   → verifica que confirm == "deploy"
  │    └── stage: validate-approver → verifica que el actor tiene permiso
  │
  └─ job: plan-and-deploy   (solo si validate pasó)
       ├── stage: setup-terragrunt
       ├── stage: plan
       └── stage: deploy
```

---

## Stage `validate-confirm`

Verifica que el campo `confirm` del `workflow_dispatch` sea exactamente la cadena `"deploy"`. Previene ejecuciones accidentales o automatizadas.

### Uso en YAML

```yaml
- uses: dropstat/ActionsCoreLib@main
  with:
    stage: validate-confirm
  env:
    CONFIRM: ${{ inputs.confirm }}
```

### Comportamiento

| Valor de `CONFIRM` | Resultado |
|--------------------|-----------|
| `"deploy"` | Pasa sin error |
| Cualquier otro valor (vacío, `"yes"`, `"Deploy"`) | Lanza `INVALID_CONFIRM` y falla el job |

El check es case-sensitive — `"Deploy"` falla.

### Implementación

`src/stages/validate/ValidateConfirmStage.ts` — lógica directa, sin dependencias externas:

```typescript
export class ValidateConfirmStage {
  static run(): void {
    const confirm = process.env.CONFIRM ?? '';
    if (confirm !== 'deploy') {
      throw new ActionsCoreLibError(
        ErrorCode.INVALID_CONFIRM,
        `Confirmation must be exactly 'deploy', received: '${confirm}'`,
      );
    }
  }
}
```

---

## Stage `validate-approver`

Verifica que el actor que disparó el workflow tiene permiso para aprobar un deploy según la política del tipo de proyecto.

### Uso en YAML

```yaml
- uses: dropstat/ActionsCoreLib@main
  with:
    stage: validate-approver
  env:
    ACTOR:           ${{ github.actor }}
    REPO:            ${{ github.repository }}
    APPROVER_TEAMS:  ${{ needs.config.outputs.deploy_approver_teams }}
    APPROVER_USERS:  ${{ needs.config.outputs.deploy_approver_users }}
    MIN_PERMISSION:  ${{ needs.config.outputs.deploy_min_permission }}
    GH_TOKEN:        ${{ secrets.GITHUB_TOKEN }}
    ORG_READ_TOKEN:  ${{ secrets.ORG_READ_TOKEN }}   # opcional — habilita Modo A
```

### Selección de modo

ActionsCoreLib detecta automáticamente qué modo usar según la presencia del secret `ORG_READ_TOKEN`:

| Secret disponible | Modo | Verificación |
|-------------------|------|--------------|
| `ORG_READ_TOKEN` presente | **Modo A — Teams** | Membresía en teams de GitHub vía API `/orgs/{org}/teams/{team}/memberships/{user}` |
| Solo `GITHUB_TOKEN` | **Modo B — Permiso de repo** | Nivel de colaborador vía API `/repos/{owner}/{repo}/collaborators/{user}/permission` |

En ambos modos, **los usuarios individuales** (`APPROVER_USERS`) se verifican primero. Si el actor está en la lista, pasa sin consultar teams ni permiso.

### Lógica de evaluación

```
1. ¿actor está en APPROVER_USERS?  → SÍ: autorizado
2. ¿ORG_READ_TOKEN disponible?
   → SÍ (Modo A): ¿actor es miembro activo de algún team en APPROVER_TEAMS?  → SÍ: autorizado
   → NO (Modo B): ¿permiso del actor en el repo >= MIN_PERMISSION?            → SÍ: autorizado
3. Ninguna condición se cumplió → APPROVER_NOT_AUTHORIZED → falla el job
```

### Niveles de permiso (Modo B)

| Nivel | Descripción |
|-------|-------------|
| `admin` | Propietarios del repo / org owners |
| `maintain` | Rol "Maintainer" — asignado por admins |
| `write` | Colaboradores con push |
| `read` | Solo lectura |
| `none` | Sin acceso |

Solo un admin puede elevar el permiso de alguien a `maintain` o superior — un developer no puede autorizarse a sí mismo.

---

## Arquitectura SOLID

El sistema de validación está en `src/stages/validate/` y sigue el principio abierto/cerrado — se pueden agregar nuevas estrategias de verificación sin modificar las existentes.

### Interfaz base

```typescript
// ApproverChecker.ts
export interface ApprovalContext {
  actor: string;
  org: string;
  repo: string;
}

export interface ApproverChecker {
  check(context: ApprovalContext): Promise<boolean>;
  describe(): string;
}
```

### Implementaciones

| Clase | Modo | Qué verifica |
|-------|------|--------------|
| `IndividualUserChecker` | Ambos | El actor está en la lista de usuarios explícitos |
| `TeamMembershipChecker` | Modo A | El actor es miembro activo del team en GitHub |
| `RepoPermissionChecker` | Modo B | El nivel de permiso del actor en el repo |

### Orquestación

`ApprovalValidator` recibe una lista de checkers y aplica lógica "first-pass-wins":

```typescript
export class ApprovalValidator {
  constructor(private readonly checkers: ApproverChecker[]) {}

  async validate(context: ApprovalContext): Promise<void> {
    for (const checker of this.checkers) {
      if (await checker.check(context)) {
        Logger.info(`✓ ${context.actor} authorized via ${checker.describe()}`);
        return;
      }
    }
    throw new ActionsCoreLibError(
      ErrorCode.APPROVER_NOT_AUTHORIZED,
      `Actor '${context.actor}' is not authorized to approve deploys`,
    );
  }
}
```

### `ValidateApproverStage`

Construye el contexto y los checkers según los inputs, luego delega a `ApprovalValidator`:

```typescript
export class ValidateApproverStage {
  static async run(): Promise<void> {
    const actor        = StageMessage.read('ACTOR')  || Env.actor();
    const org          = StageMessage.read('ORG')    || Env.repositoryOwner();
    const repo         = StageMessage.read('REPO')   || Env.repository();
    const githubToken  = Credentials.ghToken();
    const orgReadToken = Credentials.orgReadToken();
    const approverUsers = splitList(StageMessage.read('APPROVER_USERS'));
    const approverTeams = splitList(StageMessage.read('APPROVER_TEAMS'));
    const minPermission = StageMessage.read('MIN_PERMISSION', 'maintain');

    const context: ApprovalContext = { actor, org, repo };
    const checkers: ApproverChecker[] = [
      new IndividualUserChecker(approverUsers),
    ];

    if (orgReadToken) {
      checkers.push(new TeamMembershipChecker(approverTeams, orgReadToken));
    } else {
      checkers.push(new RepoPermissionChecker(githubToken, minPermission));
    }

    await new ApprovalValidator(checkers).validate(context);
  }
}
```

---

## Permisos por rama

ActionsCoreLib combina dos capas de control: la validación rama→entorno (que previene desplegar al entorno equivocado) y la validación de aprobador (que controla quién autoriza el deploy).

### Capa 1 — Validación rama → entorno

Antes de ejecutar cualquier deploy, ActionsCoreLib verifica que la rama actual tenga permiso para targetear el entorno declarado. Esta validación es automática y no se puede omitir.

| Rama | Entorno permitido | Error si se viola |
|------|-------------------|-------------------|
| `develop` | `dev` | `ACCOUNT_BRANCH_MISMATCH` |
| `release/*` | `qa`, `staging` | `ACCOUNT_BRANCH_MISMATCH` |
| `master` | `prod` | `ACCOUNT_BRANCH_MISMATCH` |
| `feature/*`, `hotfix/*`, `pullRequest` | sin restricción | — |

Ver `docs/branching-strategy.md` para la referencia completa.

### Capa 2 — Validación de aprobador

Una vez que la rama y el entorno son válidos, ActionsCoreLib verifica que el actor que disparó el workflow tiene permiso para aprobar el deploy según la política definida en `platform-config/deploy-policy.yaml`.

```
Branch: release/1.2
  │
  ├── Capa 1: ¿entorno == qa o staging?  ✓
  │
  └── Capa 2: ¿actor está en teams/users de deploy-policy.yaml?  ✓
                │
                └── job deploy corre
```

### Matriz completa de permisos por rol

| Rol en el repo / org | `develop → dev` | `release → qa/staging` | `master → prod` |
|---|---|---|---|
| Developer (`write`) | Plan + Checkov ✓, Deploy ✗ (necesita approver) | idem | idem |
| Maintainer (`maintain`) | Deploy ✓ (Modo B) | Deploy ✓ (Modo B) | Deploy ✓ (Modo B) |
| Miembro del team aprobador | Deploy ✓ (Modo A) | Deploy ✓ (Modo A) | Deploy ✓ (Modo A) |
| Admin | Deploy ✓ | Deploy ✓ | Deploy ✓ |

> En Modo B (sin `ORG_READ_TOKEN`), el permiso mínimo para aprobar es el definido en `deploy-policy.yaml` → `min_permission`. Por defecto es `maintain`.

---

## Configurar la política

La política de aprobación está en `{org}/platform-config/deploy-policy.yaml` — los developers no pueden modificarla (requiere acceso al repo `platform-config`).

```yaml
terraform:
  teams:
    - platform-team
  users:
    - mondrias
  min_permission: maintain
```

Para autorizar a un usuario nuevo:
- Agregar su username a `users` en `deploy-policy.yaml`, o
- Agregar el team correspondiente a `teams`, o
- (Modo B) Asignarle el rol `Maintain` en el repo: `gh api repos/dropstat/<repo>/collaborators/<user> -X PUT -f permission=maintain`

Ver `docs/platform-config.md` para detalles completos sobre la política.

---

## Agregar una estrategia de verificación nueva

1. Crear una clase que implemente `ApproverChecker`:

```typescript
export class MyCustomChecker implements ApproverChecker {
  async check(context: ApprovalContext): Promise<boolean> {
    // lógica de verificación
    return false;
  }
  describe(): string {
    return 'my-custom-checker';
  }
}
```

2. Instanciar la clase en `ValidateApproverStage.run()` y agregarla al array `checkers`.

No se requiere modificar `ApprovalValidator` ni los otros checkers.
