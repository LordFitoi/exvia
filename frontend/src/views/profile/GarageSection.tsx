import type { SharedVehicle } from '@/types/profile'

interface GarageSectionProps<TVehicle extends SharedVehicle> {
  vehicles: readonly TVehicle[]
  /** Shows the Add link; leave it out to show the garage of another rider. */
  onAdd?: () => void
  /** Shows an edit button on each card; leave it out to show the garage of another rider. */
  onEdit?: (vehicle: TVehicle) => void
}

const describeVehicle = ({ year, color }: SharedVehicle): string =>
  [year, color].filter(Boolean).join(' · ')

/** The vehicles as cards that scroll sideways, with the link that adds one and an edit button per card for the owner. */
export default function GarageSection<TVehicle extends SharedVehicle>({
  vehicles,
  onAdd,
  onEdit,
}: GarageSectionProps<TVehicle>) {
  return (
    <section aria-labelledby="garage-title">
      <div className="section-heading">
        <h3 id="garage-title">Garage</h3>
        {onAdd && (
          <button className="link-action" type="button" onClick={onAdd}>
            Add
          </button>
        )}
      </div>
      {vehicles.length === 0 ? (
        <p className="text-small text-muted">No vehicles yet.</p>
      ) : (
        <div className="garage">
          {vehicles.map((vehicle) => (
            <article key={vehicle.id} className="card vehicle-card">
              <div className="screen-header">
                <span className="list-item-icon" aria-hidden="true">
                  <span className="icon icon-bike"></span>
                </span>
                {onEdit && (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Edit ${vehicle.brand} ${vehicle.model}`}
                    onClick={() => onEdit(vehicle)}
                  >
                    <span className="icon icon-sm icon-edit" aria-hidden="true"></span>
                  </button>
                )}
              </div>
              <div>
                <h4 className="text-subtitle">
                  {vehicle.brand} {vehicle.model}
                </h4>
                <p className="text-caption">{describeVehicle(vehicle)}</p>
              </div>
              {vehicle.license_plate && <span className="vehicle-plate">{vehicle.license_plate}</span>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
