# Deployment Rules

Never deploy automatically.

Never restart these unless explicitly requested:

- PM2
- Nginx
- EC2 services
- Discord bot process
- Production API process

Never modify without explicit request:

- `.github/workflows/`
- Cloudflare DNS
- SSL / certificates
- S3 bucket policy
- CloudFront / CDN routing
- Production `.env`
- MongoDB indexes or schemas

Before deployment advice:

1. Audit changed files.
2. Confirm build commands.
3. Confirm target server/process.
4. Confirm rollback option.
5. Ask before performing destructive or production-impacting steps.
