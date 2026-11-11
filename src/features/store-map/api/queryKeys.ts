import type { LatLng, MapBounds } from '@/entities'

export const storeMapKeys = {
  all: ['store-map'] as const,
  markers: (bounds: MapBounds) => [...storeMapKeys.all, 'markers', bounds] as const,
  list: (bounds: MapBounds, me: LatLng) => [...storeMapKeys.all, 'list', bounds, me] as const,
  nearby: (me: LatLng) => [...storeMapKeys.all, 'nearby', me] as const,
}
