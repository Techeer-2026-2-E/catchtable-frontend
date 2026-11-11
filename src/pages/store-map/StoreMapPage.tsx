import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
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
import { Button, ErrorState, ImagePlaceholder, ListSkeleton, toast } from '@/shared/ui'
import { MapView, type MapHandle, type MapPin } from '@/shared/ui/map'
import styles from './StoreMapPage.module.css'

interface Viewport {
  bounds: MapBounds
  center: LatLng
}

/** 아래 시트 단계 — peek: 요약 한 줄, half: 지도 반쯤 가리는 목록(처음), full: 전체 목록 */
type SheetMode = 'peek' | 'half' | 'full'

/** half 시트가 화면 아래 몇 % 를 덮는지 — CSS .half 와 맞춤 */
const HALF_RATIO = 0.5
/** 손잡이를 이만큼(px) 끌면 단계를 바꾼다 */
const DRAG_THRESHOLD = 30

/**
 * 지도로 매장 찾기 — 와이어프레임 "고객 화면 3 지도로 매장 찾기 (내 주변)"
 * - 처음: 내 위치(권한이 없으면 강남역)를 시트 위 보이는 영역 가운데 두고 바로 검색, 목록은 반쯤
 * - 지도를 옮기면 "이 지역에서 검색" 버튼. 누를 때만 다시 조회 (백엔드 화면 범위 한 변 5km 제한)
 * - 핀을 누르면 시트 대신 매장 카드. 바탕을 누르면 카드를 닫고, 카드가 없으면 시트를 요약으로 접는다
 * - 시트 손잡이: 위로 끌거나 누르면 펼치고, 아래로 끌면 접는다
 */
export function StoreMapPage() {
  const navigate = useNavigate()
  const geo = useGeolocation()
  const pageRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapHandle>(null)
  const [view, setView] = useState<Viewport | null>(null)
  const [searched, setSearched] = useState<Viewport | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheet, setSheet] = useState<SheetMode>('half')

  /** 다음 멈춤에서 자동으로 검색할지 — 처음 열 때, 내 위치로 옮길 때 */
  const autoSearch = useRef(true)
  const geoSettled = useRef(false)
  const centeredOnMe = useRef(false)

  /** 지금 시트가 가리는 만큼 지점을 위로 올려 보여 줄 px — 시트 높이의 절반 */
  const focusOffset = (mode: SheetMode = sheet) => {
    const height = pageRef.current?.clientHeight ?? window.innerHeight
    return mode === 'half' ? Math.round((height * HALF_RATIO) / 2) : mode === 'peek' ? 40 : 0
  }
  // 처음 그릴 때의 오프셋 — 시트가 half 로 시작
  const [initialOffset] = useState(() => Math.round((window.innerHeight * HALF_RATIO) / 2))

  useEffect(() => {
    geoSettled.current = geo.status !== 'idle' && geo.status !== 'pending'
    if (geo.position && !centeredOnMe.current) {
      centeredOnMe.current = true
      autoSearch.current = true
      mapRef.current?.panTo(geo.position, { offsetY: focusOffset() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 위치가 처음 잡힐 때 한 번
  }, [geo.status, geo.position])

  const onIdle = (bounds: MapBounds, mapCenter: LatLng) => {
    // 시트에 가리지 않은 영역의 가운데 — 내 위치를 모를 때 거리 기준
    const height = pageRef.current?.clientHeight ?? window.innerHeight
    const shift = ((bounds.neLat - bounds.swLat) * focusOffset()) / height
    const next = { bounds, center: { lat: mapCenter.lat + shift, lng: mapCenter.lng } }
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
    mapRef.current?.panTo(me, { offsetY: focusOffset() })
  }

  const onMapClick = () => {
    if (selectedId != null) setSelectedId(null)
    else if (sheet !== 'peek') setSheet('peek')
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
  const showSearchButton = sheet !== 'full' && (tooWide || moved || (!searched && !!view))

  const count = markers.data?.stores.length ?? 0
  const countLabel = markers.data?.truncated ? `이 지역 매장 ${count.toLocaleString()}곳 이상` : `이 지역 매장 ${count}곳`
  const selected = selectedId == null ? null : stores.find((s) => s.id === selectedId) ?? null
  const showList = selectedId == null && sheet !== 'peek'

  return (
    <div ref={pageRef} className={styles.page}>
      <MapView
        ref={mapRef}
        initialCenter={DEFAULT_CENTER}
        initialOffsetY={initialOffset}
        pins={pins}
        myLocation={geo.position}
        onIdle={onIdle}
        onPinClick={(id) => setSelectedId(id)}
        onMapClick={onMapClick}
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

      {/* 내 위치 버튼 — 시트, 카드 바로 위 */}
      {sheet !== 'full' || selectedId != null ? (
        <button
          type="button"
          className={cn(styles.round, styles.locate, selectedId != null && styles.locateCard, showList && styles.locateHalf)}
          aria-label="내 위치로"
          onClick={goToMe}
          disabled={geo.status === 'pending'}
        >
          <LocateFixed aria-hidden />
        </button>
      ) : null}

      {selectedId != null ? (
        <div className={styles.bottom}>
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
        </div>
      ) : sheet === 'peek' ? (
        <div className={styles.bottom}>
          <button type="button" className={styles.peek} onClick={() => setSheet('half')} disabled={!searched}>
            <span className={styles.handle} aria-hidden />
            <span className={styles.peekRow}>
              <span className="t-headline-16">
                {!searched
                  ? '지도를 확대해 검색해 주세요'
                  : markers.isPending
                    ? '매장을 찾는 중'
                    : markers.isError
                      ? '매장을 불러오지 못했어요'
                      : countLabel}
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
        </div>
      ) : (
        <section className={cn(styles.sheet, sheet === 'half' ? styles.half : styles.full)} aria-label="이 지역 매장 목록">
          <SheetHandle mode={sheet} onChange={setSheet} />
          <div className={styles.sheetBody}>
            <header className={styles.sheetHead}>
              <h2 className="t-title-18">{searched ? countLabel : '이 지역 매장'}</h2>
              <span className="t-caption-13 text-tertiary">{geo.position ? '내 위치에서 가까운 순' : '지도 가운데에서 가까운 순'}</span>
            </header>
            {!searched ? (
              <p className={cn(styles.empty, 't-body-14 text-tertiary')}>지도를 확대해 검색해 주세요</p>
            ) : list.isPending ? (
              <ListSkeleton rows={3} thumb="square" inset={false} />
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
          </div>
          {sheet === 'full' && (
            <button type="button" className={styles.toMap} onClick={() => setSheet('peek')}>
              <MapIcon aria-hidden />
              지도
            </button>
          )}
        </section>
      )}
    </div>
  )
}

/** 시트 손잡이 — 위로 끌면 펼치고 아래로 끌면 접는다. 누르면 half 와 full 을 오간다 */
function SheetHandle({ mode, onChange }: { mode: SheetMode; onChange: (mode: SheetMode) => void }) {
  const start = useRef<number | null>(null)
  const expand = () => onChange(mode === 'peek' ? 'half' : 'full')
  const collapse = () => onChange(mode === 'full' ? 'half' : 'peek')

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    start.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (start.current == null) return
    const dy = e.clientY - start.current
    start.current = null
    if (dy < -DRAG_THRESHOLD) expand()
    else if (dy > DRAG_THRESHOLD) collapse()
    else onChange(mode === 'full' ? 'half' : 'full')
  }

  return (
    <button
      type="button"
      className={styles.sheetHandle}
      aria-label={mode === 'full' ? '목록 접기' : '목록 펼치기'}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') expand()
        if (e.key === 'ArrowDown') collapse()
      }}
    >
      <span className={styles.handle} aria-hidden />
    </button>
  )
}

/** 목록에 아직 안 불러온 매장의 핀을 눌렀을 때 — 매장 상세로 이름, 종류, 주소만 */
function SelectedFallback({ storeId }: { storeId: number }) {
  const { data, isPending, isError } = useStoreDetail(storeId)
  if (isPending) return <div className={styles.fallbackCard}><ListSkeleton rows={1} thumb="square" inset={false} /></div>
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
