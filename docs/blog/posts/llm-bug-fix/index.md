---
date:
  created: 2025-12-29
categories:
  - LLM
tags:
  - Python
  - MkDocs
---

# Can LLM really fix new bugs ?
This website is built using mkdocs-material, which I chose because it’s easy to maintain and comes with a built-in blog plugin. Overall, it’s been a smooth experience until today.

<!-- more -->

I ran into a strange issue while switching from a Conda-based setup to a standalone Python installation. Everything seemed fine at first, but when I ran mkdocs serve, the hot-reloading feature suddenly stopped working.

Naturally, I turned to ChatGPT for help. We went down a deep debugging rabbit hole, checking various dependencies. ChatGPT suggested verifying the versions of mkdocs, mkdocs-material, and watchdog. Despite 30 minutes of back-and-forth and trying different combinations, I still couldn’t pinpoint the problem.

Frustrated, I fell back on the old, reliable approach: Google. A quick search for “mkdocs serve not watching files” led me to the answer almost immediately. The first result pointed to a bug already filed on the MkDocs GitHub repository (https://github.com/mkdocs/mkdocs/issues/4032). The root cause turned out to be the click dependency. Downgrading click fixed the issue right away.

Painfully, I learned a valuable lesson: while ChatGPT can be a powerful assistant, it’s not a silver bullet for debugging - especially when dealing with newly introduced or obscure bugs. Sometimes, conventional search and existing bug reports are still the fastest path to a solution.