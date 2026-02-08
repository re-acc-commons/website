# /publish Command

Build and deploy the static site from the knowledge commons.

## Usage

```
/publish [subcommand] [options]
```

## Subcommands

### site

Build and deploy the full static site:

```bash
# Build and deploy
/publish site

# Build only, don't deploy
/publish site --preview

# Force full rebuild
/publish site --force
```

### preview

Start a local preview server:

```bash
# Start preview server
/publish preview

# Specify port
/publish preview --port 8080
```

### status

Check publishing status:

```bash
/publish status
```

## Options

| Option | Description |
|--------|-------------|
| `--preview` | Build without deploying |
| `--force` | Force full rebuild |
| `--port <n>` | Preview server port (default: 1313) |
| `--generator` | Override generator (quartz, hugo) |

## Site Generators

### Quartz (Default)

Optimized for knowledge commons:
- Wiki-style backlinks
- Knowledge graph visualization
- Built-in search
- Obsidian-compatible

### Hugo

For maximum customization:
- Extensive theme ecosystem
- Fast builds
- Flexible taxonomies

## Build Process

1. **Prepare** - Copy and transform content
2. **Generate** - Run static site generator
3. **Optimize** - Minify, compress images
4. **Deploy** - Push to hosting platform

## Deployment Options

Configured in `config/publishing.yaml`:

### GitHub Pages

```yaml
deploy:
  method: github-pages
  branch: gh-pages
```

### Netlify

```yaml
deploy:
  method: netlify
  site_id: <site-id>
```

### Vercel

```yaml
deploy:
  method: vercel
  project: <project-name>
```

### Custom

```yaml
deploy:
  method: custom
  command: "rsync -avz public/ user@server:/var/www/"
```

## Output

```
Building site...
✓ Prepared 156 entities
✓ Generated indexes
✓ Built graph data
✓ Compiled site (4.2s)
✓ Optimized assets

Deploying to GitHub Pages...
✓ Pushed to gh-pages branch
✓ Site live at https://commons.opencivics.co

Build complete in 12.3s
```

## Preview Mode

Local preview with hot reload:

```bash
/publish preview
```

```
Starting preview server...
✓ Server running at http://localhost:1313
✓ Watching for changes

Press Ctrl+C to stop
```

## Configuration

In `config/publishing.yaml`:

```yaml
publishing:
  generator: quartz
  site:
    name: "Open Protocol Library"
    domain: "commons.opencivics.co"
  deploy:
    method: github-pages
    auto_deploy: true
```

## Related Commands

- `/digest` - Generate activity digests
- `/status` - Current commons status

## Skill

Uses: `generate-site`
