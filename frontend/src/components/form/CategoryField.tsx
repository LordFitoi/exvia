import { useId } from 'react'

import FieldMessage from '@/components/form/FieldMessage'
import { DEFAULT_PLACE_LOCATION_CATEGORY, PLACE_LOCATION_CATEGORIES } from '@/services/placeLocationCategories'

interface CategoryFieldProps {
  name: string
  label: string
  error?: string
  /** The kind that starts chosen; "other" when not given. */
  defaultValue?: string
}

/** The kinds of saved place as a group of icon tiles, one radio each. "Other" starts chosen unless told otherwise. */
export default function CategoryField({ name, label, error, defaultValue = DEFAULT_PLACE_LOCATION_CATEGORY }: CategoryFieldProps) {
  const messageId = `${useId()}-message`

  return (
    <div className="field">
      <fieldset className="category-grid" aria-describedby={error ? messageId : undefined}>
        <legend className="field-label">{label}</legend>
        {PLACE_LOCATION_CATEGORIES.map(({ value, label: categoryLabel, iconClass }) => (
          <label key={value} className="category-option">
            <input type="radio" name={name} value={value} defaultChecked={value === defaultValue} />
            <span className={`icon icon-lg ${iconClass}`} aria-hidden="true"></span>
            {categoryLabel}
          </label>
        ))}
      </fieldset>
      <FieldMessage id={messageId} error={error} />
    </div>
  )
}
