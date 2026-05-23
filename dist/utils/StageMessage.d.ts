/**
 * Well-known output keys produced by ActionsCoreLib stages.
 * Use these constants when emitting or consuming stage outputs to avoid
 * string typos and make inter-stage contracts explicit.
 */
export declare enum StageOutputKey {
    PLAN_FILE = "plan_file",
    PLAN_SUMMARY = "plan_summary",
    IMAGE_TAG = "image_tag",// sha-4f9c21a
    IMAGE_VERSION = "image_version",// v1.4.2-sha-4f9c21a
    IMAGE_REF = "image_ref",// full ECR URL with sha tag
    ARTIFACT_URL = "artifact_url",
    VERSION = "version",
    TAG = "tag",
    DEPLOY_ENV = "deploy_env",
    DEPLOY_URL = "deploy_url",
    SCAN_PASSED = "scan_passed",
    SCAN_FINDINGS = "scan_findings"
}
/**
 * Typed inter-stage communication.
 *
 * emit()       → core.setOutput  (readable in same job via steps.id.outputs.key)
 * exportEnv()  → core.exportVariable  (readable by all subsequent steps in the job)
 * read()       → process.env lookup  (values injected by the workflow from prior outputs)
 */
export declare class StageMessage {
    /**
     * Emits a named output for this step.
     * In the workflow YAML, reference it as: ${{ steps.<id>.outputs.<key> }}
     */
    static emit(key: StageOutputKey, value: string): void;
    /**
     * Exports a value as an environment variable visible to all subsequent
     * steps in the same job — no YAML wiring needed.
     */
    static exportEnv(name: string, value: string): void;
    /**
     * Reads a value that was injected into this step's environment by the
     * workflow (typically from a previous job's output).
     */
    static read(envVarName: string, fallback?: string): string;
    /**
     * Reads a required env value — throws a clear error if absent,
     * making the missing wiring easy to diagnose.
     */
    static require(envVarName: string): string;
}
//# sourceMappingURL=StageMessage.d.ts.map