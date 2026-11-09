# CLAUDE.md

## Prompt Logging (required)

This project must record the prompts given to Claude Code. Group members: Peter, Jackson, and Laura. Every Claude Code session must keep `docs/prompts.md` up to date:

1. **Log each major prompt word for word.** When the user gives a new major prompt (a new task or feature request), add it as a top-level bullet in `docs/prompts.md`. Copy the prompt exactly as the user typed it, typos, casing, and `@file` mentions included. Do not paraphrase or fix spelling.
2. **Log revisions as sub-bullets.** If a later prompt in the session revises, corrects, or continues an earlier major prompt, do not add a new top-level bullet. Instead, add a one-sentence description of the revision as a sub-bullet under the original prompt's bullet.
3. **File under the right group member.** Put the prompt under the section for the user who is running the session (`## Peter`, `## Jackson`, or `## Laura`). Work out who the user is from `git config user.name` (or the user's email/identity in context). If it is still unclear, ask the user before logging.
4. **Keep chronological order.** Within each member's section, bullets must be in the order the prompts were used: the first bullet is the earliest prompt, and new prompts go at the bottom of that section.
5. **Log as you go.** Update `docs/prompts.md` in the same turn the prompt is handled. Don't batch the updates for later.

Format example:

```markdown
## Peter

- First major prompt, copied exactly as typed
  - One-sentence description of a follow-up revision to that prompt.
- Second major prompt, copied exactly as typed
```
