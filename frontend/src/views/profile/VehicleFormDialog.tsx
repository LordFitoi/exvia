'use client'

import FormSheet from '@/components/form/FormSheet'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { createVehicle, deleteVehicle, updateVehicle } from '@/services/profileApi'
import type { Vehicle } from '@/types/profile'
import DeleteRecordControl from '@/views/profile/DeleteRecordControl'

const FIELD_NAMES = ['brand', 'model', 'year', 'license_plate', 'color'] as const
const BRAND_MAX_LENGTH = 64
const MODEL_MAX_LENGTH = 64
const PLATE_MAX_LENGTH = 16
const COLOR_MAX_LENGTH = 32

interface VehicleFormDialogProps {
  /** The vehicle being edited; without it the dialog adds a new one. */
  vehicle?: Vehicle
  onClose: () => void
  onSaved: () => void
}

/** Asks for the brand, model and optional details of a vehicle, empty or filled in from `vehicle`. */
export default function VehicleFormDialog({ vehicle, onClose, onSaved }: VehicleFormDialogProps) {
  const isEditing = vehicle !== undefined
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async (values) => {
      const year = values.year.trim()
      const content = {
        brand: values.brand.trim(),
        model: values.model.trim(),
        year: year === '' ? null : Number(year),
        license_plate: values.license_plate.trim(),
        color: values.color.trim(),
      }
      if (vehicle) await updateVehicle(vehicle.id, content)
      else await createVehicle(content)
      onSaved()
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title={isEditing ? 'Edit vehicle' : 'New vehicle'}
      submitLabel={isEditing ? 'Save vehicle' : 'Add vehicle'}
      isPending={isPending}
      formError={formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        name="brand"
        label="Brand"
        autoComplete="off"
        autoCapitalize="words"
        maxLength={BRAND_MAX_LENGTH}
        defaultValue={vehicle?.brand}
        error={fieldErrors.brand}
      />
      <TextField
        name="model"
        label="Model"
        autoComplete="off"
        autoCapitalize="words"
        maxLength={MODEL_MAX_LENGTH}
        defaultValue={vehicle?.model}
        error={fieldErrors.model}
      />
      <TextField
        name="year"
        label="Year"
        type="number"
        autoComplete="off"
        defaultValue={vehicle?.year?.toString()}
        error={fieldErrors.year}
        isRequired={false}
      />
      <TextField
        name="license_plate"
        label="License plate"
        autoComplete="off"
        maxLength={PLATE_MAX_LENGTH}
        defaultValue={vehicle?.license_plate}
        error={fieldErrors.license_plate}
        isRequired={false}
      />
      <TextField
        name="color"
        label="Color"
        autoComplete="off"
        autoCapitalize="words"
        maxLength={COLOR_MAX_LENGTH}
        defaultValue={vehicle?.color}
        error={fieldErrors.color}
        isRequired={false}
      />
      {vehicle && (
        <DeleteRecordControl id={vehicle.id} recordName="vehicle" remove={deleteVehicle} onDeleted={onSaved} />
      )}
    </FormSheet>
  )
}
