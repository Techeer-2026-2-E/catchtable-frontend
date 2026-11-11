import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useWaitingSettings, useWaitingSettingsMutations } from '@/features/owner-waiting'
import { getErrorMessage } from '@/shared/lib'
import { Banner, Button, Chip, ChipGroup, ErrorState, ListSkeleton, Page, Section, toast, TopBar } from '@/shared/ui'
import styles from './OwnerWaitingSettingsPage.module.css'

/** 백엔드 허용 범위는 1~60분. 화면은 자주 쓰는 값만 칩으로 보여준다 */
const ARRIVAL_OPTIONS = [5, 10, 15, 20, 30]

/**
 * 웨이팅 설정 — 호출 후 도착 제한시간
 * GET/PUT /api/owner/stores/{storeId}/waitings/settings { arrivalLimitMinutes }
 * 접수 시작·마감은 웨이팅 현황 화면 위쪽 토글에서 바꾼다
 */
export function OwnerWaitingSettingsPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const navigate = useNavigate()
  const settings = useWaitingSettings(id)
  const { update } = useWaitingSettingsMutations(id)
  const [picked, setPicked] = useState<number | null>(null)

  if (settings.isPending) {
    return (
      <Page>
        <TopBar title="웨이팅 설정" />
        <ListSkeleton rows={3} trailing />
      </Page>
    )
  }
  if (settings.isError) {
    return (
      <Page>
        <TopBar title="웨이팅 설정" />
        <ErrorState onRetry={() => settings.refetch()} />
      </Page>
    )
  }

  const current = settings.data.arrivalLimitMinutes
  const value = picked ?? current
  const options = ARRIVAL_OPTIONS.includes(current) ? ARRIVAL_OPTIONS : [...ARRIVAL_OPTIONS, current].sort((a, b) => a - b)

  const save = () =>
    update.mutate(
      { arrivalLimitMinutes: value },
      {
        onSuccess: () => {
          toast(`도착 제한시간을 ${value}분으로 바꿨어요`)
          navigate(-1)
        },
        onError: (e) => toast(getErrorMessage(e, '저장하지 못했어요')),
      },
    )

  return (
    <Page
      bottom={
        <Button fullWidth disabled={value === current || update.isPending} onClick={save}>
          저장
        </Button>
      }
    >
      <TopBar title="웨이팅 설정" />
      <Section title="도착 제한시간" action={<span className="t-caption-12 text-tertiary">호출 후 기다리는 시간</span>}>
        <ChipGroup label="도착 제한시간" className={styles.chips}>
          {options.map((m) => (
            <Chip key={m} selected={value === m} onClick={() => setPicked(m)}>
              {m}분
            </Chip>
          ))}
        </ChipGroup>
        <p className="t-body-14 text-secondary">
          손님을 호출한 뒤 이 시간 안에 오지 않으면 노쇼 처리할 수 있어요. 손님이 가는 중이라고 응답해도 시간은 그대로 흘러요. 호출을 다시 보내면 처음부터 다시 흘러요.
        </p>
      </Section>
      <div className={styles.banner}>
        <Banner>바꾼 시간은 다음 호출부터 적용돼요</Banner>
      </div>
    </Page>
  )
}
