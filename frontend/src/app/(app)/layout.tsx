import AppShell from '@/components/layout/AppShell'
import AuthGuard from '@/components/layout/AuthGuard'

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard require="authenticated">
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
