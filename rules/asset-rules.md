# Asset Rules

Current asset areas include:

- `client/public/`
- `client/src/data/pois/`
- `client/src/data/map-events/`
- `all_svgs/`
- `client/src/skill-tree/components/svgs/`
- `shiestybuddy/icons/`
- `atlas/`
- S3 bucket `assets.shiesty.me`

## Never Automatically

- Rename assets.
- Delete images.
- Move folders.
- Rewrite import paths.
- Remove references because an asset appears missing.

## Always Report First

- Missing assets.
- Duplicate assets.
- Case-sensitive filename conflicts.
- Broken image URLs.
- Unused assets.
- Incorrect extension casing.
- WebP/PNG duplicate conflicts.

## S3 Safety

Always inspect first:

```bash
aws s3 ls s3://assets.shiesty.me/ --recursive
```

Never use without explicit approval:

```bash
aws s3 sync --delete
aws s3 rm
```
