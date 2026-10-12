import AuthGuard from '@/components/layout/AuthGuard'
import TabBar from '@/components/layout/TabBar'

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard require="authenticated">
      <div className="app-shell">
        {children}
        <TabBar />
      </div>
    </AuthGuard>
  )
}
