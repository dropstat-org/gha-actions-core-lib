# ECS Deploy — Guía de uso

Stage `ecs_deploy` en `action.yaml` para repos tipo `app`.

## Configuración mínima (CD repo)

```yaml
# action.yaml
metadata:
  projectId: gha
  serviceId: demo-api-ecs    # ECR: {ECR_IMAGE_ORG}/{projectId}-{serviceId}

stages:
  - name: release
    publish:
      docker:
        registry: ecr
        image: dropstat/gha-demo-api-ecs   # REQUERIDO — no se auto-deriva en release

  - name: ecs_deploy
    deploy:
      environment: dev                     # GitHub environment → ECS_DEPLOY_ROLE
    ecs_deploy:
      cluster:            my-cluster
      service:            my-service
      container:          my-container
      image_tag:          $SHA_TAG         # sha exacto del dispatch; fallback: dev/qa/prod
      wait_for_stability: true
```

## Variables de entorno requeridas

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `ECR_REGISTRY` | Org var | Registry URL completo |
| `ECR_IMAGE_ORG` | Org var | Prefijo org en ECR (e.g. `dropstat`) |
| `AWS_ROLE_ARN` | Repo/env var (fallback: secret) | Role OIDC con permisos ECR/AWS. No es secreto (ARN visible via `aws iam get-role`); `vars` tiene prioridad, `secrets` queda como fallback mientras se migran los repos restantes |
| `ECS_DEPLOY_ROLE` | Env var | Role con permisos ECS en cuenta destino (no es secreto: ARN visible via `aws ecs describe-services`) |

## image_tag resolution

```
$SHA_TAG set → usa sha exacto (e.g. sha-052c920)
$SHA_TAG vacío → usa nombre del env (dev / qa / prod)
```

## Seguridad prod

```typescript
// ❌ BLOQUEADO si no es rama main:
//   environment: prod solo permitido en main
```

## cross-account pull ECR

ECR en shared-services, ECS en cuenta workload → requiere:
1. `aws_ecr_registry_policy` en shared-services con account ID del workload
2. Task execution role con `AmazonECSTaskExecutionRolePolicy`

## Deploy manual / rollback

```bash
gh workflow run ci.yml \
  --repo dropstat-org/my-app-deploy \
  --ref develop \
  -f sha_tag=sha-abc1234 \
  -f environment=dev
```
