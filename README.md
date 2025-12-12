# n8n-nodes-odoo-tameson

This is a maintained fork of the `n8n-nodes-odoo-tameson` community node. The original GitLab repository disappeared, so the codebase was reconstructed from the published `0.1.5` npm tarball and rewritten in TypeScript.

The node connects n8n to Odoo (tested with v13) and includes an offset-aware "get many" option for custom resources.

## Development

```bash
npm install
npm run build   # compiles TypeScript and copies assets to dist/
npm run lint    # optional lint pass
```

Publish a new version by bumping `package.json` and running `npm publish` after `npm run build`.
