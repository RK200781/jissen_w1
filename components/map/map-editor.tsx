'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Plus, Trash2, PanelRightClose, PanelRightOpen, RefreshCw } from 'lucide-react'
import {
  loadMapById,
  saveMapById,
  type BaseFeatureData,
  type Facility,
  type SelectedBounds,
} from '@/lib/local-maps'

interface MapEditorProps {
  mapId: string
  bounds: SelectedBounds
}

const FACILITY_ICONS = [
  { value: '🛒', label: '店舗' },
  { value: '🍜', label: 'グルメ' },
  { value: '🎨', label: 'アート' },
  { value: '🏠', label: 'ホーム' },
  { value: '⚡', label: 'エネルギー' },
  { value: '🎪', label: 'イベント' },
]

interface OverpassWay {
  type: string
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
}

const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 900

export default function MapEditor({ mapId, bounds }: MapEditorProps) {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [baseFeatureData, setBaseFeatureData] = useState<BaseFeatureData | null>(null)
  const [newFacilityName, setNewFacilityName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('🛒')
  const [addingFacility, setAddingFacility] = useState(false)
  const [isGeneratingBase, setIsGeneratingBase] = useState(false)
  const [isFacilityPanelOpen, setIsFacilityPanelOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [roadWidth, setRoadWidth] = useState(4)
  const [draggingFacilityId, setDraggingFacilityId] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const localMap = loadMapById(mapId)

    if (localMap?.facilities) {
      setFacilities(localMap.facilities)
    }

    if (localMap?.baseFeatureData) {
      setBaseFeatureData(localMap.baseFeatureData)
    } else {
      generateBaseFeatureData()
    }
  }, [mapId])

  const persistMap = (updater: Parameters<typeof saveMapById>[1]) => {
    saveMapById(mapId, updater)
  }

  const project = useMemo(() => {
    const lngRange = Math.max(bounds.east - bounds.west, 0.000001)
    const latRange = Math.max(bounds.north - bounds.south, 0.000001)

    return (lat: number, lng: number): [number, number] => {
      const x = ((lng - bounds.west) / lngRange) * CANVAS_WIDTH
      const y = ((bounds.north - lat) / latRange) * CANVAS_HEIGHT
      return [x, y]
    }
  }, [bounds])

  const unproject = useMemo(() => {
    const lngRange = Math.max(bounds.east - bounds.west, 0.000001)
    const latRange = Math.max(bounds.north - bounds.south, 0.000001)

    return (x: number, y: number): [number, number] => {
      const lng = bounds.west + (x / CANVAS_WIDTH) * lngRange
      const lat = bounds.north - (y / CANVAS_HEIGHT) * latRange
      return [lat, lng]
    }
  }, [bounds])

  const generateBaseFeatureData = async () => {
    setIsGeneratingBase(true)
    setMessage(null)

    try {
      const query = `
[out:json][timeout:25];
(
  way["highway"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["building"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out geom;
      `.trim()

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: query,
      })

      if (!response.ok) throw new Error('overpass_failed')

      const json = await response.json()
      const elements = (json.elements ?? []) as OverpassWay[]
      const roads: [number, number][][] = []
      const buildings: [number, number][][] = []

      elements.forEach((el) => {
        if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) return
        const latLngs = el.geometry.map((p) => [p.lat, p.lon] as [number, number])
        if (el.tags?.highway) roads.push(latLngs)
        if (el.tags?.building && latLngs.length >= 3) buildings.push(latLngs)
      })

      const generated = { roads, buildings }
      setBaseFeatureData(generated)
      persistMap((current) => ({ ...current, baseFeatureData: generated }))
      setMessage(`土台データを生成しました（道路 ${roads.length} / 建物 ${buildings.length}）`)
    } catch {
      setMessage('土台データ生成に失敗しました。時間を置いて再試行してください。')
    } finally {
      setIsGeneratingBase(false)
    }
  }

  const handleAddFacility = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFacilityName) return

    setAddingFacility(true)

    const centerLat = (bounds.north + bounds.south) / 2
    const centerLng = (bounds.east + bounds.west) / 2

    const newFacility: Facility = {
      id: crypto.randomUUID(),
      name: newFacilityName,
      location: [centerLat, centerLng],
      icon: selectedIcon,
    }

    setFacilities((prev) => {
      const next = [...prev, newFacility]
      persistMap((current) => ({ ...current, facilities: next }))
      return next
    })

    setNewFacilityName('')
    setAddingFacility(false)
  }

  const handleDeleteFacility = (facilityId: string) => {
    setFacilities((prev) => {
      const next = prev.filter((f) => f.id !== facilityId)
      persistMap((current) => ({ ...current, facilities: next }))
      return next
    })
  }

  const updateFacilityPositionFromPointer = (facilityId: string, clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH
    const y = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT

    const clampedX = Math.max(0, Math.min(CANVAS_WIDTH, x))
    const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT, y))
    const [lat, lng] = unproject(clampedX, clampedY)
    const location: [number, number] = [lat, lng]

    setFacilities((prev) => {
      const next = prev.map((f) => (f.id === facilityId ? { ...f, location } : f))
      persistMap((current) => ({ ...current, facilities: next }))
      return next
    })
  }

  const roads = baseFeatureData?.roads ?? []
  const buildings = baseFeatureData?.buildings ?? []

  return (
    <div className="relative h-full w-full bg-muted/30">
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="shadow"
          onClick={() => setIsFacilityPanelOpen((prev) => !prev)}
        >
          {isFacilityPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          施設
        </Button>
        <Button size="sm" className="shadow gap-1" onClick={generateBaseFeatureData} disabled={isGeneratingBase}>
          <RefreshCw className="w-4 h-4" />
          {isGeneratingBase ? '再生成中...' : '土台再生成'}
        </Button>
      </div>

      <div className="h-full w-full p-4">
        <div className="h-full w-full rounded-lg border bg-white overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            className="w-full h-full touch-none"
            onPointerMove={(e) => {
              if (!draggingFacilityId) return
              updateFacilityPositionFromPointer(draggingFacilityId, e.clientX, e.clientY)
            }}
            onPointerUp={() => setDraggingFacilityId(null)}
            onPointerLeave={() => setDraggingFacilityId(null)}
          >
            <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#f8fafc" />

            {buildings.map((building, idx) => {
              const points = building
                .map(([lat, lng]) => {
                  const [x, y] = project(lat, lng)
                  return `${x},${y}`
                })
                .join(' ')

              return (
                <polygon
                  key={`b-${idx}`}
                  points={points}
                  fill="#cbd5e1"
                  stroke="#475569"
                  strokeWidth={1}
                  fillOpacity={0.75}
                />
              )
            })}

            {roads.map((road, idx) => {
              const points = road
                .map(([lat, lng]) => {
                  const [x, y] = project(lat, lng)
                  return `${x},${y}`
                })
                .join(' ')

              return (
                <polyline
                  key={`r-${idx}`}
                  points={points}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth={roadWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.95}
                />
              )
            })}

            {facilities.map((facility) => {
              const [x, y] = project(facility.location[0], facility.location[1])
              return (
                <g
                  key={facility.id}
                  transform={`translate(${x}, ${y})`}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    ;(e.currentTarget as SVGGElement).setPointerCapture(e.pointerId)
                    setDraggingFacilityId(facility.id)
                  }}
                >
                  <circle r={14} fill="#ffffff" stroke="#0f172a" strokeWidth={1.5} />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={14}>
                    {facility.icon}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {isFacilityPanelOpen && (
        <div className="absolute top-16 right-4 z-20 w-[360px] max-w-[calc(100vw-2rem)] max-h-[calc(100%-5rem)] overflow-hidden rounded-lg border bg-card shadow-lg flex flex-col">
          <div className="p-4 border-b space-y-2">
            <p className="font-semibold text-sm">土台編集</p>
            <div>
              <label className="text-xs text-muted-foreground">道幅: {roadWidth}px</label>
              <Slider value={[roadWidth]} min={1} max={12} step={1} onValueChange={(v) => setRoadWidth(v[0])} />
            </div>
          </div>

          <div className="p-4 border-b">
            <p className="font-semibold text-sm">施設を追加</p>
            <p className="text-xs text-muted-foreground">追加後は土台上でドラッグして位置調整</p>
          </div>

          <form onSubmit={handleAddFacility} className="p-4 space-y-3 border-b">
            <Input
              placeholder="施設名を入力"
              value={newFacilityName}
              onChange={(e) => setNewFacilityName(e.target.value)}
              disabled={addingFacility}
            />
            <div className="grid grid-cols-6 gap-2">
              {FACILITY_ICONS.map((icon) => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setSelectedIcon(icon.value)}
                  className={`p-2 rounded border text-2xl transition-all ${
                    selectedIcon === icon.value ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
                  }`}
                  title={icon.label}
                >
                  {icon.value}
                </button>
              ))}
            </div>
            <Button type="submit" disabled={addingFacility || !newFacilityName} className="w-full gap-2">
              <Plus className="w-4 h-4" />追加
            </Button>
          </form>

          <div className="p-4 border-b text-sm font-semibold">施設一覧 ({facilities.length})</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
            {facilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">施設がまだ追加されていません</p>
            ) : (
              facilities.map((facility) => (
                <div key={facility.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{facility.icon}</span>
                    <span className="text-sm font-medium truncate">{facility.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteFacility(facility.id)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {message && <p className="px-4 pb-4 text-xs text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  )
}
