/** 조건부 className 합치기 — cn('a', cond && 'b') → 'a b' */
export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')
