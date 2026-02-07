# re/acc commons website

The public website for the Regenerative Accelerationist Commons at [reacc.xyz](https://reacc.xyz).

## About

A static site that introduces the re/acc commons: a translocal network nation of regenerators using AI to accelerate the transition from extraction to life.

## Structure

```
├── index.html          # Homepage
├── manifesto.html      # The philosophy
├── governance.html     # Governance structure
├── join.html          # How to participate
├── 404.html           # Custom error page
├── css/
│   └── style.css      # Design system
├── js/
│   └── main.js        # Interactive elements
├── assets/
│   ├── favicon.svg    # Site icon
│   └── og-image.svg   # Social preview
├── CNAME              # Custom domain config
└── .nojekyll          # Bypass Jekyll processing
```

## Design

- **Aesthetic:** Solarpunk meets retro computing—regenerative pixel art with terminal influences
- **Palette:** Earth tones (moss green, amber, soil brown) with phosphor green tech accents
- **Typography:** Monospace for headers/code, sans-serif for body
- **Effects:** Subtle CRT scanlines, film grain, animated pixel garden

## Deployment

Deployed automatically via GitHub Actions to GitHub Pages when pushing to `main`.

### Local Development

Just open `index.html` in a browser. No build step required.

For live reload during development:
```bash
# Using Python
python -m http.server 8000

# Using Node
npx serve .
```

### Custom Domain

The site is configured for `reacc.xyz`. DNS records required:
- A record pointing to GitHub Pages IPs
- CNAME record for www subdomain (optional)

## Related

- [Constitution Repository](https://github.com/re-acc-commons/constitution)
- [Original Manifesto](https://omniharmonic.substack.com/p/a-regenerative-accelerationist-manifesto)
- [Discord](https://discord.gg/ungugB3nZv)
- [Telegram](https://t.me/+jLKtGdlcz90wOWEx)

## License

CC BY-SA 4.0 — Fork freely. Attribute kindly. Share alike.
