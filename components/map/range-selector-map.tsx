'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { AlertCircle, Move, Crosshair } from 'lucide-react'

interface RangeSelectorMapProps {
  onBoundsChange: (bounds: { north: number; south: number; east: number; west: number } | null) => void
}

export default function RangeSelectorMap({ onBoundsChange }: RangeSelectorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [selectedRectangle, setSelectedRectangle] = useState<L.Rectangle | null>(null)
  const drawingState = useRef({
    isDrawing: false,
    startLatLng: null as L.LatLng | null,
    tempRectangle: null as L.Rectangle | null,
    selectedRectangle: null as L.Rectangle | null,
    isDoubleClick: false,
  })

  useEffect(() => {
    if (!mapContainer.current) return

    // Initialize map with double-click zoom disabled
    map.current = L.map(mapContainer.current, {
      doubleClickZoom: false,
    }).setView([34.0, 133.0], 7)

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current)

    const mapInstance = map.current
    const state = drawingState.current

    // Handle rectangle drawing with double-click (Google なぞって検索 style)
    const onDoubleClick = (e: L.LeafletMouseEvent) => {
      state.isDoubleClick = true
      state.isDrawing = true
      state.startLatLng = e.latlng
      console.log('[v0] Double-click detected, drawing mode activated:', state.startLatLng)
    }

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!state.isDrawing || !state.startLatLng) return

      // Remove temp rectangle
      if (state.tempRectangle) {
        mapInstance.removeLayer(state.tempRectangle)
      }

      // Draw temp preview rectangle
      const bounds = L.latLngBounds(state.startLatLng, e.latlng)
      state.tempRectangle = L.rectangle(bounds, {
        color: '#2563eb',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
      })
      state.tempRectangle.addTo(mapInstance)
    }

    const onMouseUp = (e: L.LeafletMouseEvent | L.LeafletEvent) => {
      // Only complete range selection if double-click was detected
      if (!state.isDrawing || !state.isDoubleClick || !state.startLatLng || !('latlng' in e)) {
        state.isDrawing = false
        state.isDoubleClick = false
        return
      }

      state.isDrawing = false
      state.isDoubleClick = false
      console.log('[v0] Mouse up - range selection completing')

      // Remove temp rectangle
      if (state.tempRectangle) {
        mapInstance.removeLayer(state.tempRectangle)
        state.tempRectangle = null
      }

      // Only create bounds if user actually dragged (not just clicked)
      const distance = state.startLatLng.distanceTo(e.latlng)
      console.log('[v0] Drag distance:', distance)
      
      if (distance < 500) {
        // Less than 500m - probably a click, not a drag
        console.log('[v0] Distance too small, ignoring')
        state.startLatLng = null
        return
      }

      // Remove previous rectangle
      if (state.selectedRectangle) {
        mapInstance.removeLayer(state.selectedRectangle)
      }

      // Create final rectangle
      const bounds = L.latLngBounds(state.startLatLng, e.latlng)
      const rectangle = L.rectangle(bounds, {
        color: '#dc2626',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.2,
      })
      rectangle.addTo(mapInstance)
      state.selectedRectangle = rectangle
      setSelectedRectangle(rectangle)

      console.log('[v0] Range selected')

      const finalBounds = {
        north: Math.max(state.startLatLng.lat, e.latlng.lat),
        south: Math.min(state.startLatLng.lat, e.latlng.lat),
        east: Math.max(state.startLatLng.lng, e.latlng.lng),
        west: Math.min(state.startLatLng.lng, e.latlng.lng),
      }
      console.log('[v0] Final bounds:', finalBounds)
      onBoundsChange(finalBounds)

      state.startLatLng = null
    }

    mapInstance.on('dblclick', onDoubleClick)
    mapInstance.on('mousemove', onMouseMove)
    mapInstance.on('mouseup', onMouseUp)
    mapInstance.on('mouseleave', onMouseUp)

    return () => {
      if (mapInstance) {
        mapInstance.off('dblclick', onDoubleClick)
        mapInstance.off('mousemove', onMouseMove)
        mapInstance.off('mouseup', onMouseUp)
        mapInstance.off('mouseleave', onMouseUp)
        mapInstance.remove()
      }
    }
  }, [])

  const handleReset = () => {
    if (map.current && selectedRectangle) {
      map.current.removeLayer(selectedRectangle)
      setSelectedRectangle(null)
      onBoundsChange(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
        <AlertCircle className="h-4 w-4" />
        <span>マップ上をダブルクリックして、ドラッグで範囲を選択してください</span>
      </div>
      <div className="relative w-full h-96 rounded-lg border bg-muted overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
      </div>
      {selectedRectangle && (
        <Button variant="outline" onClick={handleReset} className="w-full">
          選択範囲をクリア
        </Button>
      )}
    </div>
  )
}
