import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { AbstractBranchStage } from '../base/AbstractBranchStage';
import { StageConfig } from '../../entities/StageConfig';
import { Environment } from '../../enums/Environment';
import { ActionsCoreLibError } from '../../entities/ActionYaml';
import { ErrorCode } from '../../enums/ErrorCode';

/**
 * ECSDeployStage — native ECS deployment using task definition registration.
 *
 * Equivalent to aws-actions/amazon-ecs-deploy-task-definition:
 *   1. Fetches current task definition
 *   2. Renders new revision with target image
 *   3. Registers the new task definition revision
 *   4. Updates the ECS service
 *   5. Optionally waits for service stability
 *
 * Branch → Environment mapping (enforced at TypeScript level, cannot be overridden):
 *   develop   → dev
 *   release/* → qa
 *   main      → prod  ← ONLY main can deploy to prod
 *
 * Security gate: if ecs_deploy.environment = 'prod' and branch is NOT main → error.
 *
 * action.yaml usage:
 *   - name: deploy
 *     deploy:
 *       environment: dev          # GitHub environment gate (secrets, approvals)
 *     ecs_deploy:
 *       cluster:            dropstat-dev
 *       service:            demo-dev
 *       container:          demo-dev
 *       wait_for_stability: true
 *       # image: dropstat/demo   (optional — lib uses ECR_REGISTRY/image:env)
 *       # image_tag: dev         (optional — defaults to env name)
 */
export class ECSDeployStage extends AbstractBranchStage {

  // ── Branch routing ─────────────────────────────────────────────────────────

  protected async onDevelop(stage: StageConfig): Promise<void> {
    await this.deploy(stage, Environment.DEV);
  }

  protected async onRelease(stage: StageConfig): Promise<void> {
    await this.deploy(stage, Environment.QA);
  }

  protected async onMaster(stage: StageConfig): Promise<void> {
    await this.deploy(stage, Environment.PROD);
  }

  protected async onFeature(_stage: StageConfig): Promise<void> {
    core.info('ECSDeployStage: feature branch — no deploy (image built by publish stage)');
  }

  protected async onHotfix(_stage: StageConfig): Promise<void> {
    core.info('ECSDeployStage: hotfix branch — no deploy (merge to main triggers prod deploy)');
  }

  protected async onDefault(_stage: StageConfig): Promise<void> {
    core.info(`ECSDeployStage: no deploy action for branch '${this.branchType}'`);
  }

  // ── Core deploy logic ──────────────────────────────────────────────────────

  private async deploy(stage: StageConfig, env: Environment): Promise<void> {
    const cfg = stage.ecs_deploy;
    if (!cfg) {
      throw new ActionsCoreLibError(
        ErrorCode.MISSING_STAGE_COMMANDS,
        `Stage '${stage.name}' requires an 'ecs_deploy' config block`,
      );
    }

    // ── Security gate: prod is ONLY reachable from main ──────────────────────
    // If someone explicitly sets environment: prod on a non-main branch → fail hard.
    // This blocks accidental or malicious prod deploys from feature/develop/release branches.
    const requestedEnv = cfg.environment;
    if (env !== Environment.PROD && (requestedEnv === 'prod' || requestedEnv === 'production')) {
      throw new ActionsCoreLibError(
        ErrorCode.DEPLOY_PLAN_COMMAND_FORBIDDEN,
        `❌ BLOCKED: 'environment: prod' is only allowed on the main branch. ` +
        `Current branch type: '${this.branchType}'. Merge to main first.`,
      );
    }

    // ── Resolve env var references ($VAR) in config values ───────────────────
    // Allows action.yaml to use GitHub environment variables:
    //   cluster: $ECS_CLUSTER  →  process.env.ECS_CLUSTER
    // Set per GitHub environment (dev/qa/prod) so same action.yaml works for all.
    const resolve = (val: string): string =>
      val.startsWith('$') ? (process.env[val.slice(1)] ?? val) : val;

    const cluster   = resolve(cfg.cluster);
    const service   = resolve(cfg.service);
    const container = resolve(cfg.container);
    // image_tag resolution:
    //   1. cfg.image_tag set and resolves to non-empty → use it (e.g. $SHA_TAG = sha-052c920)
    //   2. cfg.image_tag resolves to empty (env var not set) → fall back to env name (dev/qa/prod)
    //   3. cfg.image_tag not set → env name
    const resolvedTag = cfg.image_tag ? resolve(cfg.image_tag) : '';
    const imageTag    = resolvedTag || env;
    const waitStable = cfg.wait_for_stability !== false;
    const region     = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-2';

    // ── Assume ECS deploy role from GitHub environment secret ─────────────────
    // GitHub injects ECS_DEPLOY_ROLE from the environment matching stage.deploy.environment.
    // dev env  → ECS_DEPLOY_ROLE = arn:...:453531893227:role/GHA-App-ECS-dev
    // prod env → ECS_DEPLOY_ROLE = arn:...:PROD_ACCOUNT:role/GHA-App-ECS-prod
    const deployRole = process.env.ECS_DEPLOY_ROLE;
    if (deployRole) {
      core.info(`Assuming ECS deploy role: ${deployRole}`);
      await this.assumeRole(deployRole, `ecs-${env}-${Date.now()}`);
    }

    core.info(`\n🚀 ECS Deploy → ${env.toUpperCase()}`);
    core.info(`   cluster:   ${cluster}`);
    core.info(`   service:   ${service}`);
    core.info(`   image tag: :${imageTag}`);

    // ── 1. Fetch current task definition ─────────────────────────────────────
    const taskDefName = cfg.task_definition ?? service;
    let taskDefJson = '';
    await exec.exec('aws', [
      'ecs', 'describe-task-definition',
      '--task-definition', taskDefName,
      '--query', 'taskDefinition',
      '--region', region,
      '--output', 'json',
    ], { listeners: { stdout: (d: Buffer) => { taskDefJson += d.toString(); } } });

    type TaskDef = Record<string, unknown> & { containerDefinitions: Record<string, unknown>[] };
    const taskDef = JSON.parse(taskDefJson.trim()) as TaskDef;

    // ── 2. Render new revision with updated image ─────────────────────────────
    // Registry resolution priority:
    //   1. ECR_REGISTRY env var  (e.g. "944884337673.dkr.ecr.us-east-2.amazonaws.com")
    //      → descriptive org-level variable, set once, used by all CD repos
    //   2. AWS_ACCOUNT_ID env var → constructs registry from account ID
    //   3. No registry          → image used as-is (e.g. public image)
    const ecrRegistry = process.env.ECR_REGISTRY?.trim() ?? '';
    const accountId   = process.env.AWS_ACCOUNT_ID?.trim() ?? '';
    const ecr = ecrRegistry || (accountId ? `${accountId}.dkr.ecr.${region}.amazonaws.com` : '');

    // Auto-derive image from metadata when not set in action.yaml.
    // projectId=gha + serviceId=demo-api-ecs → gha-demo-api-ecs
    // With ECR_IMAGE_ORG=dropstat → dropstat/gha-demo-api-ecs
    const { projectId, serviceId } = this.config.metadata;
    const derivedImage = (() => {
      if (projectId && serviceId) {
        const name      = `${projectId}-${serviceId}`;
        const orgPrefix = process.env.ECR_IMAGE_ORG?.trim() ?? '';
        return orgPrefix ? `${orgPrefix}/${name}` : name;
      }
      return '';
    })();
    const imageBase = cfg.image ?? derivedImage;
    const fullImage = imageBase
      ? (ecr ? `${ecr}/${imageBase}:${imageTag}` : `${imageBase}:${imageTag}`)
      : null;

    const containerDefs = taskDef.containerDefinitions.map(c => {
      if (c['name'] === container && fullImage) {
        core.info(`   ${container} → ${fullImage}`);
        return { ...c, image: fullImage };
      }
      return c;
    });

    // Strip ECS read-only fields before registering a new revision
    const stripped: Record<string, unknown> = { ...taskDef, containerDefinitions: containerDefs };
    for (const key of ['taskDefinitionArn','revision','status','requiresAttributes','compatibilities','registeredAt','registeredBy']) {
      delete stripped[key];
    }
    const newTaskDef = stripped;

    // ── 3. Register new task definition revision ──────────────────────────────
    let newArn = '';
    await exec.exec('aws', [
      'ecs', 'register-task-definition',
      '--cli-input-json', JSON.stringify(newTaskDef),
      '--query', 'taskDefinition.taskDefinitionArn',
      '--region', region,
      '--output', 'text',
    ], { listeners: { stdout: (d: Buffer) => { newArn += d.toString(); } } });

    newArn = newArn.trim();
    core.info(`   new revision: ${newArn}`);

    // ── 4. Update ECS service ─────────────────────────────────────────────────
    // --force-new-deployment cancels any previous rolling deployment and starts
    // a fresh one, preventing the service from cycling old failing task defs.
    await exec.exec('aws', [
      'ecs', 'update-service',
      '--cluster', cluster,
      '--service', service,
      '--task-definition', newArn,
      '--force-new-deployment',
      '--region', region,
    ]);

    // ── 5. Wait for service stability ─────────────────────────────────────────
    if (waitStable) {
      core.info('   Waiting for service stability...');
      await exec.exec('aws', [
        'ecs', 'wait', 'services-stable',
        '--cluster', cluster, '--services', service, '--region', region,
      ]);
      core.info('✅ Service stable');
    } else {
      core.info('✅ Deploy initiated (stability check skipped)');
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async assumeRole(roleArn: string, sessionName: string): Promise<void> {
    let json = '';
    await exec.exec('aws', [
      'sts', 'assume-role',
      '--role-arn', roleArn,
      '--role-session-name', sessionName,
      '--query', 'Credentials',
      '--output', 'json',
    ], { listeners: { stdout: (d: Buffer) => { json += d.toString(); } } });

    const c = JSON.parse(json.trim()) as { AccessKeyId: string; SecretAccessKey: string; SessionToken: string };
    core.exportVariable('AWS_ACCESS_KEY_ID',     c.AccessKeyId);
    core.exportVariable('AWS_SECRET_ACCESS_KEY', c.SecretAccessKey);
    core.exportVariable('AWS_SESSION_TOKEN',     c.SessionToken);
  }
}
