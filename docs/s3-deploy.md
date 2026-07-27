# S3 Deploy — Frontends estáticos (build-once real)

Stage `s3_deploy` en `action.yaml` para repos tipo `app` que publican un sitio estático
(React/CRA, Vite, etc.) a S3 + CloudFront.

## El problema que resuelve: build-once para frontends

El modelo build-once construye **un solo artifact** y lo promueve dev → qa → uat → prod sin
rebuild. Para un backend en contenedor eso funciona directo: las variables por ambiente se
inyectan en runtime (task definition de ECS).

Un frontend compilado **no tiene ese momento de inyección**. CRA/Vite hornean
`process.env.REACT_APP_*` **dentro del JavaScript en tiempo de build**. Entonces, si el CD copia
el mismo bundle a los cuatro buckets, los cuatro ambientes terminan hablando con la API del
ambiente con el que se compiló.

Eso no es teórico: en `dropstat-admin-panel` el bundle de dev quedó apuntando a la API de UAT
porque `.env.dev` tenía el hostname equivocado, y el error se propagaba a todos los ambientes.

La alternativa ingenua — un `npm run build-{env}` por ambiente — rompe build-once: pasás a tener
cuatro artifacts distintos y perdés la garantía de que lo que probaste en dev es bit-a-bit lo que
corre en prod.

## La solución: `runtime_config`

El bundle se construye **sin ningún valor de ambiente adentro**. El stage `s3_deploy` escribe un
`config.js` chiquito al momento del deploy, distinto por ambiente, y la app lo lee en runtime.

```
CI (una vez)                    CD (por ambiente)
─────────────                   ─────────────────
npm run build          ──────►  descarga el artifact
  └─ bundle sin                 escribe config.js con los valores del env
     hostnames                  aws s3 sync  →  bucket del env
                                re-sube config.js con Cache-Control: no-cache
                                invalidación de CloudFront
```

El `config.js` generado:

```js
window.__APP_CONFIG__ = {
  "ENV": "qa",
  "BASE_URL": "api.qa.dropstat.com",
  "BASE_PROTOCOL": "https"
};
```

Se sube **siempre con `Cache-Control: no-cache`** (y `Content-Type: application/javascript`), para
que un cambio de configuración no quede pegado en el CDN o en el browser.

## Configuración

### `action.yaml`

```yaml
stages:
  - name: compile
    commands:
      - npm ci --legacy-peer-deps
      - CI=false npm run build          # build NEUTRO — sin .env de ambiente
    artifacts:
      upload:
        - name: admin-panel-dist
          path: build/
          retentionDays: 90

  - name: s3_deploy
    s3_deploy:
      artifact:         admin-panel-dist
      dist_path:        build
      bucket:           $S3_BUCKET
      distribution_id:  $CF_DISTRIBUTION_ID
      acl:              $S3_ACL
      runtime_config:
        ENV:            $APP_ENV
        BASE_URL:       $APP_API_BASE_URL
        BASE_PROTOCOL:  $APP_API_PROTOCOL
        ENCRYPTION_KEY: $APP_ENCRYPTION_KEY
```

**Usar `npm run build`, no `build-dev`/`build-qa`.** Todo el punto es que el artifact no lleve
ningún hostname horneado. Si el script de build necesita flags (`GENERATE_SOURCEMAP=false`),
ponerlos con `cross-env` en el script, no en un `.env` de ambiente.

### De dónde salen los `$VAR`

De las **GitHub Environment vars/secrets gestionadas por Terraform en `github-org`**, scopeadas
por ambiente por el gate `environment:` del job:

| Dónde | Qué |
|-------|-----|
| `org/config/config.auto.tfvars` → `repo_env_vars` | Valores no secretos (`S3_BUCKET`, `CF_DISTRIBUTION_ID`, `S3_ACL`, `APP_ENV`, `APP_API_BASE_URL`, `APP_API_PROTOCOL`) |
| `org/config/repo_env_config.tf` (+ SOPS) | Secretos (`APP_ENCRYPTION_KEY`) |

> **No usar `deploy.yaml`.** Está deprecado en toda la org — ningún repo lo tiene. Sigue siendo
> soportado por retrocompatibilidad y **tiene precedencia por clave** sobre `action.yaml`, pero
> los valores por ambiente van en `github-org`, nunca commiteados en el repo de la app.

Cualquier `$VAR` nueva hay que exponerla también en el bloque `env:` del job `s3_deploy` en
`.github/workflows/pipeline-cd.yml` de esta librería — el workflow whitelistea explícitamente qué
variables llegan al stage.

### Fail-loud

A diferencia de `bucket`/`acl`/etc., un `$VAR` sin resolver en `runtime_config` **falla el deploy**
en vez de pasar el literal:

```
[MISSING_STAGE_COMMANDS] s3_deploy.runtime_config.ENV: variable 'APP_ENV' is not set for
environment 'dev'. Define it as a GitHub Environment variable for this repo/env...
```

Es deliberado: este archivo se sirve a browsers, y un valor faltante dejaría a la app pegándole a
`https://$APP_API_BASE_URL`. Mejor romper el deploy que publicar un ambiente mal apuntado.

## Del lado de la app

### 1. Un único punto de lectura

```js
// src/base.js
const runtime = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {}

export const ENV           = runtime.ENV           ?? 'local'
export const BASE_URL      = runtime.BASE_URL      ?? process.env.REACT_APP_BASE_URL
export const BASE_PROTOCOL = runtime.BASE_PROTOCOL ?? process.env.REACT_APP_BASE_PROTOCOL

console.info(`[app] env=${ENV} api=${BASE_PROTOCOL}://${BASE_URL}`)
```

- El guard `typeof window !== 'undefined'` mantiene verdes los tests de Jest.
- El fallback a `process.env` deja funcionando `npm start` sin big-bang.
- El `console.info` hace que "a qué ambiente le estoy pegando" sea contestable de un vistazo.

### 2. Cargar `config.js` antes del bundle

```html
<!-- public/index.html, dentro de <head> -->
<script src="%PUBLIC_URL%/config.js"></script>
```

**Sin `defer` ni `async`.** Así ejecuta durante el parseo, garantizadamente antes del bundle
(que webpack inyecta con `defer`), y `base.js` puede seguir exportando constantes síncronas sin
necesitar un bootstrap asíncrono.

### 3. Un `public/config.js` commiteado

Con valores locales/dev. Sirve para que `npm start` funcione y para que el artifact de CI lleve un
`config.js` válido. El CD lo **sobrescribe** por ambiente.

> Ojo con los scripts legacy `npm run deploy-*` que hacen `aws s3 cp ./build` a mano: subirían ese
> `config.js` local al bucket destino. Hay que generarles el config del ambiente correcto antes del
> upload, o eliminarlos.

## Verificación

```bash
# 1. El artifact no lleva ningún hostname adentro
grep -ro "api[0-9a-z.]*\.dropstat\.com" build/static/js/ | wc -l     # → 0

# 2. Mismo bundle en dos ambientes (la prueba de build-once)
curl -s https://<cf-dev>/static/js/main.<hash>.js | md5sum
curl -s https://<cf-qa>/static/js/main.<hash>.js  | md5sum           # → idénticos

# 3. Solo difiere config.js
curl -s https://<cf-dev>/config.js    # → "ENV": "dev",  api.dev...
curl -s https://<cf-qa>/config.js     # → "ENV": "qa",   api.qa...

# 4. Nunca cacheado
curl -sI https://<cf-qa>/config.js | grep -i cache-control           # → no-cache
```

## Gotchas

**El gate de environment mira la rama del RUN, no el input `branch`.** Las deployment branch
policies (`qa` ← `develop`/`release/*`, `prod` ← `main`) se evalúan contra el ref con el que se
disparó el workflow. Como `pipeline-cd.yml` suele vivir solo en `main`, un dispatch desde ahí solo
puede llegar a `prod`. Para validar qa/uat sin mergear, disparar el CD con `--ref` de una rama
permitida por ese ambiente:

```bash
gh workflow run pipeline-cd.yml --ref release/mi-validacion \
  -f environment=qa -f branch=release/mi-validacion -f run_id=<ci-run-id>
```

**`run_id` tiene que ser el del run de `push`, no el de `pull_request`.** Los repos de app generan
dos runs de CI por commit y el de PR es no-op, sin artifact:

```bash
gh api "repos/{org}/{repo}/actions/runs/{id}" -q .event        # → debe ser "push"
```

**Artifact con prefijo `build/`.** Subir con `path: build/` deja el prefijo dentro del zip, que al
descomprimir queda `build/build/index.html`. `resolveContentRoot` lo detecta y sincroniza el
directorio que realmente contiene el `index.html`.
