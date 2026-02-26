'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { SelectionMethod } from '@/lib/guide-steps'

type PolygonEditMode = 'place' | 'connect'

interface RangeSelectorMapProps {
  selectionMethod: SelectionMethod
  onBoundsChange: (bounds: { north: number; south: number; east: number; west: number } | null) => void
}

const MAX_POLYGON_POINTS = 16

export default function RangeSelectorMap({ selectionMethod, onBoundsChange }: RangeSelectorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [selectedRectangle, setSelectedRectangle] = useState<L.Rectangle | null>(null)
  const [polygonPointCount, setPolygonPointCount] = useState(0)
  const [polygonEditMode, setPolygonEditMode] = useState<PolygonEditMode>('place')
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null)

  const polygonEditModeRef = useRef<PolygonEditMode>('place')
  const selectedVertexIndexRef = useRef<number | null>(null)

  const drawingState = useRef({
    isDrawing: false,
    startLatLng: null as L.LatLng | null,
    tempRectangle: null as L.Rectangle | null,
    selectedRectangle: null as L.Rectangle | null,
    isDoubleClick: false,
  })

  const polygonState = useRef({
    vertices: [] as L.LatLng[],
    edges: [] as [number, number][],
    edgeLayers: [] as L.Polyline[],
    vertexMarkers: [] as L.CircleMarker[],
  })

  useEffect(() => {
    polygonEditModeRef.current = polygonEditMode
    if (polygonEditMode === 'place') {
      selectedVertexIndexRef.current = null
      setSelectedVertexIndex(null)
    }
  }, [polygonEditMode])

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
      pState.edgeLayers.forEach((layer) => mapInstance.removeLayer(layer))
      pState.vertexMarkers.forEach((marker) => mapInstance.removeLayer(marker))
      pState.edgeLayers = []
      pState.vertexMarkers = []
    }

    const makeEdgeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`

    const hasEdge = (a: number, b: number) => {
      const key = makeEdgeKey(a, b)
      return polygonState.current.edges.some(([x, y]) => makeEdgeKey(x, y) === key)
    }

    const removeEdge = (a: number, b: number) => {
      const key = makeEdgeKey(a, b)
      polygonState.current.edges = polygonState.current.edges.filter(([x, y]) => makeEdgeKey(x, y) !== key)
    }

    const addEdge = (a: number, b: number) => {
      if (a === b || hasEdge(a, b)) return
      polygonState.current.edges.push([a, b])
    }

    const toggleEdge = (a: number, b: number) => {
      if (a === b) return

      if (hasEdge(a, b)) {
        removeEdge(a, b)
      } else {
        addEdge(a, b)
      }
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
        selectedVertexIndexRef.current = null
        setSelectedVertexIndex(null)
        return
      }

      pState.edges = pState.edges.filter(([start, end]) => {
        return start >= 0 && end >= 0 && start < pState.vertices.length && end < pState.vertices.length && start !== end
      })

      const uniqueEdges = new Map<string, [number, number]>()
      pState.edges.forEach(([start, end]) => {
        uniqueEdges.set(makeEdgeKey(start, end), [start, end])
      })
      pState.edges = Array.from(uniqueEdges.values())

      pState.edges.forEach(([start, end]) => {
        const edgeLayer = L.polyline([pState.vertices[start], pState.vertices[end]], {
          color: '#16a34a',
          weight: 3,
          opacity: 0.95,
        }).addTo(mapInstance)

        edgeLayer.on('click', (event) => {
          if (polygonEditModeRef.current !== 'connect') return
          L.DomEvent.stopPropagation(event)
          toggleEdge(start, end)
          redrawPolygon()
        })

        pState.edgeLayers.push(edgeLayer)
      })

      pState.vertices.forEach((vertex, index) => {
        const marker = L.circleMarker(vertex, {
          radius: 6,
          color: selectedVertexIndexRef.current === index ? '#7c3aed' : '#1d4ed8',
          weight: 2,
          fillColor: selectedVertexIndexRef.current === index ? '#c4b5fd' : '#60a5fa',
          fillOpacity: 1,
        }).addTo(mapInstance)

        marker.on('mousedown', (event) => {
          if (polygonEditModeRef.current !== 'place') return
          L.DomEvent.stopPropagation(event)
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

        marker.on('click', (event) => {
          if (polygonEditModeRef.current !== 'connect') return
          L.DomEvent.stopPropagation(event)

          const selectedIndex = selectedVertexIndexRef.current
          if (selectedIndex === null) {
            selectedVertexIndexRef.current = index
            setSelectedVertexIndex(index)
            redrawPolygon()
            return
          }

          if (selectedIndex === index) {
            selectedVertexIndexRef.current = null
            setSelectedVertexIndex(null)
            redrawPolygon()
            return
          }

          toggleEdge(selectedIndex, index)
          selectedVertexIndexRef.current = null
          setSelectedVertexIndex(null)
          redrawPolygon()
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

    const onDoubleClick = (e: L.LeafletMouseEvent) => {
      if (selectionMethod !== 'rectangle') return
      const state = drawingState.current
      state.isDoubleClick = true
      state.isDrawing = true
      state.startLatLng = e.latlng
    }

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (selectionMethod !== 'rectangle') return

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
      if (selectionMethod !== 'rectangle') return

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

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (selectionMethod !== 'polygon') return
      if (polygonEditModeRef.current !== 'place') return

      const pState = polygonState.current
      if (pState.vertices.length >= MAX_POLYGON_POINTS) return

      pState.vertices.push(e.latlng)
      redrawPolygon()
    }

    mapInstance.on('dblclick', onDoubleClick)
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
      mapInstance.off('dblclick', onDoubleClick)
      mapInstance.off('mousemove', onMouseMove)
      mapInstance.off('mouseup', onMouseUp)
      mapInstance.off('mouseleave', onMouseUp)
      mapInstance.off('click', onMapClick)
      clearRectangleLayers()
      clearPolygonLayers()
      mapInstance.remove()
    }
  }, [selectionMethod, onBoundsChange])

  const handleReset = () => {
    const actions = (window as any).__rangeSelectorActions

    if (selectionMethod === 'rectangle') {
      if (actions?.clearRectangleLayers) actions.clearRectangleLayers()
      onBoundsChange(null)
      return
    }

    if (actions?.polygonState) {
      actions.polygonState.current.vertices = []
      actions.polygonState.current.edges = []
      selectedVertexIndexRef.current = null
      setSelectedVertexIndex(null)
      actions.redrawPolygon()
    }
  }

  const handleUndoPolygonPoint = () => {
    const actions = (window as any).__rangeSelectorActions
    if (!actions?.polygonState) return

    const vertices: L.LatLng[] = actions.polygonState.current.vertices
    const edges: [number, number][] = actions.polygonState.current.edges
    if (vertices.length === 0) return

    const removedIndex = vertices.length - 1
    vertices.pop()
    actions.polygonState.current.edges = edges.filter(([start, end]) => start !== removedIndex && end !== removedIndex)

    if (selectedVertexIndexRef.current !== null && selectedVertexIndexRef.current >= vertices.length) {
      selectedVertexIndexRef.current = null
      setSelectedVertexIndex(null)
    }

    actions.redrawPolygon()
  }

  const rectangleCompleted = selectionMethod === 'rectangle' && selectedRectangle
  const polygonCompleted = selectionMethod === 'polygon' && polygonPointCount >= 3

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm bg-blue-50 p-3 rounded-md border border-blue-200 text-blue-900">
        <AlertCircle className="h-4 w-4" />
        <span>
          {selectionMethod === 'rectangle'
            ? '地図を2回続けて押したまま動かして、四角で囲んでください。'
            : 'まず点を置きます。次に「点と点をつなぐ」で線をつないでください。'}
        </span>
      </div>

      {selectionMethod === 'polygon' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={polygonEditMode === 'place' ? 'default' : 'outline'}
              onClick={() => setPolygonEditMode('place')}
            >
              点を置く
            </Button>
            <Button
              type="button"
              variant={polygonEditMode === 'connect' ? 'default' : 'outline'}
              onClick={() => setPolygonEditMode('connect')}
            >
              点と点をつなぐ
            </Button>
          </div>

          <p className="text-xs text-muted-foreground px-1">
            {polygonEditMode === 'place'
              ? `地図を押して点を追加します（最大${MAX_POLYGON_POINTS}点）。点は動かせます。`
              : `2つの点を順番に押して線を追加または削除します。${selectedVertexIndex !== null ? `（${selectedVertexIndex + 1}点目を選択中）` : ''}`}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={handleUndoPolygonPoint}>
              最後の点を消す ({polygonPointCount}/{MAX_POLYGON_POINTS})
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              選び直す
            </Button>
          </div>
        </div>
      )}

      <div className="relative w-full h-96 rounded-lg border bg-muted overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {rectangleCompleted || polygonCompleted ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm bg-green-50 p-3 rounded-md border border-green-200 text-green-900">
            <CheckCircle2 className="h-4 w-4" />
            <span>場所を選べました。次は「地図を作る」を押してください。</span>
          </div>
          {selectionMethod === 'rectangle' && (
            <Button variant="outline" onClick={handleReset} className="w-full">
              選び直す
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
