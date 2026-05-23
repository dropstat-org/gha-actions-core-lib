import * as fs from 'fs';
import * as core from '@actions/core';
import { PlanSummary } from '../utils/PlanSummary';

jest.mock('@actions/core', () => ({
  info:    jest.fn(),
  warning: jest.fn(),
  summary: {
    addRaw:  jest.fn().mockReturnThis(),
    write:   jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('fs');

const mockExistsSync   = fs.existsSync   as jest.Mock;
const mockReadFileSync = fs.readFileSync  as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ── fromJson ──────────────────────────────────────────────────────────────────

describe('PlanSummary.fromJson', () => {
  it('classifies create resources', () => {
    const plan = {
      resource_changes: [
        { address: 'aws_instance.web', type: 'aws_instance', change: { actions: ['create'] } },
      ],
    };
    const result = PlanSummary.fromJson(plan, 'acct-d-01');
    expect(result.toCreate).toHaveLength(1);
    expect(result.toCreate[0].address).toBe('aws_instance.web');
    expect(result.toCreate[0].action).toBe('create');
    expect(result.toUpdate).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
    expect(result.toReplace).toHaveLength(0);
  });

  it('classifies update resources', () => {
    const plan = {
      resource_changes: [
        { address: 'aws_s3_bucket.data', type: 'aws_s3_bucket', change: { actions: ['update'] } },
      ],
    };
    expect(PlanSummary.fromJson(plan, 'acct').toUpdate).toHaveLength(1);
  });

  it('classifies delete resources', () => {
    const plan = {
      resource_changes: [
        { address: 'aws_sg.old', type: 'aws_security_group', change: { actions: ['delete'] } },
      ],
    };
    expect(PlanSummary.fromJson(plan, 'acct').toDelete).toHaveLength(1);
  });

  it('classifies delete+create (replace) when both actions are present', () => {
    const plan = {
      resource_changes: [
        { address: 'aws_instance.db', type: 'aws_instance', change: { actions: ['delete', 'create'] } },
      ],
    };
    const result = PlanSummary.fromJson(plan, 'acct');
    expect(result.toReplace).toHaveLength(1);
    expect(result.toReplace[0].action).toBe('replace');
    expect(result.toCreate).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
  });

  it('classifies create+delete (create_before_destroy) as replace', () => {
    const plan = {
      resource_changes: [
        { address: 'aws_instance.app', type: 'aws_instance', change: { actions: ['create', 'delete'] } },
      ],
    };
    expect(PlanSummary.fromJson(plan, 'acct').toReplace).toHaveLength(1);
  });

  it('classifies no-op resources', () => {
    const plan = {
      resource_changes: [
        { address: 'aws_vpc.main', type: 'aws_vpc', change: { actions: ['no-op'] } },
      ],
    };
    expect(PlanSummary.fromJson(plan, 'acct').noOp).toHaveLength(1);
  });

  it('handles multiple resources across different action types', () => {
    const plan = {
      resource_changes: [
        { address: 'a', type: 't', change: { actions: ['create'] } },
        { address: 'b', type: 't', change: { actions: ['update'] } },
        { address: 'c', type: 't', change: { actions: ['delete'] } },
        { address: 'd', type: 't', change: { actions: ['delete', 'create'] } },
      ],
    };
    const r = PlanSummary.fromJson(plan, 'acct');
    expect(r.toCreate).toHaveLength(1);
    expect(r.toUpdate).toHaveLength(1);
    expect(r.toDelete).toHaveLength(1);
    expect(r.toReplace).toHaveLength(1);
  });

  it('returns empty buckets when resource_changes is absent', () => {
    const r = PlanSummary.fromJson({}, 'acct');
    expect(r.toCreate).toHaveLength(0);
    expect(r.toUpdate).toHaveLength(0);
    expect(r.toDelete).toHaveLength(0);
    expect(r.toReplace).toHaveLength(0);
    expect(r.noOp).toHaveLength(0);
  });

  it('sets account from second argument', () => {
    expect(PlanSummary.fromJson({}, 'my-account').account).toBe('my-account');
  });

  it('defaults account to "unknown" when not provided', () => {
    expect(PlanSummary.fromJson({}).account).toBe('unknown');
  });
});

// ── fromFile ─────────────────────────────────────────────────────────────────

describe('PlanSummary.fromFile', () => {
  it('infers account name from filename', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ resource_changes: [] }));
    const result = PlanSummary.fromFile('tfplan1-acct-d-01.json');
    expect(result.account).toBe('acct-d-01');
  });

  it('handles nested path', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ resource_changes: [] }));
    const result = PlanSummary.fromFile('/workspace/tfplan2-prod-account.json');
    expect(result.account).toBe('prod-account');
  });

  it('parses resource changes from file content', () => {
    const plan = {
      resource_changes: [
        { address: 'aws_instance.web', type: 'aws_instance', change: { actions: ['create'] } },
      ],
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(plan));
    const result = PlanSummary.fromFile('tfplan1-acct.json');
    expect(result.toCreate).toHaveLength(1);
  });
});

// ── toMarkdown ────────────────────────────────────────────────────────────────

describe('PlanSummary.toMarkdown', () => {
  function makeResult(overrides: Partial<ReturnType<typeof PlanSummary.fromJson>> = {}) {
    return {
      account: 'test-account',
      toCreate: [], toUpdate: [], toDelete: [], toReplace: [], noOp: [],
      ...overrides,
    };
  }

  it('includes account name in heading', () => {
    const md = PlanSummary.toMarkdown(makeResult({ account: 'my-acct' }));
    expect(md).toContain('`my-acct`');
  });

  it('includes count table', () => {
    const md = PlanSummary.toMarkdown(makeResult({
      toCreate:  [{ address: 'a', type: 't', action: 'create' }],
      toUpdate:  [],
      toDelete:  [],
      toReplace: [],
    }));
    expect(md).toContain('| ➕ Create');
    expect(md).toContain('| 1  |');
  });

  it('includes resource lists for non-empty buckets', () => {
    const md = PlanSummary.toMarkdown(makeResult({
      toCreate: [{ address: 'aws_instance.web', type: 'aws_instance', action: 'create' }],
    }));
    expect(md).toContain('aws_instance.web');
    expect(md).toContain('aws_instance');
  });

  it('does not include empty bucket sections', () => {
    const md = PlanSummary.toMarkdown(makeResult());
    expect(md).not.toContain('Resources to Create');
    expect(md).not.toContain('Resources to Delete');
  });

  it('includes delete section with destructive label', () => {
    const md = PlanSummary.toMarkdown(makeResult({
      toDelete: [{ address: 'aws_s3_bucket.old', type: 'aws_s3_bucket', action: 'delete' }],
    }));
    expect(md).toContain('destructive');
  });
});

// ── writeSummaryForPlans ──────────────────────────────────────────────────────

describe('PlanSummary.writeSummaryForPlans', () => {
  it('warns and returns without writing when planFiles is empty', async () => {
    await PlanSummary.writeSummaryForPlans([]);
    expect(core.summary.write).not.toHaveBeenCalled();
    const coreModule = require('@actions/core');
    expect(coreModule.warning).toHaveBeenCalledWith(expect.stringContaining('no plan files'));
  });

  it('skips and warns for files that do not exist', async () => {
    mockExistsSync.mockReturnValue(false);
    await PlanSummary.writeSummaryForPlans(['missing.json']);
    expect(core.summary.write).not.toHaveBeenCalled();
    const coreModule = require('@actions/core');
    expect(coreModule.warning).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('writes summary to core.summary for each valid plan file', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({
      resource_changes: [
        { address: 'aws_instance.web', type: 'aws_instance', change: { actions: ['create'] } },
      ],
    }));

    await PlanSummary.writeSummaryForPlans(['tfplan1-acct-d-01.json']);

    expect(core.summary.addRaw).toHaveBeenCalled();
    expect(core.summary.write).toHaveBeenCalled();
  });

  it('calls addRaw once per file then write once', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ resource_changes: [] }));

    await PlanSummary.writeSummaryForPlans(['tfplan1-a.json', 'tfplan2-b.json']);

    expect(core.summary.addRaw).toHaveBeenCalledTimes(2);
    expect(core.summary.write).toHaveBeenCalledTimes(1);
  });

  it('skips unparseable files and continues', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce('not-json')
      .mockReturnValueOnce(JSON.stringify({ resource_changes: [] }));

    await PlanSummary.writeSummaryForPlans(['bad.json', 'tfplan1-good.json']);

    // Only the valid file contributes to the summary
    expect(core.summary.addRaw).toHaveBeenCalledTimes(1);
    expect(core.summary.write).toHaveBeenCalledTimes(1);
  });
});
