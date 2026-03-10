# 🫐 raspberry-next

A live system monitor for Raspberry Pi, built with Next.js. Displays real-time hardware metrics in a clean dark dashboard — auto-refreshing every 3 seconds.

![dashboard](https://placehold.co/800x450/1f2937/6b7280?text=raspberry-next+dashboard)

## Metrics

| Category | What's shown |
|----------|-------------|
| **System** | Hostname, kernel version, uptime, network IP(s) |
| **CPU** | Model, core count, frequency, temperature, usage %, load average (1/5/15m) |
| **GPU** | Temperature (via `vcgencmd`) |
| **Memory** | Total / used / free with usage bar |
| **Disk** | Total / used / free for `/` with usage bar |
| **Power** | Core voltage, throttle warnings (under-voltage, freq cap, thermal limit) |

## Getting started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser on the same network.

To run persistently in the background:

```bash
bun build
bun start
```

## Stack

- [Next.js 16](https://nextjs.org) — App Router, Route Handlers
- [React 19](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript

## How it works

`GET /api/system` is a server-side Route Handler that reads metrics from:

- Node.js `os` module — hostname, arch, memory, load averages
- `/proc/stat` — CPU usage (sampled twice, 200 ms apart)
- `/sys/class/thermal/thermal_zone0/temp` — CPU temperature
- `/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq` — CPU frequency
- `vcgencmd` — GPU temperature, core voltage, throttle flags
- `df -B1 /` — disk usage

The page polls this endpoint every 3 seconds and renders the results client-side.
