import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { WaitingPosition } from '@/entities'
import { env } from '@/shared/config'
import { waitingKeys } from '../api/queryKeys'
import { waitingApi } from '../api/waitingApi'

type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

/**
 * 웨이팅 대기순번 실시간 갱신(SSE) 구독 훅
 * 수신한 순번을 React Query 캐시(waitingKeys.position)에 반영하므로
 * 화면에서는 useWaitingPosition 으로 읽으면 됨
 *
 * NOTE: 네이티브 EventSource는 Authorization 헤더를 못 붙임.
 * 백엔드 인증 방식(쿠키 / 쿼리 토큰 / 헤더)이 확정되면 여기서 맞추기.
 * 헤더가 필요하면 `event-source-polyfill` 또는 `@microsoft/fetch-event-source` 도입 검토.
 */
export function useWaitingSSE(waitingId: number | null) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (waitingId == null) return

    const source = new EventSource(`${env.apiBaseUrl}${waitingApi.subscribePath(waitingId)}`, {
      withCredentials: true,
    })
    sourceRef.current = source

    source.onopen = () => setStatus('open')

    // TODO: 백엔드 이벤트 이름 확정 후 수정
    source.addEventListener('waiting-position', (event) => {
      const position = JSON.parse((event as MessageEvent<string>).data) as WaitingPosition
      queryClient.setQueryData(waitingKeys.position(waitingId), position)
    })

    source.onerror = () => {
      // EventSource는 기본적으로 자동 재연결을 시도함
      setStatus(source.readyState === EventSource.CLOSED ? 'closed' : 'error')
    }

    return () => {
      source.close()
      sourceRef.current = null
    }
  }, [waitingId, queryClient])

  const close = () => {
    sourceRef.current?.close()
    setStatus('closed')
  }

  return { status: waitingId == null ? 'idle' : status, close }
}
