# Git Safety Rules

Do not run Git commands unless approved.

Never suggest destructive Git commands casually.

Avoid unless explicitly approved:

```bash
git reset
git reset --hard
git clean -fd
git restore
git checkout
git pull
git rebase
git stash
git push --force
git push --force-with-lease
```

Before any Git advice, inspect safely:

```bash
git status --short
git remote -v
git branch --show-current
git diff --name-only
```

Never assume the remote is `origin`.

Explain consequences before any command that can overwrite, discard, merge, or move work.
