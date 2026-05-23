"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformConfigLoader = void 0;
const https = __importStar(require("https"));
const core = __importStar(require("@actions/core"));
const yaml = __importStar(require("js-yaml"));
function buildBaseUrl() {
    const org = process.env.GITHUB_REPOSITORY_OWNER ?? 'dropstat';
    const repo = core.getInput('platform-config-repo') || 'platform-config';
    return `https://raw.githubusercontent.com/${org}/${repo}/main`;
}
// ---- Built-in defaults (mirror what was previously hardcoded per stage) ----
const HOTFIX_DEFAULTS = {
    allowed_repos: [],
    skippable_stages: ['linter', 'semgrep', 'sonarqube', 'checkov'],
};
const DEPLOY_DEFAULTS = {
    terraform: { teams: ['platform-engineers'], users: [], min_permission: 'maintain' },
    infra: { teams: ['platform-engineers'], users: [], min_permission: 'maintain' },
    deploy: { teams: ['platform-engineers'], users: [], min_permission: 'maintain' },
};
const SECURITY_DEFAULTS = {
    trivy: { severity: 'CRITICAL,HIGH', soft_fail: false, upload_sarif: true },
    checkov: { soft_fail: false, upload_sarif: false },
    semgrep: { default_config: 'auto', soft_fail: false, upload_sarif: false },
};
const VERSIONS_DEFAULTS = {
    sonarqube_scanner: '6.2.1.4610',
    trivy: '0.70.0',
    checkov: '3.2.527',
    semgrep: '1.162.0',
    terragrunt: '0.68.1',
};
// ---- HTTP fetch ----
function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            res.on('error', reject);
        }).on('error', reject);
    });
}
async function loadFile(filename, defaults) {
    try {
        const raw = await httpGet(`${buildBaseUrl()}/${filename}`);
        const parsed = yaml.load(raw);
        if (parsed && typeof parsed === 'object')
            return parsed;
        return defaults;
    }
    catch (err) {
        core.warning(`platform-config: ${filename} unavailable — using built-in defaults (${err.message})`);
        return defaults;
    }
}
// ---- Cached promises — one fetch per file per process invocation ----
let _hotfixPolicy;
let _deployPolicy;
let _securityPolicy;
let _toolVersions;
class PlatformConfigLoader {
    static hotfixPolicy() {
        return (_hotfixPolicy ??= loadFile('hotfix-policy.yaml', HOTFIX_DEFAULTS));
    }
    static deployPolicy() {
        return (_deployPolicy ??= loadFile('deploy-policy.yaml', DEPLOY_DEFAULTS));
    }
    static securityPolicy() {
        return (_securityPolicy ??= loadFile('security-policy.yaml', SECURITY_DEFAULTS));
    }
    static toolVersions() {
        return (_toolVersions ??= loadFile('tool-versions.yaml', VERSIONS_DEFAULTS));
    }
}
exports.PlatformConfigLoader = PlatformConfigLoader;
//# sourceMappingURL=PlatformConfigLoader.js.map