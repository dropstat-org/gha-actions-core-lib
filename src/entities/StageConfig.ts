import { Environment } from '../enums/Environment';

export interface StageTools {
  java?: string;
  maven?: string;
  gradle?: string;
  node?: string;
  pnpm?: string;
  go?: string;
  python?: string;
  dotnet?: string;
}

export interface DockerArtifact {
  registry: 'ghcr' | 'ecr';
  image: string;
  tag?: string;  // solo uso interno en stages de release/promote
}

export interface DeployConfig {
  environment?: Environment | string;  // omit to fall back to branch-derived environment
  accounts?: string[];                 // AWS account IDs or names — validated against branch type
}

// Solo lo que el developer puede customizar — todo lo demás lo controla la library
export interface SonarConfig {
  args?: string[];  // parámetros extra a sonar-scanner
}

export interface TrivyConfig {
  scanType?: 'fs' | 'image';  // default: fs
  imageRef?: string;           // requerido si scanType=image
}

export interface CheckovConfig {
  framework?: string;         // terraform | terraform_plan | cloudformation | kubernetes | helm | etc.
  skipChecks?: string[];      // check IDs to skip (e.g. CKV_AWS_1)
  planFile?: string;          // plan JSON path when framework=terraform_plan (default: tfplan.json)
  softFail?: boolean;         // always warn instead of fail, overrides platform policy
  softFailPattern?: string;   // regex against projectId or serviceId — match → soft-fail
  externalChecksDir?: string; // local path to custom checks dir (clone via actions/checkout first)
}

export interface SemgrepConfig {
  config?: string;    // semgrep ruleset (default: auto)
  args?: string[];    // extra args passed to semgrep
}


export interface PublishConfig {
  docker?: DockerArtifact;
}

// ── Artifacts entre stages ─────────────────────────────────────────────────

export interface ArtifactUpload {
  name: string;            // identificador del artifact (único por workflow run)
  path: string;            // archivo o directorio a subir (soporta glob: tfplan, target/*.jar)
  retentionDays?: number;  // días de retención (default: configuración del repo)
}

export interface ArtifactDownload {
  name: string;    // debe coincidir con el name del upload
  path?: string;   // directorio de destino (default: directorio de trabajo actual)
}

// ── Job Summary (reporte antes del gate de aprobación) ──────────────────────

export interface SummaryConfig {
  title?: string;                                       // encabezado del bloque
  file?: string;                                        // leer este archivo y escribirlo al summary
  command?: string;                                     // ejecutar y capturar stdout → summary
  format?: 'text' | 'hcl' | 'json' | 'diff' | 'bash'; // resaltado de sintaxis
}

// ── Stage completo ─────────────────────────────────────────────────────────

export interface StageConfig {
  name: string;
  type?: string;
  commands?: string[];
  tools?: StageTools;
  env?: Record<string, string>;
  deploy?: DeployConfig;
  sonar?: SonarConfig;
  semgrep?: SemgrepConfig;
  trivy?: TrivyConfig;
  checkov?: CheckovConfig;

  publish?: PublishConfig;
  junitPath?: string;
  artifacts?: {
    upload?: ArtifactUpload[];
    download?: ArtifactDownload[];
  };
  summary?: SummaryConfig;
}
