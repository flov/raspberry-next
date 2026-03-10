# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev       # start dev server on :3000
bun build     # production build
bun lint      # run eslint
```

There is no test suite.

## Stack

- **Next.js 16** with the App Router (`app/` directory)
- **React 19**, **TypeScript** (strict mode), **Tailwind CSS v4**
- Runs on a **Raspberry Pi** — server-side code can read Pi-specific files like `/sys/class/thermal/thermal_zone0/temp` and call `vcgencmd`

## Architecture

This is a Raspberry Pi system monitor. The app has two parts:

- **`app/api/system/route.ts`** — Route Handler that collects system metrics server-side using Node's `os` module, `/proc/stat`, `/sys` filesystem, `df`, and `vcgencmd`. CPU usage is calculated by sampling `/proc/stat` twice with a 200ms sleep.
- **`app/page.tsx`** — Client component (`'use client'`) that polls `/api/system` every 3 seconds and renders a dark-themed dashboard with cards for System, CPU, Memory, and Disk.

## Path aliases

`@/*` maps to the repo root (e.g. `@/app/...`, `@/lib/...`).

## Tailwind v4 notes

Config is CSS-based — theme tokens are defined in `app/globals.css` using `@theme inline { ... }`, not in a `tailwind.config.js`.
