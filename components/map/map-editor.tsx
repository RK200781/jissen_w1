'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Zap } from 'lucide-react'
import RoadsGenerator from './roads-generator'

interface MapEditorProps {
  mapId: string
  bounds: any
}

interface Facility {
  id: string
  name: string
  location: [number, number]
  icon: string
}

const FACILITY_ICONS = [
  { value: '🛒', label: '店舗' },
  { value: '🍜', label: 'グルメ' },
  { value: '🎨', label: 'アート' },
  { value: '🏠', label: 'ホーム' },
  { value: '⚡', label: 'エネルギー' },
  { value: '🎪', label: 'イベント' },
]

export default function MapEditor({ mapId, bounds }: MapEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [newFacilityName, setNewFacilityName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('🛒')
  const [addingFacility, setAddingFacility] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const markers = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    if (!mapContainer.current) return

    // Initialize map
    const boundsArray = bounds.coordinates[0]
    const mapBounds = L.latLngBounds(
      [boundsArray[0][1], boundsArray[0][0]],
      [boundsArray[2][1], boundsArray[2][0]]
    )

    map.current = L.map(mapContainer.current).fitBounds(mapBounds)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current)

    // Load facilities
    loadFacilities()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [mapId, bounds, supabase])

  const loadFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('map_id', mapId)

      if (error) {
        console.error('Failed to load facilities:', error)
        return
      }

      const facilitiesData = data.map((f) => ({
        id: f.id,
        name: f.name,
        location: [
          f.location.coordinates[1],
          f.location.coordinates[0],
        ] as [number, number],
        icon: f.icon,
      }))

      setFacilities(facilitiesData)

      // Add markers to map
      facilitiesData.forEach((facility) => {
        if (map.current) {
          const marker = L.marker(facility.location, {
            title: facility.name,
          }).bindPopup(`<strong>${facility.name}</strong> ${facility.icon}`).addTo(map.current)

          marker.draggable = true
          markers.current.set(facility.id, marker)

          marker.on('dragend', () => {
            const newPos = marker.getLatLng()
            updateFacilityLocation(facility.id, [newPos.lat, newPos.lng])
          })
        }
      })

      setIsLoading(false)
    } catch (err) {
      console.error('Error loading facilities:', err)
      setIsLoading(false)
    }
  }

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newFacilityName || !map.current) return

    setAddingFacility(true)

    try {
      // Get map center as default location
      const center = map.current.getCenter()

      const { data, error } = await supabase
        .from('facilities')
        .insert([
          {
            map_id: mapId,
            name: newFacilityName,
            location: {
              type: 'Point',
              coordinates: [center.lng, center.lat],
            },
            icon: selectedIcon,
          },
        ])
        .select()

      if (error) {
        console.error('Failed to add facility:', error)
        return
      }

      if (data && data.length > 0) {
        const newFacility = {
          id: data[0].id,
          name: data[0].name,
          location: [center.lat, center.lng] as [number, number],
          icon: selectedIcon,
        }

        setFacilities([...facilities, newFacility])

        // Add marker
        const marker = L.marker([center.lat, center.lng], {
          title: newFacility.name,
        }).bindPopup(`<strong>${newFacility.name}</strong> ${selectedIcon}`).addTo(map.current!)

        marker.draggable = true
        markers.current.set(newFacility.id, marker)

        marker.on('dragend', () => {
          const newPos = marker.getLatLng()
          updateFacilityLocation(newFacility.id, [newPos.lat, newPos.lng])
        })

        setNewFacilityName('')
      }
    } catch (err) {
      console.error('Error adding facility:', err)
    } finally {
      setAddingFacility(false)
    }
  }

  const handleDeleteFacility = async (facilityId: string) => {
    try {
      const { error } = await supabase.from('facilities').delete().eq('id', facilityId)

      if (error) {
        console.error('Failed to delete facility:', error)
        return
      }

      setFacilities(facilities.filter((f) => f.id !== facilityId))

      const marker = markers.current.get(facilityId)
      if (marker && map.current) {
        map.current.removeLayer(marker)
      }
      markers.current.delete(facilityId)
    } catch (err) {
      console.error('Error deleting facility:', err)
    }
  }

  const updateFacilityLocation = async (facilityId: string, location: [number, number]) => {
    try {
      await supabase
        .from('facilities')
        .update({
          location: {
            type: 'Point',
            coordinates: [location[1], location[0]],
          },
        })
        .eq('id', facilityId)
    } catch (err) {
      console.error('Error updating facility location:', err)
    }
  }

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Map */}
      <div className="flex-1 rounded-lg border overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {/* Sidebar */}
      <div className="w-80 flex flex-col gap-4">
        {/* Roads Generator */}
        <RoadsGenerator mapId={mapId} />

        {/* Add Facility Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">施設を追加</CardTitle>
            <CardDescription>ドラッグで移動可能</CardDescription>
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
                <Plus className="w-4 h-4" />
                追加
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Facilities List */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">施設一覧 ({facilities.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
            {facilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">施設がまだ追加されていません</p>
            ) : (
              facilities.map((facility) => (
                <div
                  key={facility.id}
                  className="flex items-center justify-between p-2 rounded border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{facility.icon}</span>
                    <span className="text-sm font-medium truncate">{facility.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteFacility(facility.id)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
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
