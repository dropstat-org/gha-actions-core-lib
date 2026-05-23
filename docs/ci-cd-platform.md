# CI/CD Platform — dropstat-org

## Architecture

```
dropstat-org/
├── gha-actions-core-lib    ← Core engine (Node.js action + org-wide CI workflow)
├── gha-actions-config      ← Deploy policies (approvers, permissions)
├── .github                 ← Org profile (excluded from mandatory CI)
└── [product repos]         ← Each repo has its own action.yaml + deploy.yml
```

## How the mandatory CI works

Every push or PR to any repo in the org automatically triggers the CI defined in `gha-actions-core-lib/.github/workflows/ci.yml`, with no setup required in the target repo.

This is achieved through an **Org Ruleset** (ID 16774808) of type `workflows` configured in GitHub → Organization Settings → Rules.

The ruleset applies to all repos except: `.github`, `gha-actions-core-lib`, `gha-actions-config`.

## Pipeline flow by repo type

The `config` stage reads the repo's `action.yaml` and detects the type automatically.

### Terraform (`type: terraform`)
```
Config → Plan → Checkov Terraform
```

### App / Library (`type: app | library`)
```
Config → Compile → Unit Test → Linter → Semgrep → SonarQube → Trivy → Checkov → Publish
```
Stages not defined in `action.yaml` are automatically `skipped`.

## `action.yaml` structure per repo

```yaml
version: "1.0"
type: terraform          # app | library | terraform | infra | deploy | generic

metadata:
  projectId: my-project
  serviceId: my-service
  version: "1.0.0"

stages:
  - name: plan
    commands:
      - terragrunt init -input=false
      - terragrunt run-all plan -input=false
  - name: checkov_tf
    checkov:
      framework: terraform_plan
  - name: deploy
    deploy:
      environment: prod
    commands:
      - terragrunt run-all apply --terragrunt-non-interactive -auto-approve
  - name: release
```

## Manual deploy (Terraform)

Deploy does not run in CI. It is triggered manually with:

```bash
gh workflow run deploy.yml -f environment=prod -f confirm=deploy
```

Internal flow: `Config → Validate → Plan → Deploy (with Environment approval)`

## Deploy policy (`gha-actions-config/deploy-policy.yaml`)

Defines who can approve deploys across all org repos:

```yaml
teams: []              # teams with deploy permission (e.g. [devops, platform])
users: []              # individual users with permission
min_permission: write  # minimum required permission on the repo
```

If the file does not exist, the action uses these same values as defaults.

---

## Lessons learned

### 1. Required Workflows and private repos
- The Required Workflows API (`/orgs/{org}/actions/required_workflows`) is deprecated since January 2024. Use the **Rulesets API** (`POST /orgs/{org}/rulesets` with `rules: [{type: "workflows"}]`).
- Required workflows **can only reference actions from the same source repo or public repos**. If the workflow is in `repo-A` and references `repo-B` (private), it fails with "pre-flight 0 jobs".
- Solution: the required workflow and the action it uses must be in the same repo (`gha-actions-core-lib`).

### 2. `uses: ./` in required workflows
- `uses: ./` resolves against the **target repo's** workspace (the one that triggered the CI), not the workflow's source repo.
- If the action is embedded in the source repo (`.github/actions/opscore/`), the runner looks for it in the target → "Can't find action.yml" error.
- Correct solution: use the full reference `uses: dropstat-org/gha-actions-core-lib@main`.

### 3. The action took 4-10 minutes
**Symptom:** the `Run dropstat-org/gha-actions-core-lib@main` step finished in under 1 second, but the job took 4+ minutes.

**Root cause:** the action uses Octokit (GitHub HTTP client) to query `gha-actions-config`. When the request completes, the Node.js HTTP client leaves **keep-alive connections** open in the background. Node.js cannot exit while there are active connections → the runner kills them after a timeout (~4 min) → "Cleaning up orphan processes" appears in the logs.

**Fix in `src/index.ts`:**
```typescript
// before
run();

// after
run().then(() => process.exit(0)).catch(() => process.exit(1));
```

**Attempts that did NOT fix the problem:**
- Switching `node24` → `node20` (dropped from 10 to 4.5 min — Node 20 is pre-installed on runners, avoids downloading the runtime, but the root cause remained)
- Removing `node_modules` from the repo (action download takes <1 sec regardless)
- Making the repo public (no impact on timing)

### 4. `node_modules` must not be in git
A Node.js action compiled with `ncc` is self-contained in `dist/bundle/index.js`. Committing `node_modules` (13,500 files) is unnecessary and pollutes git history. Add to `.gitignore`:
```
node_modules/
dist/stages/
dist/workflows/
...
```
Only `dist/bundle/index.js` and `dist/bundle/licenses.txt` need to be tracked.

### 5. GitHub Environment approval on the free plan
The native GitHub Environments approval button (required reviewers) requires the **Teams plan or higher**. Not available on the Free plan.
Workaround used: `workflow_dispatch` with a `confirm=deploy` input as a manual activation gate.

### 6. Terragrunt interactive prompt in CI
`terragrunt run-all apply` prompts "Are you sure? (y/n)" in interactive mode, causing the job to hang for 26+ minutes until timeout.
Fix: add `--terragrunt-non-interactive -auto-approve` to the apply command in `action.yaml`.
