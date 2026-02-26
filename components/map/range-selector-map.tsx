'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

type SelectionMode = 'rectangle' | 'polygon'
type PolygonInteractionMode = 'move' | 'connect'

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
  const [polygonInteractionMode, setPolygonInteractionMode] = useState<PolygonInteractionMode>('move')

  const drawingState = useRef({
    isDrawing: false,
    startLatLng: null as L.LatLng | null,
    tempRectangle: null as L.Rectangle | null,
    selectedRectangle: null as L.Rectangle | null,
    isDoubleClick: false,
  })

  const connectDragRef = useRef({
    startIndex: null as number | null,
    currentLatLng: null as L.LatLng | null,
  })

  const polygonState = useRef({
    vertices: [] as L.LatLng[],
    edges: [] as [number, number][],
    edgeLayers: [] as L.Polyline[],
    vertexMarkers: [] as L.CircleMarker[],
    previewLayer: null as L.Polyline | null,
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

    const clearConnectDraft = () => {
      connectDragRef.current.startIndex = null
      connectDragRef.current.currentLatLng = null
    }

    const clearPolygonLayers = () => {
      const pState = polygonState.current
      pState.edgeLayers.forEach((layer) => mapInstance.removeLayer(layer))
      pState.vertexMarkers.forEach((marker) => mapInstance.removeLayer(marker))
      if (pState.previewLayer) {
        mapInstance.removeLayer(pState.previewLayer)
        pState.previewLayer = null
      }
      pState.edgeLayers = []
      pState.vertexMarkers = []
    }

    const autoConnectLatestVertex = () => {
      const pState = polygonState.current
      const index = pState.vertices.length - 1

      if (index <= 0) return
      if (index === 1) {
        addEdge(0, 1)
        return
      }

      removeEdge(index - 1, 0)
      addEdge(index - 1, index)
      addEdge(index, 0)
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
        clearConnectDraft()
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
          color: '#f97316',
          weight: 3,
          opacity: 0.95,
        }).addTo(mapInstance)

        if (polygonInteractionMode === 'connect') {
          edgeLayer.on('click', () => {
            removeEdge(start, end)
            redrawPolygon()
          })
        }

        pState.edgeLayers.push(edgeLayer)
      })

      if (
        polygonInteractionMode === 'connect' &&
        connectDragRef.current.startIndex !== null &&
        connectDragRef.current.currentLatLng &&
        pState.vertices[connectDragRef.current.startIndex]
      ) {
        pState.previewLayer = L.polyline(
          [pState.vertices[connectDragRef.current.startIndex], connectDragRef.current.currentLatLng],
          {
            color: '#7c3aed',
            weight: 2,
            opacity: 0.85,
            dashArray: '6 6',
          },
        ).addTo(mapInstance)
      }

      pState.vertices.forEach((vertex, index) => {
        const isConnectSource = polygonInteractionMode === 'connect' && connectDragRef.current.startIndex === index
        const marker = L.circleMarker(vertex, {
          radius: 6,
          color: isConnectSource ? '#7c3aed' : '#1d4ed8',
          weight: 2,
          fillColor: isConnectSource ? '#c4b5fd' : '#60a5fa',
          fillOpacity: 1,
        }).addTo(mapInstance)

        if (polygonInteractionMode === 'move') {
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
        }

        if (polygonInteractionMode === 'connect') {
          marker.on('mousedown', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e)
            connectDragRef.current.startIndex = index
            connectDragRef.current.currentLatLng = e.latlng
            redrawPolygon()
          })

          marker.on('mouseup', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e)
            const startIndex = connectDragRef.current.startIndex

            if (startIndex === null) return
            if (startIndex !== index) {
              addEdge(startIndex, index)
            }

            clearConnectDraft()
            redrawPolygon()
          })
        }

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
      if (mode !== 'rectangle') return
      const state = drawingState.current
      state.isDoubleClick = true
      state.isDrawing = true
      state.startLatLng = e.latlng
    }

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (mode === 'rectangle') {
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

        return
      }

      if (mode === 'polygon' && polygonInteractionMode === 'connect' && connectDragRef.current.startIndex !== null) {
        connectDragRef.current.currentLatLng = e.latlng
        redrawPolygon()
      }
    }

    const onMouseUp = (e: L.LeafletMouseEvent | L.LeafletEvent) => {
      if (mode === 'rectangle') {
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
        return
      }

      if (mode === 'polygon' && polygonInteractionMode === 'connect' && connectDragRef.current.startIndex !== null) {
        clearConnectDraft()
        redrawPolygon()
      }
    }

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (mode !== 'polygon') return
      if (polygonInteractionMode !== 'move') return

      const pState = polygonState.current
      if (pState.vertices.length >= MAX_POLYGON_POINTS) return

      pState.vertices.push(e.latlng)
      autoConnectLatestVertex()
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
      clearConnectDraft,
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
  }, [mode, onBoundsChange, polygonInteractionMode])

  const handleReset = () => {
    const actions = (window as any).__rangeSelectorActions

    if (mode === 'rectangle') {
      if (actions?.clearRectangleLayers) actions.clearRectangleLayers()
      onBoundsChange(null)
      return
    }

    if (actions?.polygonState) {
      actions.polygonState.current.vertices = []
      actions.polygonState.current.edges = []
      if (actions?.clearConnectDraft) actions.clearConnectDraft()
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

    if (actions?.clearConnectDraft) actions.clearConnectDraft()

    actions.redrawPolygon()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
        <AlertCircle className="h-4 w-4" />
        <span>
          {mode === 'rectangle'
            ? '矩形モード: 地図をダブルクリック後にドラッグして範囲を選択'
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
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={polygonInteractionMode === 'move' ? 'default' : 'outline'}
              onClick={() => {
                setPolygonInteractionMode('move')
                const actions = (window as any).__rangeSelectorActions
                if (actions?.clearConnectDraft) actions.clearConnectDraft()
                if (actions?.redrawPolygon) actions.redrawPolygon()
              }}
            >
              点を移動/追加
            </Button>
            <Button
              type="button"
              variant={polygonInteractionMode === 'connect' ? 'default' : 'outline'}
              onClick={() => {
                setPolygonInteractionMode('connect')
                const actions = (window as any).__rangeSelectorActions
                if (actions?.clearConnectDraft) actions.clearConnectDraft()
                if (actions?.redrawPolygon) actions.redrawPolygon()
              }}
            >
              線を編集
            </Button>
          </div>

          {polygonInteractionMode === 'connect' && (
            <p className="text-xs text-muted-foreground px-1">
              点から別の点へドラッグして線を追加。既存の線はクリックで削除できます。
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={handleUndoPolygonPoint}>
              最後の点を削除 ({polygonPointCount}/{MAX_POLYGON_POINTS})
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              ポリゴンをクリア
            </Button>
          </div>
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
