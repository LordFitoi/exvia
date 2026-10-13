import StateView from '@/components/feedback/StateView'

interface MapStatusViewProps {
  title: string
  description: string
}

export default function MapStatusView({ title, description }: MapStatusViewProps) {
  return (
    <main className="screen-body">
      <h1 className="text-heading">Map</h1>
      <StateView title={title} description={description}>
        <span className="icon icon-lg icon-locate"></span>
      </StateView>
    </main>
  )
}
