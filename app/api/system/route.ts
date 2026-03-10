import { NextResponse } from 'next/server'
import os from 'os'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf8').trim()
  } catch {
    return null
  }
}

function vcgencmd(cmd: string): string | null {
  try {
    return execSync(`vcgencmd ${cmd} 2>/dev/null`).toString().trim()
  } catch {
    return null
  }
}

async function getCpuUsage(): Promise<number> {
  const parseStat = () => {
    const line = readFileSync('/proc/stat', 'utf8').split('\n')[0]
    const nums = line.split(/\s+/).slice(1).map(Number)
    const idle = nums[3] + (nums[4] ?? 0)
    const total = nums.reduce((a, b) => a + b, 0)
    return { idle, total }
  }
  const s1 = parseStat()
  await sleep(200)
  const s2 = parseStat()
  const idle = s2.idle - s1.idle
  const total = s2.total - s1.total
  return Math.round((1 - idle / total) * 100)
}

function getDisk() {
  try {
    const parts = execSync('df -B1 /').toString().trim().split('\n')[1].split(/\s+/)
    return { total: +parts[1], used: +parts[2], free: +parts[3] }
  } catch {
    return null
  }
}

function getNetworkIPs() {
  const result: { name: string; address: string }[] = []
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (name === 'lo') continue
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4') result.push({ name, address: addr.address })
    }
  }
  return result
}

export async function GET() {
  const total = os.totalmem()
  const free = os.freemem()
  const cpus = os.cpus()

  // CPU temperature: prefer /sys file, fall back to vcgencmd
  const tempRaw = readFileSafe('/sys/class/thermal/thermal_zone0/temp')
  const cpuTempC = tempRaw ? +(+tempRaw / 1000).toFixed(1) : null

  // GPU temperature
  const gpuTempRaw = vcgencmd('measure_temp')
  const gpuTempC = gpuTempRaw ? +(gpuTempRaw.replace('temp=', '').replace("'C", '')) : null

  // CPU frequency from sysfs (kHz → MHz)
  const freqRaw = readFileSafe('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq')
  const cpuFreqMHz = freqRaw ? Math.round(+freqRaw / 1000) : null

  // Throttle flags (bit 0: under-voltage, bit 1: arm freq cap, bit 2: throttled)
  const throttledRaw = vcgencmd('get_throttled')
  const throttleHex = throttledRaw?.replace('throttled=', '') ?? null
  const throttleVal = throttleHex ? parseInt(throttleHex, 16) : 0
  const throttleFlags = {
    underVoltage: !!(throttleVal & 0x1),
    freqCapped: !!(throttleVal & 0x2),
    throttled: !!(throttleVal & 0x4),
    softTempLimit: !!(throttleVal & 0x8),
  }

  // Voltage
  const voltageRaw = vcgencmd('measure_volts core')
  const voltageV = voltageRaw ? +(voltageRaw.replace('volt=', '').replace('V', '')) : null

  return NextResponse.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    kernel: os.release(),
    uptime: os.uptime(),
    cpu: {
      model: cpus[0]?.model ?? 'Unknown',
      cores: cpus.length,
      frequencyMHz: cpuFreqMHz,
      temperatureC: cpuTempC,
      usage: await getCpuUsage(),
      loadAvg: os.loadavg(),
    },
    gpu: {
      temperatureC: gpuTempC,
    },
    memory: { total, free, used: total - free },
    disk: getDisk(),
    network: getNetworkIPs(),
    voltage: voltageV,
    throttle: throttleFlags,
    timestamp: Date.now(),
  })
}
