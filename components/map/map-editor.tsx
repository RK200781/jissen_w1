'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
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

export default function MapEditor({ mapId, bounds }: MapEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const roadsLayer = useRef<L.FeatureGroup>(L.featureGroup())
  const buildingsLayer = useRef<L.FeatureGroup>(L.featureGroup())
  const markers = useRef<Map<string, L.Marker>>(new Map())

  const [facilities, setFacilities] = useState<Facility[]>([])
  const [baseFeatureData, setBaseFeatureData] = useState<BaseFeatureData | null>(null)
  const [newFacilityName, setNewFacilityName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('🛒')
  const [addingFacility, setAddingFacility] = useState(false)
  const [isGeneratingBase, setIsGeneratingBase] = useState(false)
  const [roadWidth, setRoadWidth] = useState(4)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const mapBounds = L.latLngBounds(
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    )

    map.current = L.map(mapContainer.current).fitBounds(mapBounds)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current)

    roadsLayer.current.addTo(map.current)
    buildingsLayer.current.addTo(map.current)

    const localMap = loadMapById(mapId)
    if (localMap?.facilities) {
      setFacilities(localMap.facilities)
      localMap.facilities.forEach((facility) => addMarker(facility))
    }

    if (localMap?.baseFeatureData) {
      setBaseFeatureData(localMap.baseFeatureData)
    } else {
      generateBaseFeatureData()
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [mapId, bounds])

  useEffect(() => {
    if (baseFeatureData) {
      renderBaseFeatures(baseFeatureData, roadWidth)
    }
  }, [baseFeatureData, roadWidth])

  const persistMap = (updater: Parameters<typeof saveMapById>[1]) => {
    saveMapById(mapId, updater)
  }

  const renderBaseFeatures = (data: BaseFeatureData, width: number) => {
    roadsLayer.current.clearLayers()
    buildingsLayer.current.clearLayers()

    data.roads.forEach((road) => {
      L.polyline(road, {
        color: '#64748b',
        weight: width,
        opacity: 0.95,
      }).addTo(roadsLayer.current)
    })

    data.buildings.forEach((building) => {
      L.polygon(building, {
        color: '#334155',
        weight: 1,
        fillColor: '#cbd5e1',
        fillOpacity: 0.65,
      }).addTo(buildingsLayer.current)
    })
  }

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

      if (!response.ok) {
        throw new Error('overpass_failed')
      }

      const json = await response.json()
      const elements = (json.elements ?? []) as OverpassWay[]

      const roads: [number, number][][] = []
      const buildings: [number, number][][] = []

      elements.forEach((el) => {
        if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) return

        const latLngs = el.geometry.map((point) => [point.lat, point.lon] as [number, number])

        if (el.tags?.highway) {
          roads.push(latLngs)
        }

        if (el.tags?.building && latLngs.length >= 3) {
          buildings.push(latLngs)
        }
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

  const addMarker = (facility: Facility) => {
    if (!map.current) return

    const marker = L.marker(facility.location, {
      title: facility.name,
      draggable: true,
    })
      .bindPopup(`<strong>${facility.name}</strong> ${facility.icon}`)
      .addTo(map.current)

    marker.on('dragend', () => {
      const newPos = marker.getLatLng()
      const next = facilities.map((f) =>
        f.id === facility.id ? { ...f, location: [newPos.lat, newPos.lng] as [number, number] } : f,
      )
      setFacilities(next)
      persistMap((current) => ({ ...current, facilities: next }))
    })

    markers.current.set(facility.id, marker)
  }

  const handleAddFacility = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFacilityName || !map.current) return

    setAddingFacility(true)

    const center = map.current.getCenter()
    const newFacility: Facility = {
      id: crypto.randomUUID(),
      name: newFacilityName,
      location: [center.lat, center.lng],
      icon: selectedIcon,
    }

    const next = [...facilities, newFacility]
    setFacilities(next)
    addMarker(newFacility)
    persistMap((current) => ({ ...current, facilities: next }))

    setNewFacilityName('')
    setAddingFacility(false)
  }

  const handleDeleteFacility = (facilityId: string) => {
    const next = facilities.filter((f) => f.id !== facilityId)
    setFacilities(next)
    persistMap((current) => ({ ...current, facilities: next }))

    const marker = markers.current.get(facilityId)
    if (marker && map.current) map.current.removeLayer(marker)
    markers.current.delete(facilityId)
  }

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="flex-1 rounded-lg border overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      <div className="w-80 flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">土台データ（道路・建物）</CardTitle>
            <CardDescription>範囲内のOpenStreetMapデータからベースを自動生成</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">道幅（表示）: {roadWidth}px</label>
              <Slider
                value={[roadWidth]}
                min={1}
                max={12}
                step={1}
                onValueChange={(v) => setRoadWidth(v[0])}
              />
            </div>
            <Button onClick={generateBaseFeatureData} disabled={isGeneratingBase} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              {isGeneratingBase ? '土台を生成中...' : '土台を再生成'}
            </Button>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">施設を追加</CardTitle>
            <CardDescription>あとからドラッグで位置変更できます</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddFacility} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">施設名</label>
                <Input
                  placeholder="施設名を入力"
                  value={newFacilityName}
                  onChange={(e) => setNewFacilityName(e.target.value)}
                  disabled={addingFacility}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">アイコン</label>
                <div className="grid grid-cols-6 gap-2">
                  {FACILITY_ICONS.map((icon) => (
                    <button
                      key={icon.value}
                      type="button"
                      onClick={() => setSelectedIcon(icon.value)}
                      className={`p-2 rounded border text-2xl transition-all ${
                        selectedIcon === icon.value
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                      title={icon.label}
                    >
                      {icon.value}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={addingFacility || !newFacilityName} className="w-full gap-2">
                <Plus className="w-4 h-4" />追加
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">施設一覧 ({facilities.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
