import DropdownField from '@/components/form/DropdownField'
import type { DropdownOption } from '@/components/form/DropdownField'
import { BLOOD_TYPES } from '@/types/profile'

const COLUMNS = 4
const BLOOD_TYPE_OPTIONS: readonly DropdownOption[] = [
  { value: '', label: 'Not set', isWide: true },
  ...BLOOD_TYPES.map((bloodType) => ({ value: bloodType, label: bloodType })),
]

interface BloodTypeFieldProps {
  name: string
  label: string
  /** The blood type that starts chosen; empty for "Not set". */
  defaultValue: string
  error?: string
}

/** The guide's compact dropdown: "Not set" on a row of its own, then the eight blood types in four columns. */
export default function BloodTypeField({ name, label, defaultValue, error }: BloodTypeFieldProps) {
  return (
    <DropdownField
      name={name}
      label={label}
      options={BLOOD_TYPE_OPTIONS}
      defaultValue={defaultValue}
      columns={COLUMNS}
      error={error}
    />
  )
}
