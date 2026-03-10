'use client'

import { useEffect, useState } from 'react'

interface SystemData {
  hostname: string
  platform: string
  arch: string
  kernel: string
  uptime: number
  cpu: {
    model: string
    cores: number
    frequencyMHz: number | null
    temperatureC: number | null
    usage: number
    loadAvg: [number, number, number]
  }
  gpu: {
    temperatureC: number | null
  }
  memory: { total: number; free: number; used: number }
  disk: { total: number; used: number; free: number } | null
  network: { name: string; address: string }[]
  voltage: number | null
  throttle: {
    underVoltage: boolean
    freqCapped: boolean
    throttled: boolean
    softTempLimit: boolean
  }
  timestamp: number
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  return (bytes / 1e3).toFixed(1) + ' KB'
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function UsageBar({ value, warn = 70, danger = 90 }: { value: number; warn?: number; danger?: number }) {
  const color =
    value >= danger ? 'bg-red-500' : value >= warn ? 'bg-yellow-500' : 'bg-emerald-500'
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1.5">
      <div
        className={`${color} h-1.5 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/60 rounded-2xl p-5 border border-gray-700/50 backdrop-blur">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        <span>{icon}</span>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-700/40 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-mono ${highlight ?? 'text-gray-100'}`}>{value}</span>
    </div>
  )
}

function TempBadge({ value }: { value: number }) {
  const color =
    value >= 80 ? 'text-red-400' : value >= 65 ? 'text-yellow-400' : 'text-emerald-400'
  return <span className={color}>{value}°C</span>
}

function UsageRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-1 border-b border-gray-700/40 last:border-0">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-gray-100">{value}%</span>
      </div>
      <UsageBar value={value} />
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState<SystemData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/system')
        if (!res.ok) throw new Error('Failed')
        setData(await res.json())
        setLastUpdated(new Date().toLocaleTimeString())
        setError(null)
      } catch {
        setError('Could not reach system API')
      }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [])

  if (error)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 font-mono">
        {error}
      </div>
    )

  if (!data)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 font-mono animate-pulse">
        Loading...
      </div>
    )

  const memPct = Math.round((data.memory.used / data.memory.total) * 100)
  const diskPct = data.disk ? Math.round((data.disk.used / data.disk.total) * 100) : null
  const throttleAlerts = [
    data.throttle.underVoltage && 'Under-voltage',
    data.throttle.freqCapped && 'Freq capped',
    data.throttle.throttled && 'Throttled',
    data.throttle.softTempLimit && 'Temp limit',
  ].filter(Boolean)

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              🫐 {data.hostname}
            </h1>
            <p className="text-gray-500 text-sm mt-1.5">
              {data.platform} · {data.arch} · refreshes every 3s · {lastUpdated}
            </p>
          </div>
          {throttleAlerts.length > 0 && (
            <div className="flex flex-col gap-1 items-end">
              {throttleAlerts.map(alert => (
                <span
                  key={alert as string}
                  className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg px-2.5 py-1 text-xs font-medium"
                >
                  ⚠ {alert}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* System */}
          <Card title="System" icon="💻">
            <Row label="Hostname" value={data.hostname} />
            <Row label="Kernel" value={data.kernel} />
            <Row label="Uptime" value={formatUptime(data.uptime)} />
            {data.voltage !== null && (
              <Row
                label="Core voltage"
                value={`${data.voltage.toFixed(4)} V`}
                highlight={data.voltage < 1.2 ? 'text-yellow-400' : 'text-gray-100'}
              />
            )}
            {data.network.map(n => (
              <Row key={n.name} label={n.name} value={n.address} />
            ))}
          </Card>

          {/* CPU */}
          <Card title="CPU" icon="⚡">
            <Row
              label="Model"
              value={
                <span className="truncate max-w-[200px] block text-right text-xs leading-tight">
                  {data.cpu.model}
                </span>
              }
            />
            <Row label="Cores" value={data.cpu.cores} />
            {data.cpu.frequencyMHz !== null && (
              <Row label="Frequency" value={`${data.cpu.frequencyMHz} MHz`} />
            )}
            {data.cpu.temperatureC !== null && (
              <Row label="Temperature" value={<TempBadge value={data.cpu.temperatureC} />} />
            )}
            {data.gpu.temperatureC !== null && (
              <Row label="GPU Temp" value={<TempBadge value={data.gpu.temperatureC} />} />
            )}
            <UsageRow label="Usage" value={data.cpu.usage} />
            <Row
              label="Load avg"
              value={data.cpu.loadAvg.map(n => n.toFixed(2)).join(' / ')}
            />
          </Card>

          {/* Memory */}
          <Card title="Memory" icon="🧠">
            <Row label="Total" value={formatBytes(data.memory.total)} />
            <Row label="Used" value={formatBytes(data.memory.used)} />
            <Row label="Free" value={formatBytes(data.memory.free)} />
            <UsageRow label="Usage" value={memPct} />
          </Card>

          {/* Disk */}
          {data.disk && diskPct !== null && (
            <Card title="Disk (/)" icon="💾">
              <Row label="Total" value={formatBytes(data.disk.total)} />
              <Row label="Used" value={formatBytes(data.disk.used)} />
              <Row label="Free" value={formatBytes(data.disk.free)} />
              <UsageRow label="Usage" value={diskPct} />
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
