# Utility Classes

ActionsCoreLib expone cinco utilitarios disponibles para cualquier stage. El patrón es el mismo de una Jenkins Shared Library: importás la clase y usás sus métodos estáticos — no hay instanciación.

```typescript
import { Credentials } from '../../utils/Credentials';
import { Env }         from '../../utils/Env';
import { FileUtil }    from '../../utils/FileUtil';
import { Logger }      from '../../utils/Logger';
import { StageMessage, StageOutputKey } from '../../utils/StageMessage';
```

---

## `Credentials` — Acceso a secretos

Wrapper sobre `process.env` que llama a `core.setSecret()` en el primer acceso. A partir de ese momento el valor queda enmascarado (`***`) en todos los logs del runner.

```typescript
// Genérico
const token = Credentials.require('MY_SECRET');   // lanza si falta
const token = Credentials.optional('MY_SECRET');  // '' si falta, sin error

// Named accessors — los más comunes ya tienen método
Credentials.githubToken()       // GITHUB_TOKEN
Credentials.ghToken()           // GH_TOKEN (o GITHUB_TOKEN como fallback)
Credentials.orgReadToken()      // ORG_READ_TOKEN
Credentials.sonarToken()        // SONAR_TOKEN
Credentials.awsAccessKeyId()    // AWS_ACCESS_KEY_ID
Credentials.awsSecretAccessKey()// AWS_SECRET_ACCESS_KEY
```

**Por qué no usar `process.env` directamente:**
- `process.env` nunca enmascara el valor — puede aparecer en logs si se imprime accidentalmente.
- `Credentials` garantiza que el valor queda enmascarado antes de cualquier uso.
- `require()` lanza un error claro apuntando al nombre del secret faltante.

---

## `Env` — Variables de contexto de GitHub Actions

Acceso tipado a las variables de entorno estándar que GitHub Actions inyecta en cada job. Evita escribir `process.env.GITHUB_SHA ?? ''` disperso por el código.

```typescript
Env.sha()              // GITHUB_SHA — commit completo
Env.ref()              // GITHUB_REF — refs/heads/main
Env.refName()          // GITHUB_REF_NAME — main, v1.0.0, feature/foo
Env.actor()            // GITHUB_ACTOR — usuario que disparó el workflow
Env.repository()       // GITHUB_REPOSITORY — dropstat/terraform-null
Env.repositoryOwner()  // GITHUB_REPOSITORY_OWNER — dropstat
Env.workspace()        // GITHUB_WORKSPACE — /home/runner/work/...
Env.eventName()        // GITHUB_EVENT_NAME — push | pull_request | workflow_dispatch
Env.runId()            // GITHUB_RUN_ID
Env.runNumber()        // GITHUB_RUN_NUMBER
Env.serverUrl()        // GITHUB_SERVER_URL — https://github.com
Env.headRef()          // GITHUB_HEAD_REF — rama fuente en PR
Env.baseRef()          // GITHUB_BASE_REF — rama target en PR
Env.runUrl()           // URL completa al run — serverUrl/repo/actions/runs/runId

// Helper — parte GITHUB_REPOSITORY en dos componentes
const { owner, name } = Env.repositoryParts();
// → { owner: 'dropstat', name: 'terraform-null' }
```

Para variables propias (no estándar de GitHub):
```typescript
Env.get('DEPLOY_ENV', 'staging')  // con fallback
Env.require('DEPLOY_ENV')          // lanza si falta
```

---

## `FileUtil` — Operaciones de archivo

Wrapper sobre `fs` de Node con manejo de errores consistente, creación automática de directorios y helpers JSON.

```typescript
// Lectura
FileUtil.exists('tfplan.json')         // boolean
FileUtil.read('tfplan.json')           // string utf-8
FileUtil.readBuffer('trivy.sarif')     // Buffer (útil para gzip)
FileUtil.readJson<TfPlan>('tfplan.json') // T — JSON.parse tipado

// Escritura — crea directorios intermedios automáticamente
FileUtil.write('reports/plan.txt', content)
FileUtil.writeJson('reports/result.json', { passed: true })
FileUtil.append('output.log', 'otra línea\n')

// Gestión
FileUtil.copy('src/file', 'dest/file') // crea dirs en dest automáticamente
FileUtil.remove('tmp/artifact')        // sin error si no existe
FileUtil.ensureDir('tmp/reports')
FileUtil.chmod('/usr/local/bin/tool', 0o755)
FileUtil.size('tfplan.binary')         // bytes, -1 si no existe
```

---

## `Logger` — Logging estructurado

Wrapper sobre `@actions/core` que añade grupos con tiempo, banners visuales y el método `mask()` para enmascarar valores dinámicos.

```typescript
// Niveles estándar
Logger.info('Instalando Trivy 0.70.0...')
Logger.warn('SARIF upload skipped — Advanced Security no habilitado')
Logger.error('Fallo en la validación')
Logger.debug('token length: 40')
Logger.notice('Deploy completado')

// Grupo colapsable — retorna función de cierre con tiempo elapsed
const end = Logger.group('trivy: scan');
try {
  // ... trabajo ...
} finally {
  end(); // cierra el grupo e imprime "'trivy: scan' completed in 12.3s"
}

// Versión async — cierre automático aunque el fn lance
await Logger.withGroup('checkov: terraform_plan', async () => {
  await exec.exec('checkov', args);
});

// Banner — línea visual al inicio de una fase importante
Logger.banner('Deploy a staging');
// Imprime:
// ──────────────────────
//   Deploy a staging
// ──────────────────────

// Enmascarar un valor dinámico (p.ej. token recibido de una API)
Logger.mask(dynamicToken);
```

---

## `StageMessage` — Comunicación entre stages

Abstracción tipada sobre el mecanismo de outputs de GitHub Actions. Permite que un stage emita valores que otros stages consumen, con un enum de claves conocidas para evitar typos.

### Emitir un output

```typescript
import { StageMessage, StageOutputKey } from '../../utils/StageMessage';

// Escribe un step output — disponible en el mismo job como:
// ${{ steps.<id>.outputs.image_tag }}
StageMessage.emit(StageOutputKey.IMAGE_TAG, 'v1.2.3-abc1234');

// Exporta como variable de entorno para todos los pasos siguientes del job
// (no requiere wiring en el YAML)
StageMessage.exportEnv('DEPLOY_ENV', 'staging');
```

### Leer un input

```typescript
// Leer valor inyectado por el workflow (desde outputs de jobs previos o env del step)
const env = StageMessage.read('DEPLOY_ENV', 'staging');  // con fallback
const env = StageMessage.require('DEPLOY_ENV');            // lanza si falta
```

### Claves conocidas (`StageOutputKey`)

| Clave | Stage que la emite | Descripción |
|-------|-------------------|-------------|
| `PLAN_FILE` | plan | Ruta al plan binario |
| `PLAN_SUMMARY` | plan | Resumen del plan |
| `IMAGE_TAG` | publish | Tag de la imagen Docker |
| `IMAGE_REF` | publish | Referencia completa (`registry/org/repo:tag`) |
| `ARTIFACT_URL` | publish | URL del artifact en el registry |
| `VERSION` | release | Versión semántica liberada |
| `TAG` | release | Tag git creado |
| `DEPLOY_ENV` | deploy | Ambiente al que se desplegó |
| `DEPLOY_URL` | deploy | URL del ambiente post-deploy |
| `SCAN_PASSED` | trivy/checkov/semgrep | `"true"` \| `"false"` |
| `SCAN_FINDINGS` | trivy/checkov/semgrep | Conteo de hallazgos |

### Flujo completo entre jobs

```yaml
# job: publish
- uses: dropstat/ActionsCoreLib@main
  id: publish_step
  with:
    stage: publish
# El stage emite: StageMessage.emit(StageOutputKey.IMAGE_TAG, tag)

# job: deploy
jobs:
  deploy:
    needs: publish
    steps:
      - uses: dropstat/ActionsCoreLib@main
        with:
          stage: deploy
        env:
          IMAGE_TAG: ${{ needs.publish.outputs.image_tag }}
# El stage lee: StageMessage.require('IMAGE_TAG')
```

---

## Uso combinado en un stage

```typescript
import { Credentials }  from '../../utils/Credentials';
import { Env }          from '../../utils/Env';
import { FileUtil }     from '../../utils/FileUtil';
import { Logger }       from '../../utils/Logger';
import { StageMessage, StageOutputKey } from '../../utils/StageMessage';

async run(stage: StageConfig): Promise<void> {
  await Logger.withGroup(`deploy: ${stage.name}`, async () => {
    Logger.banner('Iniciando deploy');

    const token = Credentials.awsAccessKeyId();
    const env   = StageMessage.require('DEPLOY_ENV');
    const image = StageMessage.require('IMAGE_TAG');

    Logger.info(`Desplegando ${image} a ${env}`);
    Logger.info(`Run: ${Env.runUrl()}`);

    FileUtil.writeJson('deploy-manifest.json', { image, env, sha: Env.sha() });

    await this.execCommands(stage.commands ?? []);

    StageMessage.emit(StageOutputKey.DEPLOY_URL, `https://${env}.empresa.com`);
    Logger.info('Deploy completado');
  });
}
```
