import * as core from '@actions/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SummaryWriter } from '../utils/SummaryWriter';

jest.mock('@actions/core', () => ({
  summary: {
    addHeading:   jest.fn().mockReturnThis(),
    addCodeBlock: jest.fn().mockReturnThis(),
    write:        jest.fn().mockResolvedValue(undefined),
  },
  warning: jest.fn(),
}));

// exec se mockea para evitar llamadas reales a bash
jest.mock('@actions/exec', () => ({
  exec: jest.fn().mockImplementation(
    async (_cmd: string, _args: string[], opts: { listeners?: { stdout?: (d: Buffer) => void } }) => {
      opts?.listeners?.stdout?.(Buffer.from('plan output captured'));
      return 0;
    },
  ),
}));

const writer = new SummaryWriter();

describe('SummaryWriter', () => {
  let tmpFile: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tmpFile = path.join(os.tmpdir(), `summary-test-${Date.now()}.txt`);
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('writes file content to summary with title', async () => {
    fs.writeFileSync(tmpFile, 'Plan: 3 to add, 0 to destroy.');
    await writer.write({ title: 'Terraform Plan', file: tmpFile, format: 'hcl' });

    expect(core.summary.addHeading).toHaveBeenCalledWith('Terraform Plan', 2);
    expect(core.summary.addCodeBlock).toHaveBeenCalledWith(
      'Plan: 3 to add, 0 to destroy.',
      'hcl',
    );
    expect(core.summary.write).toHaveBeenCalled();
  });

  it('writes command output to summary', async () => {
    await writer.write({ title: 'Output', command: 'echo hello', format: 'text' });

    expect(core.summary.addCodeBlock).toHaveBeenCalledWith('plan output captured', 'text');
  });

  it('warns and skips when file does not exist', async () => {
    await writer.write({ file: '/nonexistent/file.txt' });

    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(core.summary.write).not.toHaveBeenCalled();
  });

  it('skips write when content is empty', async () => {
    jest.requireMock('@actions/exec').exec.mockResolvedValueOnce(0);
    // command returns empty
    jest.requireMock('@actions/exec').exec.mockImplementationOnce(
      async (_c: string, _a: string[], opts: { listeners?: { stdout?: (d: Buffer) => void } }) => {
        opts?.listeners?.stdout?.(Buffer.from('   '));
        return 0;
      },
    );
    await writer.write({ command: 'echo ""' });
    expect(core.summary.write).not.toHaveBeenCalled();
  });

  it('uses text as default format', async () => {
    fs.writeFileSync(tmpFile, 'output');
    await writer.write({ file: tmpFile });
    expect(core.summary.addCodeBlock).toHaveBeenCalledWith('output', 'text');
  });

  it('omits heading when title is not set', async () => {
    fs.writeFileSync(tmpFile, 'output');
    await writer.write({ file: tmpFile });
    expect(core.summary.addHeading).not.toHaveBeenCalled();
  });
});
