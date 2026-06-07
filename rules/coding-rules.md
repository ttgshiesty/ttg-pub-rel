# Coding Rules

## Preservation

- Never delete unrelated code.
- Never rewrite entire files unless explicitly requested.
- Preserve all existing functionality.
- Use targeted patches.
- Do not simplify by removing features.
- Do not replace real code with placeholders like `rest unchanged`.

## Full File Rule

When asked for a full file:

- Return the entire file.
- Do not omit imports.
- Do not omit exports.
- Do not omit existing functions.
- Do not replace sections with comments.

## Patch Rule

When a targeted fix is enough, return:

```md
## File
path/to/file

## Replace This
```code
old code
```

## With This
```code
new code
```

## Why
short reason
```

## Debugging

- Fix root cause, not symptoms.
- Add logging only when useful.
- Do not leave noisy debug logs unless requested.
- Verify field names against API docs before changing mappings.
