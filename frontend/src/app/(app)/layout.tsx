import AppShell from '@/components/layout/AppShell'
import AuthGuard from '@/components/layout/AuthGuard'
import LiveNotificationProvider from '@/context/LiveNotificationProvider'

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard require="authenticated">
      <LiveNotificationProvider>
        <AppShell>{children}</AppShell>
      </LiveNotificationProvider>
    </AuthGuard>
  )
}
