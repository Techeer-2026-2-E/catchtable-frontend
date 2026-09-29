import { DevLoginButtons } from '@/features/auth'
import { Page, TopBar } from '@/shared/ui'

export function LoginPage() {
  return (
    <Page padded>
      <TopBar leading="close" />
      {/* TODO: 로그인 폼 (useLogin) */}
      <DevLoginButtons />
    </Page>
  )
}
