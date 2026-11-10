import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronUp, List, LocateFixed, Map as MapIcon, RotateCw, Search, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { LatLng, MapBounds } from '@/entities'
import { useStoreDetail } from '@/features/store-detail'
import {
  DEFAULT_CENTER,
  isSearchable,
  MapStoreItem,
  MAX_SIDE_KM,
  nearlySameBounds,
  useMapMarkers,
  useMapStores,
} from '@/features/store-map'
import { paths, ROUTES } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { useGeolocation } from '@/shared/lib/useGeolocation'
import { Button, ErrorState, ImagePlaceholder, LoadingState, toast } from '@/shared/ui'
import { MapView, type MapHandle, type MapPin } from '@/shared/ui/map'
import styles from './StoreMapPage.module.css'

interface Viewport {
  bounds: MapBounds
  center: LatLng
}

/**
 * 지도로 매장 찾기 — 캐치테이블 "내 주변" 화면 구성
 * - 처음: 내 위치(권한이 없으면 강남역)를 가운데 두고 그 화면을 바로 검색
 * - 지도를 옮기면 "이 지역에서 검색" 버튼. 누를 때만 다시 조회 (백엔드 화면 범위 한 변 5km 제한)
 * - 핀을 누르면 아래에 매장 카드, "목록 보기"로 가까운 순 목록
 */
export function StoreMapPage() {
  const navigate = useNavigate()
  const geo = useGeolocation()
  const mapRef = useRef<MapHandle>(null)
  const [view, setView] = useState<Viewport | null>(null)
  const [searched, setSearched] = useState<Viewport | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [listOpen, setListOpen] = useState(false)

  /** 다음 멈춤에서 자동으로 검색할지 — 처음 열 때, 내 위치로 옮길 때 */
  const autoSearch = useRef(true)
  const geoSettled = useRef(false)
  const centeredOnMe = useRef(false)

  useEffect(() => {
    geoSettled.current = geo.status !== 'idle' && geo.status !== 'pending'
    if (geo.position && !centeredOnMe.current) {
      centeredOnMe.current = true
      autoSearch.current = true
      mapRef.current?.panTo(geo.position)
    }
  }, [geo.status, geo.position])

  const onIdle = (bounds: MapBounds, center: LatLng) => {
    const next = { bounds, center }
    setView(next)
    if ((autoSearch.current || !searched) && isSearchable(bounds)) {
      setSearched(next)
      if (geoSettled.current) autoSearch.current = false
    }
  }

  const research = () => {
    if (!view) return
    setSearched(view)
    setSelectedId(null)
  }

  const goToMe = async () => {
    const me = geo.position ?? (await geo.request())
    if (!me) {
      toast('위치 권한을 허용하면 내 주변 매장을 볼 수 있어요')
      return
    }
    autoSearch.current = true
    setSelectedId(null)
    mapRef.current?.panTo(me)
  }

  // 거리 기준 — 내 위치를 모르면 검색한 화면의 가운데
  const origin = geo.position ?? searched?.center ?? DEFAULT_CENTER
  const markers = useMapMarkers(searched?.bounds ?? null)
  const list = useMapStores(searched?.bounds ?? null, origin)
  const stores = useMemo(() => list.data?.pages.flatMap((p) => p.stores) ?? [], [list.data])

  const pins = useMemo<MapPin[]>(
    () =>
      (markers.data?.stores ?? []).map((m) => ({
        id: m.id,
        lat: m.latitude,
        lng: m.longitude,
        label: m.name,
        selected: m.id === selectedId,
      })),
    [markers.data, selectedId],
  )

  const tooWide = !!view && !isSearchable(view.bounds)
  const moved = !!view && !!searched && !nearlySameBounds(searched.bounds, view.bounds)
  const showSearchButton = !listOpen && (tooWide || moved || (!searched && !!view))

  const count = markers.data?.stores.length ?? 0
  const selected = selectedId == null ? null : stores.find((s) => s.id === selectedId) ?? null

  return (
    <div className={styles.page}>
      <MapView
        ref={mapRef}
        initialCenter={DEFAULT_CENTER}
        pins={pins}
        myLocation={geo.position}
        onIdle={onIdle}
        onPinClick={(id) => setSelectedId(id)}
        onMapClick={() => setSelectedId(null)}
      />

      <div className={styles.top}>
        <button
          type="button"
          className={styles.back}
          aria-label="뒤로"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(ROUTES.HOME))}
        >
          <ChevronLeft aria-hidden />
        </button>
        <Link to={ROUTES.SEARCH} className={styles.searchBar}>
          <Search aria-hidden />
          <span>어떤 맛집 찾으시나요?</span>
        </Link>
      </div>

      {showSearchButton && (
        <button type="button" className={styles.research} disabled={tooWide} onClick={research}>
          {tooWide ? (
            `지도를 확대하면 검색할 수 있어요 (한 변 ${MAX_SIDE_KM}km 이하)`
          ) : (
            <>
              <RotateCw aria-hidden />
              이 지역에서 검색
            </>
          )}
        </button>
      )}

      {!listOpen && (
        <div className={styles.bottom}>
          <div className={styles.floating}>
            <button type="button" className={styles.round} aria-label="내 위치로" onClick={goToMe} disabled={geo.status === 'pending'}>
              <LocateFixed aria-hidden />
            </button>
          </div>

          {selectedId != null ? (
            <div className={styles.selected}>
              <button type="button" className={styles.close} aria-label="매장 카드 닫기" onClick={() => setSelectedId(null)}>
                <X aria-hidden />
              </button>
              {selected ? (
                <MapStoreItem store={selected} to={paths.storeDetail(selected.id)} variant="card" />
              ) : (
                <SelectedFallback storeId={selectedId} />
              )}
            </div>
          ) : (
            <button type="button" className={styles.peek} onClick={() => setListOpen(true)} disabled={!searched}>
              <span className={styles.handle} aria-hidden />
              <span className={styles.peekRow}>
                <span className="t-headline-16">
                  {!searched
                    ? '지도를 확대해 검색해 주세요'
                    : markers.isPending
                      ? '매장을 찾는 중'
                      : markers.isError
                        ? '매장을 불러오지 못했어요'
                        : markers.data?.truncated
                          ? `이 지역 매장 ${count.toLocaleString()}곳 이상`
                          : `이 지역 매장 ${count}곳`}
                </span>
                {searched && (
                  <span className={`${styles.peekAction} t-label-13`}>
                    <List aria-hidden />
                    목록 보기
                    <ChevronUp aria-hidden />
                  </span>
                )}
              </span>
              {markers.data?.truncated && <span className="t-caption-12 text-tertiary">핀이 너무 많아 일부만 보여요. 지도를 확대해 보세요</span>}
            </button>
          )}
        </div>
      )}

      {listOpen && (
        <section className={styles.sheet} aria-label="이 지역 매장 목록">
          <header className={styles.sheetHead}>
            <h2 className="t-title-18">이 지역 매장 {markers.data?.truncated ? `${count.toLocaleString()}곳 이상` : `${count}곳`}</h2>
            <span className="t-caption-13 text-tertiary">{geo.position ? '내 위치에서 가까운 순' : '지도 가운데에서 가까운 순'}</span>
          </header>
          {list.isPending ? (
            <LoadingState compact />
          ) : list.isError ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : stores.length === 0 ? (
            <p className={cn(styles.empty, 't-body-14 text-tertiary')}>이 지역에는 매장이 없어요. 지도를 옮겨 다시 검색해 보세요</p>
          ) : (
            <ul className={styles.list}>
              {stores.map((store) => (
                <li key={store.id}>
                  <MapStoreItem store={store} to={paths.storeDetail(store.id)} />
                </li>
              ))}
            </ul>
          )}
          {list.isFetchNextPageError ? (
            <ErrorState message="매장을 더 불러오지 못했어요" onRetry={() => list.fetchNextPage()} />
          ) : (
            list.hasNextPage && (
              <Button variant="outline" fullWidth disabled={list.isFetching} onClick={() => list.fetchNextPage()}>
                {list.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
              </Button>
            )
          )}
          <button type="button" className={styles.toMap} onClick={() => setListOpen(false)}>
            <MapIcon aria-hidden />
            지도
          </button>
        </section>
      )}
    </div>
  )
}

/** 목록에 아직 안 불러온 매장의 핀을 눌렀을 때 — 매장 상세로 이름, 종류, 주소만 */
function SelectedFallback({ storeId }: { storeId: number }) {
  const { data, isPending, isError } = useStoreDetail(storeId)
  if (isPending) return <div className={styles.fallbackCard}><LoadingState compact /></div>
  if (isError || !data) return <div className={styles.fallbackCard}><p className="t-body-14 text-tertiary">매장 정보를 불러오지 못했어요</p></div>
  return (
    <Link to={paths.storeDetail(storeId)} className={styles.fallbackCard}>
      <ImagePlaceholder src={data.imageUrl ?? undefined} className={styles.fallbackThumb} radius={8} />
      <span className={styles.fallbackText}>
        <span className="t-headline-16">{data.name}</span>
        <span className="t-caption-13 text-secondary">{data.categoryName}</span>
        <span className="t-caption-13 text-tertiary">{data.address}</span>
      </span>
    </Link>
  )
}
