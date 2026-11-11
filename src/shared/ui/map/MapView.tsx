import { useEffect, useState } from 'react'
import { env } from '@/shared/config'
import { KakaoMapView } from './KakaoMapView'
import { loadKakaoMaps, type KakaoMaps } from './kakaoLoader'
import styles from './MapView.module.css'
import { SchematicMapView } from './SchematicMapView'
import type { MapViewProps } from './types'

type Sdk = { status: 'loading' } | { status: 'ready'; maps: KakaoMaps } | { status: 'none' }

/**
 * 지도 — VITE_KAKAO_MAP_KEY 가 있으면 카카오맵, 없거나 불러오지 못하면 간이 지도
 * 화면은 어느 쪽이든 같은 props(핀, 내 위치, 범위 알림)만 쓴다
 */
export function MapView(props: MapViewProps) {
  const key = env.kakaoMapKey
  const [sdk, setSdk] = useState<Sdk>(() => (key ? { status: 'loading' } : { status: 'none' }))

  useEffect(() => {
    if (!key) return
    let alive = true
    loadKakaoMaps(key)
      .then((maps) => alive && setSdk({ status: 'ready', maps }))
      .catch(() => alive && setSdk({ status: 'none' }))
    return () => {
      alive = false
    }
  }, [key])

  if (sdk.status === 'loading') return <div className={`${styles.map} ${styles.loading}`} aria-busy="true" />
  if (sdk.status === 'ready') return <KakaoMapView {...props} maps={sdk.maps} />
  return <SchematicMapView {...props} />
}
