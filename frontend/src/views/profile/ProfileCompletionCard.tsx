import type { CSSProperties } from 'react'

import { STEP_PROMPTS } from '@/services/profileSteps'
import type { ProfileCompletion, ProfileStep } from '@/types/profile'

const PERCENT = 100

interface ProfileCompletionCardProps {
  completion: ProfileCompletion
  /** Starts the step the card suggests next. */
  onStart: (step: ProfileStep) => void
}

const describeStepsLeft = (count: number): string => {
  if (count === 0) return 'All done'
  return count === 1 ? '1 step left' : `${count} steps left`
}

/** How much of the profile is filled in, with a bar and the next step to take. */
export default function ProfileCompletionCard({ completion, onStart }: ProfileCompletionCardProps) {
  const { percentage, missing } = completion
  const [nextStep] = missing
  const barStyle: CSSProperties & Record<'--progress', number> = { '--progress': percentage / PERCENT }

  return (
    <article className="card stack stack-sm" aria-label="Profile completion">
      <div className="stepper">
        <div className="stepper-header">
          <span className="stepper-label">Profile {percentage}% complete</span>
          <span className="text-caption">{describeStepsLeft(missing.length)}</span>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Profile completion"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={PERCENT}
        >
          <div className="progress-bar" style={barStyle}></div>
        </div>
      </div>
      {nextStep && (
        <button className="link-action" type="button" onClick={() => onStart(nextStep)}>
          {STEP_PROMPTS[nextStep]}
        </button>
      )}
    </article>
  )
}
