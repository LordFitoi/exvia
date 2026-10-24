'use client'

import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { useConfirmedDeletion } from '@/hooks/useConfirmedDeletion'

interface DeleteRecordControlProps {
  id: number
  /** What is deleted, in lower case: "contact" or "vehicle". */
  recordName: string
  remove: (id: number) => Promise<void>
  onDeleted: () => void
}

/** The button of an edit form that deletes the record after asking first. */
export default function DeleteRecordControl({ id, recordName, remove, onDeleted }: DeleteRecordControlProps) {
  const deletion = useConfirmedDeletion({
    targetId: id,
    remove,
    failureMessage: `The ${recordName} could not be deleted. Check your connection and try again.`,
    onDeleted,
  })

  return (
    <>
      <button className="button button-outline button-block" type="button" onClick={deletion.requestDeletion}>
        Delete {recordName}
      </button>
      <ConfirmDialog
        isOpen={deletion.isConfirming}
        title={`Delete this ${recordName}?`}
        description="This cannot be undone."
        isPending={deletion.isPending}
        error={deletion.error}
        onCancel={deletion.cancel}
        onConfirm={deletion.confirm}
      />
    </>
  )
}
