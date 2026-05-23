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
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const SummaryWriter_1 = require("../utils/SummaryWriter");
jest.mock('@actions/core', () => ({
    summary: {
        addHeading: jest.fn().mockReturnThis(),
        addCodeBlock: jest.fn().mockReturnThis(),
        write: jest.fn().mockResolvedValue(undefined),
    },
    warning: jest.fn(),
}));
// exec se mockea para evitar llamadas reales a bash
jest.mock('@actions/exec', () => ({
    exec: jest.fn().mockImplementation(async (_cmd, _args, opts) => {
        opts?.listeners?.stdout?.(Buffer.from('plan output captured'));
        return 0;
    }),
}));
const writer = new SummaryWriter_1.SummaryWriter();
describe('SummaryWriter', () => {
    let tmpFile;
    beforeEach(() => {
        jest.clearAllMocks();
        tmpFile = path.join(os.tmpdir(), `summary-test-${Date.now()}.txt`);
    });
    afterEach(() => {
        if (fs.existsSync(tmpFile))
            fs.unlinkSync(tmpFile);
    });
    it('writes file content to summary with title', async () => {
        fs.writeFileSync(tmpFile, 'Plan: 3 to add, 0 to destroy.');
        await writer.write({ title: 'Terraform Plan', file: tmpFile, format: 'hcl' });
        expect(core.summary.addHeading).toHaveBeenCalledWith('Terraform Plan', 2);
        expect(core.summary.addCodeBlock).toHaveBeenCalledWith('Plan: 3 to add, 0 to destroy.', 'hcl');
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
        jest.requireMock('@actions/exec').exec.mockImplementationOnce(async (_c, _a, opts) => {
            opts?.listeners?.stdout?.(Buffer.from('   '));
            return 0;
        });
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
//# sourceMappingURL=SummaryWriter.test.js.map