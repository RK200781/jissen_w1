'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, PanelRightClose, PanelRightOpen } from 'lucide-react'
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
  const [message, setMessage] = useState<string | null>(null)
  const [isFacilityPanelOpen, setIsFacilityPanelOpen] = useState(false)

  useEffect(() => {
    if (!mapContainer.current) return

    const mapBounds = L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east])
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
    if (!baseFeatureData) return

    roadsLayer.current.clearLayers()
    buildingsLayer.current.clearLayers()

    baseFeatureData.roads.forEach((road) => {
      L.polyline(road, {
        color: '#64748b',
        weight: 4,
        opacity: 0.95,
      }).addTo(roadsLayer.current)
    })

    baseFeatureData.buildings.forEach((building) => {
      L.polygon(building, {
        color: '#334155',
        weight: 1,
        fillColor: '#cbd5e1',
        fillOpacity: 0.65,
      }).addTo(buildingsLayer.current)
    })
  }, [baseFeatureData])

  const persistMap = (updater: Parameters<typeof saveMapById>[1]) => {
    saveMapById(mapId, updater)
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

      if (!response.ok) throw new Error('overpass_failed')

      const json = await response.json()
      const elements = (json.elements ?? []) as OverpassWay[]

      const roads: [number, number][][] = []
      const buildings: [number, number][][] = []

      elements.forEach((el) => {
        if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) return

        const latLngs = el.geometry.map((point) => [point.lat, point.lon] as [number, number])

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
      setFacilities((prev) => {
        const next = prev.map((f) =>
          f.id === facility.id ? { ...f, location: [newPos.lat, newPos.lng] as [number, number] } : f,
        )
        persistMap((current) => ({ ...current, facilities: next }))
        return next
      })
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

    setFacilities((prev) => {
      const next = [...prev, newFacility]
      persistMap((current) => ({ ...current, facilities: next }))
      return next
    })

    addMarker(newFacility)
    setNewFacilityName('')
    setAddingFacility(false)
  }

  const handleDeleteFacility = (facilityId: string) => {
    setFacilities((prev) => {
      const next = prev.filter((f) => f.id !== facilityId)
      persistMap((current) => ({ ...current, facilities: next }))
      return next
    })

    const marker = markers.current.get(facilityId)
    if (marker && map.current) map.current.removeLayer(marker)
    markers.current.delete(facilityId)
  }

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full rounded-none border-0 overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      <div className="absolute top-4 right-4 z-[500] flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="shadow"
          onClick={() => setIsFacilityPanelOpen((prev) => !prev)}
        >
          {isFacilityPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}施設
        </Button>
        <Button size="sm" className="shadow" onClick={generateBaseFeatureData} disabled={isGeneratingBase}>
          {isGeneratingBase ? '再生成中...' : '土台再生成'}
        </Button>
      </div>

      {isFacilityPanelOpen && (
        <div className="absolute top-16 right-4 z-[500] w-[360px] max-w-[calc(100vw-2rem)] max-h-[calc(100%-5rem)] overflow-hidden rounded-lg border bg-card shadow-lg flex flex-col">
          <div className="p-4 border-b">
            <p className="font-semibold text-sm">施設を追加</p>
            <p className="text-xs text-muted-foreground">追加後は地図上でドラッグして位置調整</p>
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
