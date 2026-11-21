# Proposal

## Why

The Malfunction Hackathon needs a reliable stage demo of a mock school AI portal with a Jesus-themed assistant that deliberately fails in funny, repeatable ways. A standalone gateway can control the joke timing and session locks within seven hours without relying on third-party chat page markup.

## What Changes

- Add a single-page Campus Managed AI Gateway demo with one live model provider and a visual preview of the second provider.
- Route prompts through an integrity check, a confession-only lock, a tangential parable, or a scripted second-turn cliffhanger. The server controls the lock and exact cutoff.
- Add rotating parody loading copy, distinct integrity and confession UI, quick-fill demo prompts, and a hidden reset command for repeatable runs.
- Scope the MVP to a single-process demo with temporary sessions. Exclude browser extensions, real school controls or surveillance, accounts, persistent storage, and multi-provider billing.

## Capabilities

### New Capabilities

- `school-ai-gateway`: Standalone demo chat, academic-integrity routing, session-local lock and reset, and deterministic cliffhanger presentation.

### Modified Capabilities

## Impact

Greenfield app in a repo that currently has a README and no existing app, tests, or capability specs. Adds a web UI, `POST /api/chat`, a local scripture bank, and one server-side model API dependency. Localhost is the baseline demo environment.
