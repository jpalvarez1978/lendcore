import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { SkipToContent } from '@/components/shared/SkipToContent'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipToContent />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(200,155,85,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.06))] px-4 py-5 sm:px-6"
          >
            <div className="mx-auto w-full max-w-[1440px]">
              <Breadcrumbs />
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
