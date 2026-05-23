import * as https from 'https';
import * as core from '@actions/core';
import * as yaml from 'js-yaml';

function buildBaseUrl(): string {
  const org  = process.env.GITHUB_REPOSITORY_OWNER ?? 'dropstat';
  const repo = core.getInput('platform-config-repo') || 'platform-config';
  return `https://raw.githubusercontent.com/${org}/${repo}/main`;
}

// ---- Public types ----

export interface HotfixExceptionPolicy {
  allowed_repos:    string[];
  skippable_stages: string[];
}

export interface DeployApproverPolicy {
  teams: string[];
  users: string[];
  min_permission: string;
}

export interface TrivyPolicy {
  severity: string;
  soft_fail: boolean;
  upload_sarif: boolean;
}

export interface CheckovPolicy {
  soft_fail: boolean;
  upload_sarif: boolean;
}

export interface SemgrepPolicy {
  default_config: string;
  soft_fail: boolean;
  upload_sarif: boolean;
}

export interface SecurityPolicyFile {
  trivy: TrivyPolicy;
  checkov: CheckovPolicy;
  semgrep: SemgrepPolicy;
}

export interface ToolVersionsFile {
  sonarqube_scanner: string;
  trivy: string;
  checkov: string;
  semgrep: string;
  terragrunt: string;
}

// ---- Built-in defaults (mirror what was previously hardcoded per stage) ----

const HOTFIX_DEFAULTS: HotfixExceptionPolicy = {
  allowed_repos:    [],
  skippable_stages: ['linter', 'semgrep', 'sonarqube', 'checkov'],
};

const DEPLOY_DEFAULTS: Record<string, DeployApproverPolicy> = {
  terraform: { teams: ['platform-engineers'], users: [], min_permission: 'maintain' },
  infra:     { teams: ['platform-engineers'], users: [], min_permission: 'maintain' },
  deploy:    { teams: ['platform-engineers'], users: [], min_permission: 'maintain' },
};

const SECURITY_DEFAULTS: SecurityPolicyFile = {
  trivy:   { severity: 'CRITICAL,HIGH', soft_fail: false, upload_sarif: true  },
  checkov: { soft_fail: false, upload_sarif: false },
  semgrep: { default_config: 'auto',    soft_fail: false, upload_sarif: false },
};

const VERSIONS_DEFAULTS: ToolVersionsFile = {
  sonarqube_scanner: '6.2.1.4610',
  trivy:      '0.70.0',
  checkov:    '3.2.527',
  semgrep:    '1.162.0',
  terragrunt: '0.68.1',
};

// ---- HTTP fetch ----

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function loadFile<T>(filename: string, defaults: T): Promise<T> {
  try {
    const raw = await httpGet(`${buildBaseUrl()}/${filename}`);
    const parsed = yaml.load(raw);
    if (parsed && typeof parsed === 'object') return parsed as T;
    return defaults;
  } catch (err) {
    core.warning(`platform-config: ${filename} unavailable — using built-in defaults (${(err as Error).message})`);
    return defaults;
  }
}

// ---- Cached promises — one fetch per file per process invocation ----

let _hotfixPolicy:  Promise<HotfixExceptionPolicy>              | undefined;
let _deployPolicy:  Promise<Record<string, DeployApproverPolicy>> | undefined;
let _securityPolicy: Promise<SecurityPolicyFile>                | undefined;
let _toolVersions:  Promise<ToolVersionsFile>                   | undefined;

export class PlatformConfigLoader {
  static hotfixPolicy(): Promise<HotfixExceptionPolicy> {
    return (_hotfixPolicy ??= loadFile('hotfix-policy.yaml', HOTFIX_DEFAULTS));
  }

  static deployPolicy(): Promise<Record<string, DeployApproverPolicy>> {
    return (_deployPolicy ??= loadFile('deploy-policy.yaml', DEPLOY_DEFAULTS));
  }

  static securityPolicy(): Promise<SecurityPolicyFile> {
    return (_securityPolicy ??= loadFile('security-policy.yaml', SECURITY_DEFAULTS));
  }

  static toolVersions(): Promise<ToolVersionsFile> {
    return (_toolVersions ??= loadFile('tool-versions.yaml', VERSIONS_DEFAULTS));
  }
}
