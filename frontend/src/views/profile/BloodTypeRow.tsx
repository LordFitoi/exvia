const UNSET_LABEL = '–'

interface BloodTypeRowProps {
  /** One of the eight blood types, or empty when not given. */
  bloodType: string
}

/** The blood type in its red tag. It is changed in the Edit profile sheet. */
export default function BloodTypeRow({ bloodType }: BloodTypeRowProps) {
  return (
    <div className="list">
      <div className="list-item">
        <span className="blood-type">{bloodType || UNSET_LABEL}</span>
        <span className="list-item-body">
          <span className="list-item-title">Blood type</span>
          <span className="list-item-meta">{bloodType ? 'Medical information' : 'Not set yet'}</span>
        </span>
      </div>
    </div>
  )
}
