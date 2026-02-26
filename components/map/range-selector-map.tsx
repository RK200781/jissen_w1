'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

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

    map.current = L.map(mapContainer.current, {
      doubleClickZoom: false,
    }).setView([34.0, 133.0], 7)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current)

    const mapInstance = map.current

    const clearSelectedRange = () => {
      const state = drawingState.current
      if (state.tempRectangle) {
        mapInstance.removeLayer(state.tempRectangle)
        state.tempRectangle = null
      }
      if (state.selectedRectangle) {
        mapInstance.removeLayer(state.selectedRectangle)
        state.selectedRectangle = null
      }
      setSelectedRectangle(null)
      onBoundsChange(null)
    }

    const onDoubleClick = (e: L.LeafletMouseEvent) => {
      const state = drawingState.current
      state.isDoubleClick = true
      state.isDrawing = true
      state.startLatLng = e.latlng
    }

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      const state = drawingState.current
      if (!state.isDrawing || !state.startLatLng) return

      if (state.tempRectangle) mapInstance.removeLayer(state.tempRectangle)

      const bounds = L.latLngBounds(state.startLatLng, e.latlng)
      state.tempRectangle = L.rectangle(bounds, {
        color: '#2563eb',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
      }).addTo(mapInstance)
    }

    const onMouseUp = (e: L.LeafletMouseEvent | L.LeafletEvent) => {
      const state = drawingState.current
      if (!state.isDrawing || !state.isDoubleClick || !state.startLatLng || !('latlng' in e)) {
        state.isDrawing = false
        state.isDoubleClick = false
        return
      }

      state.isDrawing = false
      state.isDoubleClick = false

      if (state.tempRectangle) {
        mapInstance.removeLayer(state.tempRectangle)
        state.tempRectangle = null
      }

      const distance = state.startLatLng.distanceTo(e.latlng)
      if (distance < 300) {
        state.startLatLng = null
        return
      }

      if (state.selectedRectangle) mapInstance.removeLayer(state.selectedRectangle)

      const bounds = L.latLngBounds(state.startLatLng, e.latlng)
      const rectangle = L.rectangle(bounds, {
        color: '#16a34a',
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 0.25,
      }).addTo(mapInstance)

      state.selectedRectangle = rectangle
      setSelectedRectangle(rectangle)

      onBoundsChange({
        north: Math.max(state.startLatLng.lat, e.latlng.lat),
        south: Math.min(state.startLatLng.lat, e.latlng.lat),
        east: Math.max(state.startLatLng.lng, e.latlng.lng),
        west: Math.min(state.startLatLng.lng, e.latlng.lng),
      })

      state.startLatLng = null
    }

    mapInstance.on('dblclick', onDoubleClick)
    mapInstance.on('mousemove', onMouseMove)
    mapInstance.on('mouseup', onMouseUp)
    mapInstance.on('mouseleave', onMouseUp)

    ;(window as any).__rangeSelectorActions = {
      clearSelectedRange,
    }

    return () => {
      mapInstance.off('dblclick', onDoubleClick)
      mapInstance.off('mousemove', onMouseMove)
      mapInstance.off('mouseup', onMouseUp)
      mapInstance.off('mouseleave', onMouseUp)
      clearSelectedRange()
      mapInstance.remove()
    }
  }, [onBoundsChange])

  const handleReset = () => {
    const actions = (window as any).__rangeSelectorActions
    if (actions?.clearSelectedRange) actions.clearSelectedRange()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm bg-blue-50 p-3 rounded-md border border-blue-200 text-blue-900">
        <AlertCircle className="h-4 w-4" />
        <span>地図を2回続けて押したまま動かし、作りたい場所を囲んでください。</span>
      </div>

      <div className="relative w-full h-96 rounded-lg border bg-muted overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {selectedRectangle ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm bg-green-50 p-3 rounded-md border border-green-200 text-green-900">
            <CheckCircle2 className="h-4 w-4" />
            <span>範囲を選べました。次は「地図を作る」を押してください。</span>
          </div>
          <Button variant="outline" onClick={handleReset} className="w-full">
            選び直す
          </Button>
        </div>
      ) : null}
    </div>
  )
}
