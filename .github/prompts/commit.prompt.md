---
name: commit
description: 'Review current git changes, group related files into coherent commits, and create clear conventional commit messages with descriptive bodies. Use when you want the agent to prepare or make high-quality commits without mixing unrelated changes.'
argument-hint: 'Optional commit guidance, for example: prefer fewer commits, split frontend and backend, or use scope api'
agent: agent
---

<!-- Tip: Use /create-prompt in chat to generate content with agent assistance -->

Review the current git working tree and create well-structured commit(s) for the pending changes.

Use `${input:args}` as optional guidance from the user. If it conflicts with the rules below, prefer safety, clarity, and accurate grouping.

Requirements:

- Inspect the current git status and relevant diffs before deciding how to commit
- Group files by **logical change**, not by file type alone
- Create **one commit per coherent concern** when the changes clearly represent separate units of work
- Avoid mixing unrelated refactors, generated files, formatting-only changes, and feature or bug-fix work unless they are tightly coupled
- Stage files explicitly per commit; do not sweep unrelated changes into the same commit
- Use **Conventional Commits** style when possible, for example `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`, `chore(scope): ...`, `docs(scope): ...`, or `test(scope): ...`
- Write commit subjects in the imperative mood and keep them concise
- Add a commit body when it helps explain intent, tradeoffs, migrations, follow-up work, or grouped file rationale

Decision rules:

1. Start by identifying whether the pending changes should become **one commit or multiple commits**
2. If multiple commits are appropriate, split them by user-visible feature, bug fix, subsystem, or cleanup concern
3. If generated files belong to a source change, commit them with the source change that produced them
4. If a file appears unrelated or risky to include, stop and ask **one concise clarification question** before committing
5. If the working tree contains user changes that should not be touched, leave them uncommitted and explain why

Commit quality rules:

- Prefer specific scopes such as `api`, `admin`, `marketing-web`, `mauzo-web`, `flutter`, `auth`, `payments`, or another accurate domain from the changed files
- Make the subject line explain **what changed**, not just that files were updated
- Use the body to explain **why** the change exists and what was grouped together
- Avoid vague subjects like `update files`, `fix stuff`, `changes`, or `wip`
- Avoid giant omnibus commits when the diff can be cleanly split

Execution behavior:

- If the changes can be committed confidently, go ahead and create the commit(s)
- Before each commit, verify the staged files belong together
- After committing, summarize each commit with:
  - the commit hash
  - the commit message
  - the files or concern it grouped
- If no safe commit can be made without clarification, explain the blocking ambiguity briefly and ask one targeted question

When relevant, follow workspace guidance in [copilot-instructions](../copilot-instructions.md) and [AGENTS](../../AGENTS.md).

Example outcomes:

- `feat(api): add product image upload endpoint`
- `fix(admin): correct inventory filter state reset`
- `refactor(flutter): extract finance insights widgets`
- `chore(mauzo-web): align material theme tokens with tailwind bridge`
