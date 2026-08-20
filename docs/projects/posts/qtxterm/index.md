---
date:
  created: 2026-08-15
categories:
  - Developer Tools
tags:
  - Python
  - Qt
  - Terminal

---
# qtxterm

A cross-platform tabbed terminal (Windows + Linux) built with PySide6, rendering
terminals via embedded [xterm.js](https://xtermjs.org/) in a `QWebEngineView`,
backed by real PTYs — ConPTY on Windows, `openpty` on Linux.

<!-- more -->

![qtxterm](screenshot.png)

## Features

- Tabs and split panes, moveable within or out of a tab, with tmux-style labels
- Any shell on the box — PowerShell, Command Prompt, Git Bash, or a specific
  WSL distro, discovered at runtime
- Commands and multi-step macros that open their own tabs and split panes
- Selection actions that send selected text to a search URL or a command on
  stdin, without shell interpolation
- Browser tabs and panes alongside terminals
- Themes and typography applied to both the terminal and window chrome

## Install

```bash
uv tool install git+https://github.com/rigidlab/qtxterm.git
qtxterm
```

Source: [github.com/rigidlab/qtxterm](https://github.com/rigidlab/qtxterm)
