**English** | [日本語](0004-branch-strategy.ja.md)

# ADR-0004: Change `main` only through pull requests that pass CI, and let Cloudflare Workers Builds deploy `main` as it is

- Status: Accepted
- Date: 2026-10-22

## Context

The app is published at crc.shortarrow.jp on Cloudflare Workers. What is published should be a commit that has passed the type check, the unit tests and the E2E tests.

Deploying from GitHub Actions needs a Cloudflare API token stored as a repository secret. Cloudflare does not accept GitHub's OIDC tokens, so the token cannot be replaced with short-lived credentials. Cloudflare Workers Builds, connected to the repository through a GitHub App, deploys without any credentials kept in GitHub, but it deploys a branch as soon as it is pushed, without waiting for CI.

## Decision

- Work is done on short-lived branches and merged into `main` through pull requests (trunk-based development through pull requests).
- A ruleset on `main` requires the CI check `test` to pass on a branch that is up to date with `main` before merging, so the merged content itself has been tested.
- Workers Builds uses `main` as the production branch and deploys it to crc.shortarrow.jp. Other branches are built as previews, each at its own preview URL.

## Reasons

- `main` holds only tested commits, so deploying `main` as soon as it changes publishes only tested commits.
- No Cloudflare credentials are kept in GitHub.
- Each pull request can be seen running at its preview URL before it is merged.

## Consequences

- A ruleset on a private repository needs a paid GitHub plan, so the repository is public.

## Alternatives not adopted

- Push directly to `main` and deploy from GitHub Actions after CI: needs the Cloudflare API token as a repository secret.
- Push directly to `main`, and after CI move the commit to a `production` branch that Workers Builds deploys: needs no secret, but needs an extra branch and job, and lets untested commits into `main`.
- Push directly to `main` and let Workers Builds deploy `main`: commits that fail the tests are published before CI finishes.
