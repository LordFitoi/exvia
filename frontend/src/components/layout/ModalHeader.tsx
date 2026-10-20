interface ModalHeaderProps {
  titleId: string
  title: string
  closeLabel: string
  onClose: () => void
}

/** Title on the left, close on the right: always a visible way out of a modal. */
export default function ModalHeader({ titleId, title, closeLabel, onClose }: ModalHeaderProps) {
  return (
    <div className="sheet-header">
      <h2 className="text-subtitle" id={titleId}>
        {title}
      </h2>
      <button className="icon-button" type="button" aria-label={closeLabel} onClick={onClose}>
        <span className="icon icon-x" aria-hidden="true"></span>
      </button>
    </div>
  )
}
