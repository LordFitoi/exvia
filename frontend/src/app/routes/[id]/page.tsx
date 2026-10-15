import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'

import LoadingScreen from '@/components/feedback/LoadingScreen'
import { formatDistance, formatDuration } from '@/services/formatRoute'
import { fetchSharedRoute } from '@/services/sharedRouteApi'
import RouteShareView from '@/views/share/RouteShareView'
import type { SharedRoute } from '@/types/sharedRoute'

type SharedRoutePageProps = PageProps<'/routes/[id]'>

const describeRoute = ({ distance, estimated_time, author, description }: SharedRoute): string => {
  const facts = `${formatDistance(distance)} · ${formatDuration(estimated_time)} · by ${author}`
  return description ? `${facts}. ${description}` : facts
}

export async function generateMetadata({ params }: SharedRoutePageProps): Promise<Metadata> {
  const { id } = await params
  const route = await fetchSharedRoute(id)
  if (!route) return { title: 'Route not found' }

  const description = describeRoute(route)
  return {
    title: route.name,
    description,
    // The link is the only way in, so it stays out of search results.
    robots: { index: false, follow: false },
    openGraph: { type: 'website', siteName: 'Exvia', title: route.name, description },
    twitter: { card: 'summary_large_image', title: route.name, description },
  }
}

async function SharedRouteContent({ params }: Pick<SharedRoutePageProps, 'params'>) {
  const { id } = await params
  const route = await fetchSharedRoute(id)
  if (!route) notFound()
  return <RouteShareView route={route} />
}

export default function SharedRoutePage({ params }: SharedRoutePageProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SharedRouteContent params={params} />
    </Suspense>
  )
}
