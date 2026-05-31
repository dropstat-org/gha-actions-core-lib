# Terragrunt v1.0 Migration Guide

## Versión recomendada

```yaml
# action.yaml
tools:
  terragrunt: "1.0.6"
```

## Cambios de flags CLI

| Flag v0.x | Flag v1.0 | Tipo |
|-----------|-----------|------|
| `--terragrunt-working-dir X` | `--working-dir X` | Global (antes del subcomando) |
| `--terragrunt-non-interactive` | `--non-interactive` | Global |
| `--terragrunt-parallelism N` | `--parallelism N` | Run flag |
| `--terragrunt-source-update` | `--source-update` | Run flag |
| `--terragrunt-ignore-dependency-errors` | `--queue-ignore-errors` | Run flag |
| `run-all` | `run --all` | Comando |

## Estructura de comandos v1.0

```bash
# Plan
terragrunt --non-interactive --working-dir live/dev run --all --queue-ignore-errors plan

# Apply (Terraform flags después de --)
terragrunt --non-interactive --working-dir live/dev run --all apply -- -auto-approve

# Plan con parallelism
terragrunt --non-interactive --working-dir management/github-oidc run --all --parallelism 1 plan
```

## Cambios en HCL configs

### skip = true → exclude block
```hcl
# Viejo (0.x)
skip = true

# Nuevo (1.0)
exclude {
  if      = true
  actions = ["all"]
}
```

### mock_outputs_merge_with_state → mock_outputs_merge_strategy_with_state
```hcl
# Viejo (deprecated)
mock_outputs_merge_with_state = true

# Nuevo (v1.0)
mock_outputs_merge_strategy_with_state = "shallow"
# Opciones: "no_merge" (default), "shallow", "deep_map_only"
```

## Comandos renombrados

| Comando viejo | Comando nuevo |
|---------------|---------------|
| `terragrunt terragrunt-info` | `terragrunt info print` |
| `terragrunt output-module-groups` | `terragrunt find --dag --json` |
| `terragrunt show -json plan.bin` | `terragrunt show -- -json plan.bin` |

## Cómo la librería genera el show command

La librería `gha-actions-core-lib` genera automáticamente el comando `show` basado en el comando `plan` del action.yaml:

```
Input (action.yaml):
  terragrunt --non-interactive --working-dir live/dev run --all --queue-ignore-errors plan

Output generado por PlanStage:
  plan: terragrunt --non-interactive --working-dir live/dev run --all --queue-ignore-errors plan -- --out tfplan1-{id}.binary
  show: terragrunt --non-interactive --working-dir live/dev run --all --queue-ignore-errors show -- -json tfplan1-{id}.binary 2>/dev/null | grep '^{' > tfplan1-{id}.json
```

El `grep '^{'` filtra logs de Terragrunt del output, dejando solo JSON válido en el archivo JSONL.

## Warning conocido (no es error)

```
Using `terragrunt.hcl` as the root of Terragrunt configurations is an anti-pattern
```

En v1.0, el archivo root recomendado es `root.hcl`. El warning no bloquea la ejecución — se resolverá en una migración futura renombrando `terragrunt.hcl` → `root.hcl` y actualizando todos los `find_in_parent_folders()`.
