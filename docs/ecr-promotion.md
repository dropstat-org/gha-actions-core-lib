# ECR Image Promotion — Guía

La lib usa `aws ecr put-image` para promover imágenes sin rebuild ni transfer de capas.

## Flujo de promoción

```
CI build → :sha-052c920
CD release → sha-052c920 → :dev  (ECR put-image, mismo digest, sin transferir capas)
CD ecs_deploy → deploy :sha-052c920 directamente (SHA_TAG)
```

## Idempotencia

Si el tag destino ya apunta al mismo digest, ECR devuelve `ImageAlreadyExistsException`.
La lib lo trata como éxito — el CD pipeline puede correr múltiples veces con el mismo sha.

```
✅ ECR tag 'dev' already points to the same digest — promotion is a no-op
```

## Configuración en action.yaml (CD repo)

```yaml
- name: release
  publish:
    docker:
      registry: ecr
      image: dropstat/gha-demo-api-ecs   # REQUERIDO — no se auto-deriva en release stage
```

## Variables de entorno (release job)

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `SHA_TAG` | `inputs.sha_tag` | sha a promover (e.g. `sha-052c920`) |
| `ECR_REGISTRY` | Org var | Registry URL |
| `ECR_IMAGE_ORG` | Org var | Prefijo org (`dropstat`) |
| `AWS_ROLE_ARN` | Org secret | Role con permisos ECR |

## ECS Exec — debugging

Habilitar en `terragrunt.hcl`:
```hcl
enable_execute_command = true
min_task_count         = 1   # evita scale-to-zero por falta de tráfico
```

Conectar:
```bash
TASK=$(aws ecs list-tasks --cluster my-cluster --service-name my-service \
  --desired-status RUNNING --region us-east-2 \
  --query 'taskArns[0]' --output text | awk -F'/' '{print $NF}')

aws ecs execute-command --cluster my-cluster --task $TASK \
  --container my-container --interactive --command "/bin/sh" --region us-east-2
```

Test desde el container (sin curl/wget en imágenes mínimas):
```sh
python3 -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8080/health').read().decode())"
```
