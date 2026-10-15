'use client'

import { useState } from 'react'

import ConfirmDeleteDialog from '@/components/feedback/ConfirmDeleteDialog'
import Toast from '@/components/feedback/Toast'
import FormAlert from '@/components/form/FormAlert'
import RouteChoiceList from '@/components/route/RouteChoiceList'
import RoutePreview from '@/components/route/RoutePreview'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useMyRoutes } from '@/hooks/useMyRoutes'
import { useRouteDeletion } from '@/hooks/useRouteDeletion'
import { useRouteDetail } from '@/hooks/useRouteDetail'
import { LINK_COPIED_MESSAGE, SHARE_FAILED_MESSAGE, useShareRoute } from '@/hooks/useShareRoute'
import RouteEditView from '@/views/routes/RouteEditView'

interface RouteListViewProps {
  onClose: () => void
  onCreateRoute: () => void
}

/** The user's routes: preview one on a small map, then edit or delete it. */
export default function RouteListView({ onClose, onCreateRoute }: RouteListViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const myRoutes = useMyRoutes()
  const detail = useRouteDetail(selectedId)
  const deletion = useRouteDeletion({
    routeId: selectedId,
    onDeleted: () => {
      setSelectedId(null)
      myRoutes.reload()
    },
  })
  const sharing = useShareRoute({ routeId: selectedId })
  // A full-height screen with its own close button, so the tab bar steps aside. While the edit
  // view is showing it decides that itself.
  useHideTabBar(!isEditing)

  const handleSaved = () => {
    setIsEditing(false)
    myRoutes.reload()
    detail.retry()
  }

  if (isEditing && detail.route) {
    return (
      <RouteEditView route={detail.route} onClose={() => setIsEditing(false)} onSaved={handleSaved} />
    )
  }

  const selectedName = myRoutes.routes.find(({ id }) => id === selectedId)?.name ?? ''
  return (
    <main className="screen-body route-screen">
      <div className="screen-header">
        <h1 className="text-heading">Routes</h1>
        <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      <div className="route-screen-body">
        <RoutePreview size="compact" status={detail.status} route={detail.shownRoute} onRetry={detail.retry} />
        <RouteChoiceList
          size="fill"
          status={myRoutes.status}
          routes={myRoutes.routes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRetry={myRoutes.reload}
          emptyAction={
            <button className="button button-primary" type="button" onClick={onCreateRoute}>
              Create a route
            </button>
          }
        />
      </div>
      <FormAlert message={sharing.hasFailed ? SHARE_FAILED_MESSAGE : null} />
      <div className="button-group">
        <div className="button-row button-row-even">
          <button
            className="button button-soft button-error button-lg"
            type="button"
            disabled={selectedId === null}
            onClick={deletion.requestDeletion}
          >
            <span className="icon icon-trash" aria-hidden="true"></span>
            Delete
          </button>
          <button
            className="button button-soft button-lg"
            type="button"
            disabled={selectedId === null}
            onClick={sharing.copyLink}
          >
            <span className="icon icon-share" aria-hidden="true"></span>
            Share
          </button>
        </div>
        <button
          className="button button-primary button-lg button-block"
          type="button"
          disabled={!detail.route}
          onClick={() => setIsEditing(true)}
        >
          <span className="icon icon-edit" aria-hidden="true"></span>
          Edit
        </button>
      </div>
      {sharing.isCopied && (
        <div className="toast-region">
          <Toast message={LINK_COPIED_MESSAGE} onDismiss={sharing.dismissCopied} />
        </div>
      )}
      <ConfirmDeleteDialog
        isOpen={deletion.isConfirming}
        title="Delete this route?"
        description={`“${selectedName}” will be deleted for good. This cannot be undone.`}
        isPending={deletion.isPending}
        error={deletion.error}
        onCancel={deletion.cancel}
        onConfirm={deletion.confirm}
      />
    </main>
  )
}
