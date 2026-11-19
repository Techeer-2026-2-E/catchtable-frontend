import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { responsiveSrcSet } from '@/shared/lib/image'
import { ImagePlaceholder } from '@/shared/ui'

describe('사진 자리 (ImagePlaceholder)', () => {
  it('작은 변형이 있는 목 사진만 srcset 을 만든다', () => {
    expect(responsiveSrcSet('/images/stores/photos/korean-02.webp')).toBe(
      '/images/stores/photos/thumbs/korean-02-240.webp 240w, /images/stores/photos/thumbs/korean-02-480.webp 480w, /images/stores/photos/korean-02.webp 800w',
    )
    expect(responsiveSrcSet('https://cdn.example.com/store/1.jpg')).toBeUndefined()
    expect(responsiveSrcSet('/images/stores/korean.svg')).toBeUndefined()
    expect(responsiveSrcSet(undefined)).toBeUndefined()
  })

  it('사진을 불러오지 못하면 대신할 그림을, 그것도 실패하면 아이콘을 보여준다', () => {
    const { container } = render(<ImagePlaceholder src="https://cdn.example.com/broken.jpg" fallbackSrc="/images/stores/korean.svg" sizes="136px" />)
    const img = () => container.querySelector('img')
    expect(img()?.getAttribute('src')).toBe('https://cdn.example.com/broken.jpg')

    fireEvent.error(img()!)
    expect(img()?.getAttribute('src')).toBe('/images/stores/korean.svg')
    expect(img()?.hasAttribute('srcset')).toBe(false)

    fireEvent.error(img()!)
    expect(img()).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('주소가 바뀌면 다시 시도한다', () => {
    const view = render(<ImagePlaceholder src="/a.jpg" />)
    fireEvent.error(view.container.querySelector('img')!)
    expect(view.container.querySelector('img')).toBeNull()
    view.rerender(<ImagePlaceholder src="/b.jpg" />)
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/b.jpg')
  })
})
