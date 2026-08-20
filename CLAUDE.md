MkDocs Material static site. Source in `docs/`, config in `mkdocs.yml`.

## Structure
- `docs/blog/posts/<slug>/index.md` — blog posts (MkDocs blog plugin)
- `docs/projects/posts/<slug>/index.md` — portfolio entries (second blog plugin instance)
- Each post is a folder so its images sit next to it and are referenced by bare filename
- `docs/stylesheets/` — `extra.css` (site tweaks), plus `present.css`, `walkthrough.css`
- `docs/javascripts/` — `mathjax.js` (math config), `present.js` (slide mode),
  `walkthrough.js` (step viewer)

## Nav tabs
Home | Projects | Blog

## Key config
- Two `blog` plugin instances: one for `blog/`, one for `projects/`
- `projects/` blog uses `post_url_format: "{slug}"` and no archive
- `blog/` uses `post_url_format: "{date}/{slug}"` with archive
- Post URLs derive from the H1 title, not the folder name
- Google Analytics: G-V55C7EE2NV
- MathJax via `extra_javascript`
- glightbox plugin for image lightboxes

## Writing a post
Front matter needs `date.created` and `categories`. Put a `<!-- more -->` after
the opening paragraph — without it the blog index renders the entire post
instead of an excerpt. `draft: true` keeps a post off the built site while still
showing it under `mkdocs serve`.

Unfinished posts live in `backup/drafts/{blog,projects}/<slug>/`, outside
`docs/` so MkDocs never sees them at all. Move a folder back under `docs/` to
resume work on it.

`backup/` is gitignored: the repo is public, and half-finished writing should
not be. That means drafts are **not** version-controlled or synced between
machines - they exist only on this disk, so back them up yourself.

## Present mode
`present.js` turns any page into a slide deck — **Slide show** button (bottom
right) or ++shift+p++. Every `##` starts a slide, a `---` splits one further,
and everything before the first `##` is the title slide. Nodes are moved into
the overlay rather than cloned, so MathJax and live widgets survive. The button
is hidden on blog/archive/category listings and on pages with no `##`.

Writing implication: short sections with one idea each present well and read
well; a wall of prose makes a poor slide.

### Step walkthroughs
`walkthrough.js` renders chess-style steppers from hand-written JSON in
`docs/data/`. Embed with `<div class="step-walk" data-name="<name>"></div>`.

## Dev
- `uv sync` — deps in `pyproject.toml`, `uv.lock` committed
- `uv run mkdocs serve` to preview locally
- `uv run mkdocs build --strict` — catches broken links and bad config
- Deploy: pushing `main` builds and publishes via `.github/workflows/deploy.yml`.
  Requires *Settings → Pages → Source: GitHub Actions*; the `gh-pages` branch is
  no longer the source.
- `mkdocs` is pinned below 2.0, which removes the plugin and theming systems
  with no migration path — both `blog` instances and `glightbox` depend on it.
