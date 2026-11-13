import { useCallback, useState } from 'react'

/** 최근 검색어 — 이 브라우저에만 저장 (서버에 보내지 않음) */
const KEY = 'catchtable:recent-searches'
const MAX = 10

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

function write(list: string[]) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list))
    else localStorage.removeItem(KEY)
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등) — 이번 화면에서만 기억
  }
}

/** 같은 검색어는 맨 앞으로, 최대 10개 */
export const addRecent = (list: string[], keyword: string) => {
  const k = keyword.trim()
  if (!k) return list
  return [k, ...list.filter((v) => v !== k)].slice(0, MAX)
}

export function useRecentSearches() {
  const [items, setItems] = useState(read)
  const update = useCallback((next: (prev: string[]) => string[]) => {
    setItems((prev) => {
      const list = next(prev)
      write(list)
      return list
    })
  }, [])
  return {
    items,
    add: useCallback((keyword: string) => update((prev) => addRecent(prev, keyword)), [update]),
    remove: useCallback((keyword: string) => update((prev) => prev.filter((v) => v !== keyword)), [update]),
    clear: useCallback(() => update(() => []), [update]),
  }
}
