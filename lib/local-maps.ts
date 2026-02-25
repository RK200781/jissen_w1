export interface SelectedBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface BaseFeatureData {
  roads: [number, number][][]
  buildings: [number, number][][]
}

export interface Facility {
  id: string
  name: string
  location: [number, number]
  icon: string
}

export interface LocalMapData {
  id: string
  name: string
  description: string | null
  bounds: SelectedBounds
  created_at: string
  baseFeatureData?: BaseFeatureData
  facilities?: Facility[]
}

const MAPS_KEY = 'maps'

export const loadMaps = (): LocalMapData[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(MAPS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const saveMaps = (maps: LocalMapData[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(MAPS_KEY, JSON.stringify(maps))
}

export const loadMapById = (id: string): LocalMapData | null => {
  const maps = loadMaps()
  return maps.find((map) => map.id === id) ?? null
}

export const saveMapById = (mapId: string, updater: (map: LocalMapData) => LocalMapData): LocalMapData | null => {
  const maps = loadMaps()
  const index = maps.findIndex((map) => map.id === mapId)

  if (index < 0) return null

  maps[index] = updater(maps[index])
  saveMaps(maps)
  return maps[index]
}
