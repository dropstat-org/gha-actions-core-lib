import * as fs from 'fs';
import { PlanExtractor } from '../utils/PlanExtractor';

jest.mock('@actions/core', () => ({
  info:    jest.fn(),
  warning: jest.fn(),
}));

jest.mock('fs');

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractor(overrides?: { projectId?: string; serviceId?: string; version?: string; commitHash?: string }) {
  return new PlanExtractor({
    projectId:  overrides?.projectId  ?? 'platform',
    serviceId:  overrides?.serviceId  ?? 'infra',
    version:    overrides?.version    ?? '1.2.3',
    commitHash: overrides?.commitHash,
  });
}

function planLine(envIdValue?: string): string {
  const variables = envIdValue !== undefined
    ? { env_id: { value: envIdValue } }
    : {};
  return JSON.stringify({ format_version: '1.0', variables });
}

beforeEach(() => jest.clearAllMocks());

// ── isPlanCommand ─────────────────────────────────────────────────────────────

describe('PlanExtractor.isPlanCommand', () => {
  it('returns true for "terragrunt plan"', () => {
    expect(PlanExtractor.isPlanCommand('terragrunt plan')).toBe(true);
  });

  it('returns true for "terragrunt run-all plan"', () => {
    expect(PlanExtractor.isPlanCommand('terragrunt run-all plan')).toBe(true);
  });

  it('returns true for plan with working-dir flag', () => {
    expect(PlanExtractor.isPlanCommand('terragrunt plan --terragrunt-working-dir ./envs/dev')).toBe(true);
  });

  it('returns true for run-all plan with working-dir flag', () => {
    expect(PlanExtractor.isPlanCommand('terragrunt run-all plan --terragrunt-working-dir ./dir')).toBe(true);
  });

  it('returns false for "terragrunt apply"', () => {
    expect(PlanExtractor.isPlanCommand('terragrunt apply tfplan.binary')).toBe(false);
  });

  it('returns false for "terragrunt state list"', () => {
    expect(PlanExtractor.isPlanCommand('terragrunt state list')).toBe(false);
  });

  it('returns false for "terragrunt state rm"', () => {
    expect(PlanExtractor.isPlanCommand('terragrunt state rm some.resource')).toBe(false);
  });

  it('returns false for "terragrunt import"', () => {
    expect(PlanExtractor.isPlanCommand('terragrunt import aws_instance.example i-1234')).toBe(false);
  });

  it('ignores leading/trailing whitespace', () => {
    expect(PlanExtractor.isPlanCommand('  terragrunt plan  ')).toBe(true);
  });
});

// ── parseFlags ────────────────────────────────────────────────────────────────

describe('PlanExtractor.parseFlags', () => {
  it('returns runAll=false and workingDir=null for plain plan', () => {
    expect(PlanExtractor.parseFlags('terragrunt plan')).toEqual({ runAll: false, workingDir: null });
  });

  it('detects run-all', () => {
    expect(PlanExtractor.parseFlags('terragrunt run-all plan').runAll).toBe(true);
  });

  it('extracts --terragrunt-working-dir value', () => {
    const flags = PlanExtractor.parseFlags('terragrunt plan --terragrunt-working-dir ./envs/dev');
    expect(flags.workingDir).toBe('./envs/dev');
  });

  it('detects both run-all and working-dir', () => {
    const flags = PlanExtractor.parseFlags('terragrunt run-all plan --terragrunt-working-dir ./dir');
    expect(flags.runAll).toBe(true);
    expect(flags.workingDir).toBe('./dir');
  });

  it('returns workingDir=null when flag is absent', () => {
    expect(PlanExtractor.parseFlags('terragrunt run-all plan').workingDir).toBeNull();
  });

  it('returns workingDir=null when flag appears last with no value', () => {
    expect(PlanExtractor.parseFlags('terragrunt plan --terragrunt-working-dir').workingDir).toBeNull();
  });
});

// ── File naming ───────────────────────────────────────────────────────────────

describe('PlanExtractor — file naming', () => {
  it('rawBinaryName uses version when no commitHash', () => {
    expect(extractor().rawBinaryName(1)).toBe('tfplan1-platform-infra-1.2.3.binary');
  });

  it('rawBinaryName appends commitHash when present', () => {
    expect(extractor({ commitHash: 'abc1234' }).rawBinaryName(1))
      .toBe('tfplan1-platform-infra-1.2.3-abc1234.binary');
  });

  it('rawBinaryName uses cmdIndex in filename', () => {
    expect(extractor().rawBinaryName(3)).toBe('tfplan3-platform-infra-1.2.3.binary');
  });

  it('rawJsonName mirrors rawBinaryName with .json extension', () => {
    expect(extractor().rawJsonName(2)).toBe('tfplan2-platform-infra-1.2.3.json');
  });

  it('rawJsonName appends commitHash', () => {
    expect(extractor({ commitHash: 'deadbeef' }).rawJsonName(1))
      .toBe('tfplan1-platform-infra-1.2.3-deadbeef.json');
  });

  it('perAccountName produces tfplan{idx}-{account}.json', () => {
    expect(PlanExtractor.perAccountName(1, 'acct-d-01')).toBe('tfplan1-acct-d-01.json');
  });

  it('perAccountName uses cmdIndex correctly', () => {
    expect(PlanExtractor.perAccountName(2, 'my-account')).toBe('tfplan2-my-account.json');
  });
});

// ── buildRunCommands ──────────────────────────────────────────────────────────

describe('PlanExtractor.buildRunCommands', () => {
  it('case 1 — plain plan: appends --out to plan and builds show command', () => {
    const [plan, show] = extractor().buildRunCommands('terragrunt plan', 1);
    expect(plan).toBe('terragrunt plan --out tfplan1-platform-infra-1.2.3.binary');
    expect(show).toBe('terragrunt show -json tfplan1-platform-infra-1.2.3.binary > tfplan1-platform-infra-1.2.3.json');
  });

  it('case 2 — run-all plan: show command includes run-all', () => {
    const [plan, show] = extractor().buildRunCommands('terragrunt run-all plan', 1);
    expect(plan).toBe('terragrunt run-all plan --out tfplan1-platform-infra-1.2.3.binary');
    expect(show).toBe('terragrunt run-all show -json tfplan1-platform-infra-1.2.3.binary > tfplan1-platform-infra-1.2.3.json');
  });

  it('case 3 — plan with working-dir: show command propagates --terragrunt-working-dir', () => {
    const [plan, show] = extractor().buildRunCommands(
      'terragrunt plan --terragrunt-working-dir ./envs/dev', 1,
    );
    expect(plan).toBe('terragrunt plan --terragrunt-working-dir ./envs/dev --out tfplan1-platform-infra-1.2.3.binary');
    expect(show).toBe('terragrunt show -json tfplan1-platform-infra-1.2.3.binary --terragrunt-working-dir ./envs/dev > tfplan1-platform-infra-1.2.3.json');
  });

  it('case 4 — run-all plan with working-dir: show has both run-all and working-dir', () => {
    const [plan, show] = extractor().buildRunCommands(
      'terragrunt run-all plan --terragrunt-working-dir ./envs/prod', 2,
    );
    expect(plan).toBe('terragrunt run-all plan --terragrunt-working-dir ./envs/prod --out tfplan2-platform-infra-1.2.3.binary');
    expect(show).toBe('terragrunt run-all show -json tfplan2-platform-infra-1.2.3.binary --terragrunt-working-dir ./envs/prod > tfplan2-platform-infra-1.2.3.json');
  });

  it('uses cmdIndex in filenames', () => {
    const [plan, show] = extractor().buildRunCommands('terragrunt plan', 5);
    expect(plan).toContain('tfplan5-');
    expect(show).toContain('tfplan5-');
  });
});

// ── buildModuleGroupsCommand ──────────────────────────────────────────────────

describe('PlanExtractor.buildModuleGroupsCommand', () => {
  it('returns plain command when no working-dir', () => {
    expect(extractor().buildModuleGroupsCommand('terragrunt plan'))
      .toBe('terragrunt output-module-groups 2>/dev/null');
  });

  it('appends --terragrunt-working-dir when present', () => {
    expect(extractor().buildModuleGroupsCommand('terragrunt plan --terragrunt-working-dir ./dir'))
      .toBe('terragrunt output-module-groups --terragrunt-working-dir ./dir 2>/dev/null');
  });
});

// ── resolveAccountName ────────────────────────────────────────────────────────

describe('PlanExtractor.resolveAccountName', () => {
  it('returns env_id.value when present', () => {
    const plan = { variables: { env_id: { value: 'account-d-01' } } };
    expect(PlanExtractor.resolveAccountName(plan, 'fallback')).toBe('account-d-01');
  });

  it('returns fallback when variables is absent', () => {
    expect(PlanExtractor.resolveAccountName({}, 'fallback')).toBe('fallback');
  });

  it('returns fallback when env_id is absent', () => {
    const plan = { variables: { other_var: { value: 'x' } } };
    expect(PlanExtractor.resolveAccountName(plan, 'fallback')).toBe('fallback');
  });

  it('returns fallback when env_id.value is empty string', () => {
    const plan = { variables: { env_id: { value: '' } } };
    expect(PlanExtractor.resolveAccountName(plan, 'fallback')).toBe('fallback');
  });

  it('returns fallback when env_id.value is not a string', () => {
    const plan = { variables: { env_id: { value: 42 } } };
    expect(PlanExtractor.resolveAccountName(plan, 'fallback')).toBe('fallback');
  });
});

// ── extractPerAccountPlans ────────────────────────────────────────────────────

describe('PlanExtractor.extractPerAccountPlans', () => {
  const mockExistsSync    = fs.existsSync    as jest.Mock;
  const mockReadFileSync  = fs.readFileSync  as jest.Mock;
  const mockWriteFileSync = fs.writeFileSync as jest.Mock;

  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
    mockWriteFileSync.mockImplementation(() => undefined);
  });

  it('returns [] and warns when raw file does not exist', () => {
    const core = require('@actions/core');
    mockExistsSync.mockReturnValue(false);

    const result = extractor().extractPerAccountPlans(1, 'fallback');

    expect(result).toEqual([]);
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('returns [] for an empty file', () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue('');
    expect(extractor().extractPerAccountPlans(1, 'fallback')).toEqual([]);
  });

  it('extracts one plan using env_id.value as account name', () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue(planLine('acct-d-01'));

    const result = extractor().extractPerAccountPlans(1, 'fallback');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      cmdIndex:    1,
      accountName: 'acct-d-01',
      filePath:    'tfplan1-acct-d-01.json',
    });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'tfplan1-acct-d-01.json',
      expect.any(String),
      'utf8',
    );
  });

  it('uses fallback when env_id is absent', () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue(planLine());

    const result = extractor().extractPerAccountPlans(1, 'myproject');

    expect(result[0].accountName).toBe('myproject');
    expect(result[0].filePath).toBe('tfplan1-myproject.json');
  });

  it('extracts multiple modules from a multi-line JSONL file', () => {
    const jsonl = [planLine('acct-d-01'), planLine('acct-d-02')].join('\n');
    jest.spyOn(fs, 'readFileSync').mockReturnValue(jsonl);

    const result = extractor().extractPerAccountPlans(1, 'fallback');

    expect(result).toHaveLength(2);
    expect(result[0].accountName).toBe('acct-d-01');
    expect(result[1].accountName).toBe('acct-d-02');
  });

  it('skips and warns on non-JSON lines', () => {
    const core = require('@actions/core');
    const jsonl = ['not-json', planLine('acct-d-01')].join('\n');
    jest.spyOn(fs, 'readFileSync').mockReturnValue(jsonl);

    const result = extractor().extractPerAccountPlans(1, 'fallback');

    expect(result).toHaveLength(1);
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('skipping non-JSON'));
  });

  it('ignores blank lines between modules', () => {
    const jsonl = `${planLine('acct-d-01')}\n\n${planLine('acct-d-02')}\n`;
    jest.spyOn(fs, 'readFileSync').mockReturnValue(jsonl);

    expect(extractor().extractPerAccountPlans(1, 'fallback')).toHaveLength(2);
  });

  it('writes pretty-printed JSON to the per-account file', () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue(planLine('acct-d-01'));

    extractor().extractPerAccountPlans(1, 'fallback');

    const written = (fs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
    expect(() => JSON.parse(written)).not.toThrow();
    expect(written).toContain('\n');  // pretty-printed
  });

  it('uses cmdIndex in the output file names', () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue(planLine('acct-d-01'));

    const result = extractor().extractPerAccountPlans(3, 'fallback');

    expect(result[0].filePath).toBe('tfplan3-acct-d-01.json');
  });

  it('assigns modulePath from modulePaths by module index', () => {
    const jsonl = [planLine('acct-d-01'), planLine('acct-d-02')].join('\n');
    jest.spyOn(fs, 'readFileSync').mockReturnValue(jsonl);

    const result = extractor().extractPerAccountPlans(1, 'fallback', [
      '/live/network/vpc',
      '/live/shared/ecr',
    ]);

    expect(result[0].modulePath).toBe('/live/network/vpc');
    expect(result[1].modulePath).toBe('/live/shared/ecr');
  });

  it('leaves modulePath undefined when no modulePaths provided', () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue(planLine('acct-d-01'));

    const result = extractor().extractPerAccountPlans(1, 'fallback');

    expect(result[0].modulePath).toBeUndefined();
  });

  it('leaves modulePath undefined when modulePaths array is shorter than modules', () => {
    const jsonl = [planLine('acct-d-01'), planLine('acct-d-02')].join('\n');
    jest.spyOn(fs, 'readFileSync').mockReturnValue(jsonl);

    // Only one path provided for two modules
    const result = extractor().extractPerAccountPlans(1, 'fallback', ['/live/network/vpc']);

    expect(result[0].modulePath).toBe('/live/network/vpc');
    expect(result[1].modulePath).toBeUndefined();
  });

  it('moduleIndex advances only on successfully-parsed JSON lines', () => {
    const core = require('@actions/core');
    // non-JSON line in the middle — modulePaths[0] should map to acct-d-01, [1] to acct-d-02
    const jsonl = [planLine('acct-d-01'), 'not-json', planLine('acct-d-02')].join('\n');
    jest.spyOn(fs, 'readFileSync').mockReturnValue(jsonl);

    const result = extractor().extractPerAccountPlans(1, 'fallback', [
      '/live/network/vpc',
      '/live/shared/ecr',
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].modulePath).toBe('/live/network/vpc');
    expect(result[1].modulePath).toBe('/live/shared/ecr');
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('skipping non-JSON'));
  });
});

// ── flattenModuleGroups ───────────────────────────────────────────────────────

describe('PlanExtractor.flattenModuleGroups', () => {
  it('returns [] for empty string', () => {
    expect(PlanExtractor.flattenModuleGroups('')).toEqual([]);
  });

  it('returns [] for whitespace-only string', () => {
    expect(PlanExtractor.flattenModuleGroups('   ')).toEqual([]);
  });

  it('returns [] for invalid JSON', () => {
    expect(PlanExtractor.flattenModuleGroups('not-json')).toEqual([]);
  });

  it('returns [] for empty groups object', () => {
    expect(PlanExtractor.flattenModuleGroups('{}')).toEqual([]);
  });

  it('returns all paths in order for a single group', () => {
    const json = JSON.stringify({ 'Group 1': ['/live/network/vpc', '/live/network/tgw'] });
    expect(PlanExtractor.flattenModuleGroups(json)).toEqual(['/live/network/vpc', '/live/network/tgw']);
  });

  it('returns first path from each group when multiple groups present', () => {
    const json = JSON.stringify({
      'Group 1': ['/live/network/vpc'],
      'Group 2': ['/live/shared/ecr'],
      'Group 3': ['/live/workloads/dev'],
    });
    expect(PlanExtractor.flattenModuleGroups(json)).toEqual([
      '/live/network/vpc',
      '/live/shared/ecr',
      '/live/workloads/dev',
    ]);
  });

  it('handles groups with empty path arrays gracefully', () => {
    const json = JSON.stringify({ 'Group 1': [], 'Group 2': ['/live/shared/ecr'] });
    const result = PlanExtractor.flattenModuleGroups(json);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('');  // empty group → ''
    expect(result[1]).toBe('/live/shared/ecr');
  });

  it('trims leading/trailing whitespace before parsing', () => {
    const json = `\n  ${JSON.stringify({ 'G': ['/a/b'] })}  \n`;
    expect(PlanExtractor.flattenModuleGroups(json)).toEqual(['/a/b']);
  });
});

// ── filterPerAccountPlans ─────────────────────────────────────────────────────

describe('PlanExtractor.filterPerAccountPlans', () => {
  it('keeps per-account files and removes parent files', () => {
    const files = [
      'tfplan1-platform-infra-1.2.3-abc.json',   // parent — should be removed
      'tfplan1-acct-d-01.json',                  // per-account — should be kept
      'tfplan2-platform-infra-1.2.3.json',       // parent — should be removed
      'tfplan2-acct-p-01.json',                  // per-account — should be kept
    ];

    const result = extractor().filterPerAccountPlans(files);

    expect(result).toEqual(['tfplan1-acct-d-01.json', 'tfplan2-acct-p-01.json']);
  });

  it('filters by basename so full paths work', () => {
    const files = [
      '/workspace/tfplan1-platform-infra-1.0.0.json',
      '/workspace/tfplan1-acct-d-01.json',
    ];

    const result = extractor().filterPerAccountPlans(files);

    expect(result).toEqual(['/workspace/tfplan1-acct-d-01.json']);
  });

  it('returns all files when none match the parent pattern', () => {
    const files = ['tfplan1-acct-d-01.json', 'tfplan2-acct-p-01.json'];
    expect(extractor().filterPerAccountPlans(files)).toEqual(files);
  });

  it('returns empty array when all files are parents', () => {
    const files = [
      'tfplan1-platform-infra-1.0.0.json',
      'tfplan2-platform-infra-2.0.0-abc.json',
    ];
    expect(extractor().filterPerAccountPlans(files)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(extractor().filterPerAccountPlans([])).toEqual([]);
  });

  it('escapes regex special characters in projectId and serviceId', () => {
    const e = extractor({ projectId: 'my.project', serviceId: 'my.service' });
    const files = [
      'tfplan1-my.project-my.service-1.0.0.json',  // parent — removed
      'tfplan1-my-project-my-service-1.0.0.json',  // NOT a parent — kept (dot ≠ dash)
      'tfplan1-acct-d-01.json',                    // per-account — kept
    ];

    const result = e.filterPerAccountPlans(files);

    expect(result).toContain('tfplan1-my-project-my-service-1.0.0.json');
    expect(result).toContain('tfplan1-acct-d-01.json');
    expect(result).not.toContain('tfplan1-my.project-my.service-1.0.0.json');
  });
});
