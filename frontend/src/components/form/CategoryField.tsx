import { useId } from 'react'

import FieldMessage from '@/components/form/FieldMessage'
import { DEFAULT_PLACE_LOCATION_CATEGORY, PLACE_LOCATION_CATEGORIES } from '@/services/placeLocationCategories'

interface CategoryFieldProps {
  name: string
  label: string
  error?: string
}

/** The kinds of saved place as a group of icon tiles, one radio each. "Other" starts chosen. */
export default function CategoryField({ name, label, error }: CategoryFieldProps) {
  const messageId = `${useId()}-message`

  return (
    <div className="field">
      <fieldset className="category-grid" aria-describedby={error ? messageId : undefined}>
        <legend className="field-label">{label}</legend>
        {PLACE_LOCATION_CATEGORIES.map(({ value, label: categoryLabel, iconClass }) => (
          <label key={value} className="category-option">
            <input type="radio" name={name} value={value} defaultChecked={value === DEFAULT_PLACE_LOCATION_CATEGORY} />
            <span className={`icon icon-lg ${iconClass}`} aria-hidden="true"></span>
            {categoryLabel}
          </label>
        ))}
      </fieldset>
      <FieldMessage id={messageId} error={error} />
    </div>
  )
}
