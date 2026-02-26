'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [placementCount, setPlacementCount] = useState(1)
  const [isGeneratingBase, setIsGeneratingBase] = useState(false)
  const [isFacilityPanelOpen, setIsFacilityPanelOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [roadWidth, setRoadWidth] = useState(4)
  const [draggingFacilityId, setDraggingFacilityId] = useState<string | null>(null)
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null)
  const [editingFacilityName, setEditingFacilityName] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const [isSavingMap, setIsSavingMap] = useState(false)
  const router = useRouter()

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

  const mapProjection = useMemo(() => {
    const centerLat = (bounds.north + bounds.south) / 2
    const centerLatRad = (centerLat * Math.PI) / 180

    const metersPerDegreeLat = 111_132
    const metersPerDegreeLng = Math.max(111_320 * Math.cos(centerLatRad), 1)

    const widthMeters = Math.max((bounds.east - bounds.west) * metersPerDegreeLng, 1)
    const heightMeters = Math.max((bounds.north - bounds.south) * metersPerDegreeLat, 1)

    const scale = Math.min(CANVAS_WIDTH / widthMeters, CANVAS_HEIGHT / heightMeters)
    const offsetX = (CANVAS_WIDTH - widthMeters * scale) / 2
    const offsetY = (CANVAS_HEIGHT - heightMeters * scale) / 2

    return {
      metersPerDegreeLat,
      metersPerDegreeLng,
      scale,
      offsetX,
      offsetY,
    }
  }, [bounds])

  const project = useMemo(() => {
    return (lat: number, lng: number): [number, number] => {
      const xMeters = (lng - bounds.west) * mapProjection.metersPerDegreeLng
      const yMeters = (bounds.north - lat) * mapProjection.metersPerDegreeLat

      const x = xMeters * mapProjection.scale + mapProjection.offsetX
      const y = yMeters * mapProjection.scale + mapProjection.offsetY
      return [x, y]
    }
  }, [bounds, mapProjection])

  const unproject = useMemo(() => {
    return (x: number, y: number): [number, number] => {
      const xMeters = (x - mapProjection.offsetX) / mapProjection.scale
      const yMeters = (y - mapProjection.offsetY) / mapProjection.scale

      const lng = bounds.west + xMeters / mapProjection.metersPerDegreeLng
      const lat = bounds.north - yMeters / mapProjection.metersPerDegreeLat
      return [lat, lng]
    }
  }, [bounds, mapProjection])

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
    const count = Math.max(1, Math.min(50, Math.floor(placementCount || 1)))

    const facilitiesToAdd: Facility[] = Array.from({ length: count }, (_, i) => {
      const ring = Math.floor(i / 8) + 1
      const angle = (i % 8) * (Math.PI / 4)
      const latOffset = Math.sin(angle) * ring * 0.0004
      const lngOffset = Math.cos(angle) * ring * 0.0004
      const location: [number, number] = [centerLat + latOffset, centerLng + lngOffset]

      return {
        id: crypto.randomUUID(),
        name: count > 1 ? `${newFacilityName}${i + 1}` : newFacilityName,
        location,
        icon: selectedIcon,
      }
    })

    setFacilities((prev) => {
      const next = [...prev, ...facilitiesToAdd]
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

  const startEditingFacilityName = (facility: Facility) => {
    setEditingFacilityId(facility.id)
    setEditingFacilityName(facility.name)
  }

  const cancelEditingFacilityName = () => {
    setEditingFacilityId(null)
    setEditingFacilityName('')
  }

  const saveFacilityName = (facilityId: string) => {
    const nextName = editingFacilityName.trim()
    if (!nextName) return

    setFacilities((prev) => {
      const next = prev.map((f) => (f.id === facilityId ? { ...f, name: nextName } : f))
      persistMap((current) => ({ ...current, facilities: next }))
      return next
    })

    cancelEditingFacilityName()
  }

  const updateFacilityPositionFromPointer = (facilityId: string, clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH
    const y = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT

    const drawableWidth = (bounds.east - bounds.west) * mapProjection.metersPerDegreeLng * mapProjection.scale
    const drawableHeight = (bounds.north - bounds.south) * mapProjection.metersPerDegreeLat * mapProjection.scale

    const minX = mapProjection.offsetX
    const maxX = mapProjection.offsetX + drawableWidth
    const minY = mapProjection.offsetY
    const maxY = mapProjection.offsetY + drawableHeight

    const clampedX = Math.max(minX, Math.min(maxX, x))
    const clampedY = Math.max(minY, Math.min(maxY, y))
    const [lat, lng] = unproject(clampedX, clampedY)
    const location: [number, number] = [lat, lng]

    setFacilities((prev) => {
      const next = prev.map((f) => (f.id === facilityId ? { ...f, location } : f))
      persistMap((current) => ({ ...current, facilities: next }))
      return next
    })
  }


  const handleSaveAndBackToDashboard = async () => {
    setIsSavingMap(true)

    try {
      saveMapById(mapId, (current) => ({
        ...current,
        bounds,
        facilities,
        baseFeatureData: baseFeatureData ?? undefined,
      }))

      router.push('/dashboard')
    } finally {
      setIsSavingMap(false)
    }
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
          {isGeneratingBase ? '再生成中...' : '道と建物を読み直す'}
        </Button>
        <Button
          size="sm"
          variant="default"
          className="shadow"
          onClick={handleSaveAndBackToDashboard}
          disabled={isSavingMap}
        >
          {isSavingMap ? '保存中...' : '保存して一覧へ戻る'}
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
            <p className="font-semibold text-sm">道の見え方</p>
            <div>
              <label className="text-xs text-muted-foreground">道の太さ:  {roadWidth}px</label>
              <Slider value={[roadWidth]} min={1} max={12} step={1} onValueChange={(v) => setRoadWidth(v[0])} />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-scroll">
            <div className="p-4 border-b">
              <p className="font-semibold text-sm">目印を追加</p>
              <p className="text-xs text-muted-foreground">追加した後は、つかんで動かせます。</p>
            </div>

            <form onSubmit={handleAddFacility} className="p-4 space-y-3 border-b">
              <Input
                placeholder="施設名を入力"
                value={newFacilityName}
                onChange={(e) => setNewFacilityName(e.target.value)}
                disabled={addingFacility}
              />
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">追加する数</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={placementCount}
                  onChange={(e) => setPlacementCount(Number(e.target.value) || 1)}
                  disabled={addingFacility}
                />
              </div>
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
                <Plus className="w-4 h-4" />{placementCount > 1 ? `${placementCount}個まとめて追加` : "追加"}
              </Button>
            </form>

            <div className="p-4 border-b text-sm font-semibold">目印の一覧 ({facilities.length})</div>
            <div className="p-4 space-y-2">
              {facilities.length === 0 ? (
                <p className="text-sm text-muted-foreground">まだ目印はありません</p>
              ) : (
                facilities.map((facility) => (
                  <div key={facility.id} className="p-2 rounded border hover:bg-muted space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{facility.icon}</span>
                      {editingFacilityId === facility.id ? (
                        <Input
                          value={editingFacilityName}
                          onChange={(e) => setEditingFacilityName(e.target.value)}
                          className="h-8"
                          maxLength={50}
                        />
                      ) : (
                        <span className="text-sm font-medium truncate">{facility.name}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {editingFacilityId === facility.id ? (
                        <>
                          <Button type="button" size="sm" variant="secondary" onClick={cancelEditingFacilityName}>キャンセル</Button>
                          <Button type="button" size="sm" onClick={() => saveFacilityName(facility.id)} disabled={!editingFacilityName.trim()}>保存</Button>
                        </>
                      ) : (
                        <Button type="button" size="sm" variant="outline" onClick={() => startEditingFacilityName(facility)}>名前を変える</Button>
                      )}
                      <button
                        onClick={() => handleDeleteFacility(facility.id)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {message && <p className="px-4 pb-4 text-xs text-muted-foreground">{message}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
