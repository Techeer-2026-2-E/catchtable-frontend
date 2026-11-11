import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, CircleCheck, Timer, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router";
import {
  ACTIVE_WAITING_STATUSES,
  RESERVATION_STATUS_LABEL,
  WAITING_STATUS_LABEL,
  type HistoryItem,
  type ReservationStatus,
  type WaitingStatus,
} from "@/entities";
import {
  reservationKeys,
  useHistory,
  useReservationDetail,
} from "@/features/reservation";
import { useStoreDetail } from "@/features/store-detail";
import { useWaitingActions, useWaitingDetail } from "@/features/waiting";
import { paths } from "@/shared/config";
import { useModal } from "@/shared/hooks/useModal";
import { getErrorMessage } from "@/shared/lib";
import { dayjs } from "@/shared/lib/dayjs";
import { formatPhone } from "@/shared/lib/format";
import { Button, Dialog, EmptyState, ErrorState, ListSkeleton, Page, Ticket, toast, TopBar } from "@/shared/ui";
import styles from "./UsageStatusPage.module.css";

const PAST_LIMIT = 10;
const keyOf = (item: Pick<HistoryItem, "type" | "id">) =>
  `${item.type === "WAITING" ? "waiting" : "reservation"}-${item.id}`;
const dayOf = (item: HistoryItem) =>
  item.reservationStartAt ?? item.waitingDate ?? item.requestedAt;
const timeOf = (item: HistoryItem) =>
  item.reservationStartAt ?? item.requestedAt;
/** "오후 6:00" */
const clock = (iso: string) => dayjs(iso).format("A h:mm");

const reservationLabel = (status: ReservationStatus) => {
  const label = RESERVATION_STATUS_LABEL[status];
  return label.startsWith("예약") ? label : `예약 ${label}`;
};
const waitingLabel = (status: WaitingStatus) =>
  status === "WAITING"
    ? "대기 중"
    : status === "CALLED" || status === "CONFIRMED"
      ? "입장 호출"
      : `웨이팅 ${WAITING_STATUS_LABEL[status]}`;

/**
 * 이용 현황 — 진행 중인 웨이팅·예약은 노란 표, 지난 이용은 회색 표
 * 표의 "자세히" 를 누르면 표를 크게 보여주는 팝업 (와이어프레임「내 웨이팅, 예약 (여러 표)」「표 상세 팝업」)
 * 입장 호출을 받은 웨이팅은 표 안에서 바로 "가는 중" 응답 (POST /api/user/waitings/{id}/accept)
 */
export function UsageStatusPage() {
  const [params, setParams] = useSearchParams();
  const history = useHistory();
  const open = params.get("ticket");
  const setOpen = (key: string | null) =>
    setParams(key ? { ticket: key } : {}, { replace: true });

  const items = history.data ?? [];
  const active = items
    .filter((i) => i.active)
    .sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
  const past = items
    .filter((i) => !i.active)
    .sort((a, b) => timeOf(b).localeCompare(timeOf(a)))
    .slice(0, PAST_LIMIT);
  const opened = items.find((i) => keyOf(i) === open);

  return (
    <Page>
      <TopBar title="이용 현황" />
      {history.isPending ? (
        <ListSkeleton rows={3} variant="card" trailing />
      ) : history.isError ? (
        <ErrorState onRetry={() => history.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="아직 이용 내역이 없어요"
          description="마음에 드는 매장을 찾아 예약하거나 웨이팅해 보세요"
        />
      ) : (
        <div className={styles.wrap}>
          <section className={styles.section}>
            <h2 className="t-title-18">진행 중</h2>
            {active.length === 0 ? (
              <p className="t-body-14 text-tertiary">
                진행 중인 웨이팅이나 예약이 없어요
              </p>
            ) : (
              active.map((item) => (
                <UsageTicket
                  key={keyOf(item)}
                  item={item}
                  onOpen={() => setOpen(keyOf(item))}
                />
              ))
            )}
          </section>
          {past.length > 0 && (
            <section className={`${styles.section} ${styles.past}`}>
              <h2 className="t-title-18">지난 이용</h2>
              {past.map((item) => (
                <UsageTicket
                  key={keyOf(item)}
                  item={item}
                  onOpen={() => setOpen(keyOf(item))}
                />
              ))}
            </section>
          )}
        </div>
      )}
      {opened && <TicketPopup item={opened} onClose={() => setOpen(null)} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 목록의 표                                                            */
/* ------------------------------------------------------------------ */

function UsageTicket({
  item,
  onOpen,
}: {
  item: HistoryItem;
  onOpen: () => void;
}) {
  return item.type === "WAITING" && item.active ? (
    <ActiveWaitingTicket item={item} onOpen={onOpen} />
  ) : (
    <Ticket
      muted={!item.active}
      stub={<StubLine text={stubText(item)} onOpen={onOpen} />}
    >
      <TicketHead item={item} />
      <BigValue item={item} />
    </Ticket>
  );
}

function stubText(item: HistoryItem) {
  if (item.type === "RESERVATION")
    return `${item.partySize}명, 예약번호 ${item.id}`;
  return `${item.partySize}명, ${clock(item.requestedAt)} 접수`;
}

function StubLine({ text, onOpen }: { text: ReactNode; onOpen: () => void }) {
  return (
    <div className={styles.stubLine}>
      <span className="t-body-14 tnum">{text}</span>
      <button
        type="button"
        className={`${styles.more} t-label-13`}
        onClick={onOpen}
      >
        자세히
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}

function TicketHead({ item, label }: { item: HistoryItem; label?: string }) {
  return (
    <>
      <div className={styles.head}>
        <span className="t-label-13">
          {label ??
            (item.type === "RESERVATION"
              ? reservationLabel(item.status as ReservationStatus)
              : waitingLabel(item.status as WaitingStatus))}
        </span>
        <span className="t-caption-13 tnum">
          {dayjs(dayOf(item)).format("M월 D일 (dd)")}
        </span>
      </div>
      <p className="t-title-18">{item.storeName}</p>
    </>
  );
}

function BigValue({
  item,
  large = false,
}: {
  item: HistoryItem;
  large?: boolean;
}) {
  return item.type === "RESERVATION" ? (
    <p className={`${large ? styles.timeLarge : styles.time} tnum`}>
      {clock(item.reservationStartAt ?? item.requestedAt)}
    </p>
  ) : (
    <p className={large ? styles.numberLarge : styles.number}>
      <span className="tnum">{item.waitNumber}</span>번
    </p>
  );
}

/** 진행 중 웨이팅 — 상세를 받아 순서·호출 상태를 표에 표시 */
function ActiveWaitingTicket({
  item,
  onOpen,
}: {
  item: HistoryItem;
  onOpen: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: w } = useWaitingDetail(item.id);
  const { accept } = useWaitingActions(item.id);
  const remaining = useRemainingSeconds(w?.expiresAt ?? null);
  const status = w?.status ?? (item.status as WaitingStatus);
  const called = status === "CALLED" || status === "CONFIRMED";
  const responded =
    status === "CONFIRMED" ||
    (w?.arrivalIntent === "COMING" && !!w.respondedAt);
  const deadline = w?.expiresAt ? clock(w.expiresAt) : null;

  const respond = () =>
    accept.mutate(undefined, {
      onSuccess: () => {
        toast("가는 중이라고 매장에 알렸어요");
        queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      },
      onError: (e) => toast(getErrorMessage(e, "응답하지 못했어요")),
    });

  if (!called) {
    const ahead = w?.teamsAhead ?? 0;
    const position = w?.currentPosition ?? ahead + 1;
    return (
      <Ticket
        stub={
          <StubLine
            text={
              w
                ? `${item.partySize}명, ${position}번째 순서 (앞에 ${ahead}팀)`
                : `${item.partySize}명`
            }
            onOpen={onOpen}
          />
        }
      >
        <TicketHead item={item} label="대기 중" />
        <BigValue item={item} />
      </Ticket>
    );
  }

  return (
    <Ticket
      stub={
        responded ? (
          <div className={styles.called} aria-live="polite">
            <p className={`${styles.calledTitle} t-headline-16`}>
              <CircleCheck aria-hidden />
              가는 중이라고 알렸어요
            </p>
            <p className="t-caption-13 tnum">
              {w?.respondedAt && `${clock(w.respondedAt)}에 알림. `}
              {deadline && `${deadline} 안에 매장에 와주세요.`}
            </p>
          </div>
        ) : (
          <div className={styles.called} aria-live="assertive">
            <p className={`${styles.calledTitle} t-headline-16 tnum`}>
              <Timer aria-hidden />
              {deadline ? `${deadline} 안에 매장에 와주세요` : "입장 차례예요"}
              {remaining > 0 && (
                <span className={styles.remaining}>
                  {formatRemaining(remaining)} 남음
                </span>
              )}
            </p>
            <Button
              variant="secondary"
              fullWidth
              disabled={accept.isPending}
              onClick={respond}
            >
              가는 중
            </Button>
            <p className="t-caption-12">
              매장으로 가고 있으면 눌러주세요. 매장에 바로 알려드려요.
            </p>
          </div>
        )
      }
    >
      <TicketHead item={item} label="입장 호출" />
      <BigValue item={item} />
      <p className="t-body-14">{item.partySize}명</p>
    </Ticket>
  );
}

/* ------------------------------------------------------------------ */
/* 표 상세 팝업                                                          */
/* ------------------------------------------------------------------ */

function TicketPopup({
  item,
  onClose,
}: {
  item: HistoryItem;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(true, onClose, ref);
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.storeName} 상세`}
        className={styles.popup}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          aria-label="닫기"
          onClick={onClose}
        >
          <X />
        </button>
        {item.type === "WAITING" ? (
          <WaitingDetail item={item} onClose={onClose} />
        ) : (
          <ReservationDetail item={item} />
        )}
      </div>
    </div>,
    document.body,
  );
}

function Facts({ rows }: { rows: [string, ReactNode | null | undefined][] }) {
  return (
    <dl className={styles.facts}>
      {rows
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="tnum">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function WaitingDetail({
  item,
  onClose,
}: {
  item: HistoryItem;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: w } = useWaitingDetail(item.id);
  const store = useStoreDetail(item.storeId).data;
  const { cancel } = useWaitingActions(item.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const status = w?.status ?? (item.status as WaitingStatus);
  const isActive = ACTIVE_WAITING_STATUSES.includes(status);

  const rows: [string, ReactNode][] = [
    ["인원", `${item.partySize}명`],
    [
      "현재 순서",
      isActive && status === "WAITING" && w
        ? `${w.currentPosition ?? (w.teamsAhead ?? 0) + 1}번째 (앞에 ${w.teamsAhead ?? 0}팀)`
        : null,
    ],
    ["입장 기한", isActive && w?.expiresAt ? clock(w.expiresAt) : null],
    ["접수 시각", clock(item.requestedAt)],
    ["매장 주소", store?.address],
    ["매장 전화", store?.phone ? formatPhone(store.phone) : null],
  ];

  return (
    <>
      <Ticket muted={!isActive} className={styles.popupTicket}>
        <TicketHead
          item={item}
          label={isActive ? waitingLabel(status) : undefined}
        />
        <BigValue item={item} large />
      </Ticket>
      <div className={styles.popupBody}>
        <Facts rows={rows} />
        <div className={styles.popupActions}>
          <Button
            variant="outline"
            onClick={() => navigate(paths.storeDetail(item.storeId))}
          >
            매장 보기
          </Button>
          {isActive && (
            <Button variant="soft" onClick={() => setConfirmOpen(true)}>
              웨이팅 취소
            </Button>
          )}
        </div>
      </div>
      <Dialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="웨이팅을 취소할까요?"
        confirmLabel={cancel.isPending ? "취소 중…" : "웨이팅 취소"}
        onConfirm={() =>
          cancel.mutate(undefined, {
            onSuccess: () => {
              toast("웨이팅을 취소했어요");
              queryClient.invalidateQueries({ queryKey: reservationKeys.all });
              setConfirmOpen(false);
              onClose();
            },
            onError: (e) => toast(getErrorMessage(e, "취소하지 못했어요")),
          })
        }
      >
        취소하면 현재 순번이 사라지고 다시 신청해야 해요.
      </Dialog>
    </>
  );
}

function ReservationDetail({ item }: { item: HistoryItem }) {
  const navigate = useNavigate();
  const { data: r } = useReservationDetail(item.id);
  const store = useStoreDetail(item.storeId).data;
  const status = (r?.status ?? item.status) as ReservationStatus;
  const at = (iso: string | null | undefined) =>
    iso ? dayjs(iso).format("M월 D일 A h:mm") : null;

  const rows: [string, ReactNode][] = [
    ["인원", `${item.partySize}명`],
    [
      "이용 시간",
      item.reservationStartAt && item.reservationEndAt
        ? `${clock(item.reservationStartAt)} ~ ${clock(item.reservationEndAt)}`
        : null,
    ],
    ["예약번호", String(item.id)],
    ["요청 시각", at(r?.requestedAt)],
    ["확정 시각", at(r?.confirmedAt)],
    ["취소 시각", at(r?.cancelledAt)],
    ["매장 주소", item.active ? store?.address : null],
  ];

  return (
    <>
      <Ticket muted={!item.active} className={styles.popupTicket}>
        <TicketHead item={item} label={reservationLabel(status)} />
        <BigValue item={item} large />
      </Ticket>
      <div className={styles.popupBody}>
        <Facts rows={rows} />
        <div className={styles.popupActions}>
          <Button
            variant="outline"
            onClick={() => navigate(paths.storeDetail(item.storeId))}
          >
            매장 보기
          </Button>
          {status === "COMPLETED" ? (
            <Button
              variant="soft"
              onClick={() => navigate(paths.reviewWrite(item.id))}
            >
              리뷰 쓰기
            </Button>
          ) : (
            <Button
              variant="soft"
              onClick={() => navigate(paths.reservationDetail(item.id))}
            >
              {status === "CONFIRMED" ? "예약 변경, 취소" : "예약 상세"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

const formatRemaining = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** 호출 응답 제한 시각까지 남은 초 — 1초마다 갱신 */
function useRemainingSeconds(expiresAt: string | null) {
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNow(dayjs()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, dayjs(expiresAt).diff(now, "second")) : 0;
}
