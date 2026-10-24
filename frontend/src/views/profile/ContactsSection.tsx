import { getInitials } from '@/services/riderInitials'
import type { EmergencyContact } from '@/types/profile'

const NON_DIALABLE = /[^\d+]/g

interface ContactsSectionProps {
  contacts: readonly EmergencyContact[]
  onAdd: () => void
  onEdit: (contact: EmergencyContact) => void
}

const describeContact = ({ relationship, phone_number }: EmergencyContact): string =>
  [relationship, phone_number].filter(Boolean).join(' · ')

/** The rider's emergency contacts, each with a call button and an edit button, and the link that adds one. */
export default function ContactsSection({ contacts, onAdd, onEdit }: ContactsSectionProps) {
  return (
    <section aria-labelledby="contacts-title">
      <div className="section-heading">
        <h3 id="contacts-title">Emergency contacts</h3>
        <button className="link-action" type="button" onClick={onAdd}>
          Add
        </button>
      </div>
      {contacts.length === 0 ? (
        <p className="text-small text-muted">No emergency contacts yet.</p>
      ) : (
        <ul className="list">
          {contacts.map((contact) => (
            <li key={contact.id} className="list-item">
              <span className="avatar" aria-hidden="true">
                {getInitials(contact.name)}
              </span>
              <span className="list-item-body">
                <span className="list-item-title">{contact.name}</span>
                <span className="list-item-meta">{describeContact(contact)}</span>
              </span>
              <button
                className="icon-button"
                type="button"
                aria-label={`Edit ${contact.name}`}
                onClick={() => onEdit(contact)}
              >
                <span className="icon icon-sm icon-edit" aria-hidden="true"></span>
              </button>
              <a
                className="icon-button contact-call"
                href={`tel:${contact.phone_number.replace(NON_DIALABLE, '')}`}
                aria-label={`Call ${contact.name}`}
              >
                <span className="icon icon-phone" aria-hidden="true"></span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
