#!/usr/bin/env python3
"""Conformance check for pipeline-cd.yml's run-name block.

WHY THIS EXISTS: run-name cannot live in the reusable workflow (see
docs/templates/run-name-cd.yml) — GitHub only evaluates run-name from the
CALLER's own workflow file, so every app repo copies the block by hand. That
copy silently drifts: dropstat-desktop-app's manual-dispatch title never
carried the source branch, which matters because GitHub evaluates a GitHub
Environment's deployment-branch policy against the branch the RUN was
created from, not against the `environment` input — dispatching from a
disallowed branch fails in ~1s with no runner and no retrievable logs. The
run-name is the one piece of UI that explains that failure at a glance, so
its absence is a real gap, not a style nit.

This script does not enforce byte-for-byte equality with the template (repos
legitimately differ in which envs/branches they route to). It enforces the
one invariant that actually caused the incident: in the workflow_dispatch
branch of run-name, the source branch (github.ref_name or the branch input)
must be interpolated into the title.

Exit 0: no pipeline-cd.yml, or it has no run-name (terraform-only repos, no
        manual/env ambiguity to explain).
Exit 0: run-name present and contains the required disambiguation.
Exit 1: run-name present but missing it — this is the drift we're guarding.
"""
import re
import sys
from pathlib import Path

CD_PATH = Path(".github/workflows/pipeline-cd.yml")


def extract_run_name_block(text: str) -> str | None:
    m = re.search(r"^run-name:.*(?:\n(?:[ \t]+.*)?)*", text, re.MULTILINE)
    return m.group(0) if m else None


def extract_on_block(text: str) -> str:
    m = re.search(r"^on:.*(?:\n(?:[ \t]+.*)?)*", text, re.MULTILINE)
    return m.group(0) if m else ""


def paren_call(text: str, call_idx: int) -> str:
    """Given the index of a `format(` (or similar) token, return the full
    balanced-paren call starting there."""
    depth = 0
    end = None
    for i in range(call_idx, len(text)):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                end = i
                break
    return text[call_idx:end + 1] if end else text[call_idx:call_idx + 300]


def main() -> int:
    if not CD_PATH.exists():
        print(f"SKIP: {CD_PATH} not found in this repo.")
        return 0

    text = CD_PATH.read_text(encoding="utf-8")
    block = extract_run_name_block(text)
    if block is None:
        print(f"SKIP: {CD_PATH} has no run-name block (nothing to check).")
        return 0

    on_block = extract_on_block(text)
    dispatch_only = "workflow_dispatch" in on_block and "push:" not in on_block

    if dispatch_only:
        # Every run of this workflow IS a manual dispatch — no ternary
        # needed, so check the whole run-name value for the branch.
        fmt_idx = block.find("format(")
        dispatch_call = paren_call(block, fmt_idx) if fmt_idx != -1 else block
    else:
        if "workflow_dispatch" not in block:
            print("SKIP: run-name has no workflow_dispatch branch to check.")
            return 0
        # Isolate the workflow_dispatch arm of the ternary: from the
        # workflow_dispatch condition to the format(...) call that follows it.
        idx = block.index("workflow_dispatch")
        rest = block[idx:]
        fmt_idx = rest.find("format(")
        if fmt_idx == -1:
            print("FAIL: workflow_dispatch branch does not call format(...) — "
                  "cannot verify the dispatch title carries the source branch.")
            return 1
        dispatch_call = paren_call(rest, fmt_idx)

    # The source branch must be interpolated somewhere in that call/value —
    # either the run's own ref (github.ref_name) or an explicit branch input.
    has_branch = bool(re.search(r"ref_name|inputs\.branch", dispatch_call))

    if not has_branch:
        print("FAIL: run-name's workflow_dispatch title does not include the "
              "source branch (github.ref_name / inputs.branch).")
        print(
            "  Why it matters: GitHub gates a manual dispatch's target "
            "environment against the branch the RUN was created from, not "
            "against the `environment` input. Dispatching from a branch the "
            "env doesn't allow fails in ~1s with no runner and no retrievable "
            "logs — the run-name title is what makes that failure "
            "diagnosable at a glance instead of opaque.\n"
            "  Fix: interpolate github.ref_name (or the branch input) into "
            "the workflow_dispatch format() call. See "
            "docs/templates/run-name-cd.yml in gha-actions-core-lib for the "
            "canonical pattern."
        )
        return 1

    # Second invariant: no raw 40-char sha in the title.
    #
    # GitHub expressions have no substring/slice, so anything interpolated here
    # is shown at full length. `github.sha` (and `github.event.workflow_run.head_sha`)
    # are 40 chars and were being used as the fallback when `sha_tag` is empty,
    # which produced titles like
    #   Deploy → qa · cd2dbc15cabaf3837eb532598acb2e6a6141d9f8 · from develop
    # burying the two things the title exists to convey (target env, source branch).
    #
    # `sha_tag` itself is fine: the pipeline dispatches it as `sha-<7>`. The exact
    # commit is already a click away in the run's commit link, and the resolved
    # image is in the deploy job summary — so the fallback should be a literal.
    long_sha = re.search(r"github\.sha|head_sha", block)
    if long_sha:
        print(f"FAIL: run-name interpolates `{long_sha.group(0)}` — a full 40-char sha.")
        print(
            "  Why it matters: run-name cannot truncate (no substring function in "
            "GitHub expressions), so the whole sha lands in the run title and pushes "
            "the target env and source branch out of view.\n"
            "  Fix: use a literal fallback, e.g. "
            "`github.event.inputs.sha_tag || 'commit'`. See "
            "docs/templates/run-name-cd.yml for the canonical pattern."
        )
        return 1

    print("OK: run-name's workflow_dispatch title includes the source branch "
          "and carries no full-length sha.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
