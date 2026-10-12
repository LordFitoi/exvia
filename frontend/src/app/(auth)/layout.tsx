import AuthGuard from '@/components/layout/AuthGuard'

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard require="anonymous">
      <main className="app-shell">
        <div className="screen-body screen-body-centered">{children}</div>
      </main>
    </AuthGuard>
  )
}
