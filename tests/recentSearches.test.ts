import { describe, expect, it } from 'vitest'
import { addRecent } from '@/features/store-search'

describe('최근 검색어', () => {
  it('새 검색어를 맨 앞에 넣고, 같은 검색어는 앞으로 옮긴다', () => {
    expect(addRecent(['라멘', '카페'], '파스타')).toEqual(['파스타', '라멘', '카페'])
    expect(addRecent(['라멘', '카페'], '카페')).toEqual(['카페', '라멘'])
  })

  it('앞뒤 공백을 지우고 빈 검색어는 넣지 않는다', () => {
    expect(addRecent(['라멘'], '  카페 ')).toEqual(['카페', '라멘'])
    expect(addRecent(['라멘'], '   ')).toEqual(['라멘'])
  })

  it('10개까지만 둔다', () => {
    const many = Array.from({ length: 10 }, (_, i) => `k${i}`)
    const next = addRecent(many, 'new')
    expect(next).toHaveLength(10)
    expect(next[0]).toBe('new')
    expect(next).not.toContain('k9')
  })
})
