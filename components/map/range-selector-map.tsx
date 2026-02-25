'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

type SelectionMode = 'rectangle' | 'polygon'

interface RangeSelectorMapProps {
  onBoundsChange: (bounds: { north: number; south: number; east: number; west: number } | null) => void
}

const MAX_POLYGON_POINTS = 16

export default function RangeSelectorMap({ onBoundsChange }: RangeSelectorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [mode, setMode] = useState<SelectionMode>('rectangle')
  const [selectedRectangle, setSelectedRectangle] = useState<L.Rectangle | null>(null)
  const [polygonPointCount, setPolygonPointCount] = useState(0)

  const drawingState = useRef({
    isDrawing: false,
    startLatLng: null as L.LatLng | null,
    tempRectangle: null as L.Rectangle | null,
    selectedRectangle: null as L.Rectangle | null,
  })

  const polygonState = useRef({
    vertices: [] as L.LatLng[],
    polygonLayer: null as L.Polygon | null,
    edgeLayer: null as L.Polyline | null,
    vertexMarkers: [] as L.CircleMarker[],
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

    const clearPolygonLayers = () => {
      const pState = polygonState.current
      if (pState.polygonLayer) mapInstance.removeLayer(pState.polygonLayer)
      if (pState.edgeLayer) mapInstance.removeLayer(pState.edgeLayer)
      pState.vertexMarkers.forEach((marker) => mapInstance.removeLayer(marker))
      pState.polygonLayer = null
      pState.edgeLayer = null
      pState.vertexMarkers = []
    }

    const emitBoundsFromLatLngs = (latLngs: L.LatLng[]) => {
      if (latLngs.length === 0) {
        onBoundsChange(null)
        return
      }

      const lats = latLngs.map((p) => p.lat)
      const lngs = latLngs.map((p) => p.lng)
      onBoundsChange({
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      })
    }

    const redrawPolygon = () => {
      const pState = polygonState.current
      clearPolygonLayers()

      if (pState.vertices.length === 0) {
        setPolygonPointCount(0)
        onBoundsChange(null)
        return
      }

      pState.edgeLayer = L.polyline(pState.vertices, {
        color: '#f97316',
        weight: 2,
        opacity: 0.9,
      }).addTo(mapInstance)

      if (pState.vertices.length >= 3) {
        pState.polygonLayer = L.polygon(pState.vertices, {
          color: '#dc2626',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.2,
        }).addTo(mapInstance)
      }

      pState.vertices.forEach((vertex, index) => {
        const marker = L.circleMarker(vertex, {
          radius: 6,
          color: '#1d4ed8',
          weight: 2,
          fillColor: '#60a5fa',
          fillOpacity: 1,
        }).addTo(mapInstance)

        marker.on('mousedown', () => {
          mapInstance.dragging.disable()

          const onMove = (e: L.LeafletMouseEvent) => {
            pState.vertices[index] = e.latlng
            redrawPolygon()
          }

          const onUp = () => {
            mapInstance.dragging.enable()
            mapInstance.off('mousemove', onMove)
            mapInstance.off('mouseup', onUp)
          }

          mapInstance.on('mousemove', onMove)
          mapInstance.on('mouseup', onUp)
        })

        pState.vertexMarkers.push(marker)
      })

      setPolygonPointCount(pState.vertices.length)
      emitBoundsFromLatLngs(pState.vertices)
    }

    const clearRectangleLayers = () => {
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
    }

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      if (mode !== 'rectangle') return
      const state = drawingState.current
      state.isDrawing = true
      state.startLatLng = e.latlng
    }

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (mode !== 'rectangle') return

      const state = drawingState.current
      if (!state.isDrawing || !state.startLatLng) return

      if (state.tempRectangle) mapInstance.removeLayer(state.tempRectangle)

      const bounds = L.latLngBounds(state.startLatLng, e.latlng)
      state.tempRectangle = L.rectangle(bounds, {
        color: '#2563eb',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
      }).addTo(mapInstance)
    }

    const onMouseUp = (e: L.LeafletMouseEvent | L.LeafletEvent) => {
      if (mode !== 'rectangle') return

      const state = drawingState.current
      if (!state.isDrawing || !state.startLatLng || !('latlng' in e)) {
        state.isDrawing = false
        return
      }

      state.isDrawing = false

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
        color: '#dc2626',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.2,
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

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (mode !== 'polygon') return

      const pState = polygonState.current
      if (pState.vertices.length >= MAX_POLYGON_POINTS) return

      pState.vertices.push(e.latlng)
      redrawPolygon()
    }

    mapInstance.on('mousedown', onMouseDown)
    mapInstance.on('mousemove', onMouseMove)
    mapInstance.on('mouseup', onMouseUp)
    mapInstance.on('mouseleave', onMouseUp)
    mapInstance.on('click', onMapClick)

    ;(window as any).__rangeSelectorActions = {
      clearRectangleLayers,
      clearPolygonLayers,
      redrawPolygon,
      polygonState,
    }

    return () => {
      mapInstance.off('mousedown', onMouseDown)
      mapInstance.off('mousemove', onMouseMove)
      mapInstance.off('mouseup', onMouseUp)
      mapInstance.off('mouseleave', onMouseUp)
      mapInstance.off('click', onMapClick)
      clearRectangleLayers()
      clearPolygonLayers()
      mapInstance.remove()
    }
  }, [mode, onBoundsChange])

  const handleReset = () => {
    const actions = (window as any).__rangeSelectorActions

    if (mode === 'rectangle') {
      if (actions?.clearRectangleLayers) actions.clearRectangleLayers()
      onBoundsChange(null)
      return
    }

    if (actions?.polygonState) {
      actions.polygonState.current.vertices = []
      actions.redrawPolygon()
    }
  }

  const handleUndoPolygonPoint = () => {
    const actions = (window as any).__rangeSelectorActions
    if (!actions?.polygonState) return

    const vertices: L.LatLng[] = actions.polygonState.current.vertices
    if (vertices.length === 0) return

    vertices.pop()
    actions.redrawPolygon()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
        <AlertCircle className="h-4 w-4" />
        <span>
          {mode === 'rectangle'
            ? '矩形モード: 地図をドラッグして範囲を選択'
            : `自由ポリゴンモード: クリックで点を追加（最大${MAX_POLYGON_POINTS}点）、点をドラッグして調整`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={mode === 'rectangle' ? 'default' : 'outline'} onClick={() => setMode('rectangle')}>
          矩形選択
        </Button>
        <Button type="button" variant={mode === 'polygon' ? 'default' : 'outline'} onClick={() => setMode('polygon')}>
          自由ポリゴン選択
        </Button>
      </div>

      {mode === 'polygon' && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={handleUndoPolygonPoint}>
            最後の点を削除 ({polygonPointCount}/{MAX_POLYGON_POINTS})
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            ポリゴンをクリア
          </Button>
        </div>
      )}

      <div className="relative w-full h-96 rounded-lg border bg-muted overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {mode === 'rectangle' && selectedRectangle && (
        <Button variant="outline" onClick={handleReset} className="w-full">
          選択範囲をクリア
        </Button>
      )}
    </div>
  )
}
