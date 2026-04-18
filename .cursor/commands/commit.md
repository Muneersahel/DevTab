# Commit

Review the current git working tree and create well-structured commit(s) for the pending changes.

If the user added extra instructions in the same message (after invoking this command), treat that text as optional guidance. If it conflicts with the rules below, prefer safety, clarity, and accurate grouping.

## Requirements

- Inspect the current git status and relevant diffs before deciding how to commit
- Group files by **logical change**, not by file type alone
- Create **one commit per coherent concern** when the changes clearly represent separate units of work
- Avoid mixing unrelated refactors, generated files, formatting-only changes, and feature or bug-fix work unless they are tightly coupled
- Stage files explicitly per commit; do not sweep unrelated changes into the same commit
- Use **Conventional Commits** style when possible, for example `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`, `chore(scope): ...`, `docs(scope): ...`, or `test(scope): ...`
- Write commit subjects in the imperative mood and keep them concise
- Add a commit body when it helps explain intent, tradeoffs, migrations, follow-up work, or grouped file rationale

## Decision rules

1. Start by identifying whether the pending changes should become **one commit or multiple commits**
2. If multiple commits are appropriate, split them by user-visible feature, bug fix, subsystem, or cleanup concern
3. If generated files belong to a source change, commit them with the source change that produced them
4. If a file appears unrelated or risky to include, stop and ask **one concise clarification question** before committing
5. If the working tree contains user changes that should not be touched, leave them uncommitted and explain why

## Commit quality

- Prefer accurate scopes from the repo, for example `extension`, `dashboard`, `wakatime`, `settings`, `ci`, `deps`, or another domain suggested by the changed paths
- Make the subject line explain **what changed**, not just that files were updated
- Use the body to explain **why** the change exists and what was grouped together
- Avoid vague subjects like `update files`, `fix stuff`, `changes`, or `wip`
- Avoid giant omnibus commits when the diff can be cleanly split

## Execution

- If the changes can be committed confidently, go ahead and create the commit(s)
- Before each commit, verify the staged files belong together
- After committing, summarize each commit with:
  - the commit hash
  - the commit message
  - the files or concern it grouped
- If no safe commit can be made without clarification, explain the blocking ambiguity briefly and ask one targeted question

## Workspace context

Follow [AGENTS.md](../../AGENTS.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md) when they apply to the changed files or workflow.

## Example subjects

- `feat(dashboard): add activity chart gradient from coding totals`
- `fix(settings): validate WakaTime credential before save`
- `chore(ci): run lint and tests on pull requests`
- `docs(readme): document pnpm test:ci for contributors`
