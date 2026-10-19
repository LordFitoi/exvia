import type { RouteGroup } from '@/types/routeGroup'
import { describeGroup, getGroupTitle } from '@/services/groupRules'

interface ActiveGroupSectionProps {
  group: RouteGroup
  onJoin: () => void
}

/** The group ride that is still rolling, with a way back into it. Render it only when there is one. */
export default function ActiveGroupSection({ group, onJoin }: ActiveGroupSectionProps) {
  const iconClass = group.route ? 'icon-route' : 'icon-navigation'

  return (
    <section className="stack-sm" aria-labelledby="active-group-title">
      <h2 className="text-overline" id="active-group-title">
        Riding now
      </h2>
      <ul className="list">
        <li className="list-item list-item-stacked">
          <span className="list-item-icon list-item-icon-primary" aria-hidden="true">
            <span className={`icon ${iconClass}`}></span>
          </span>
          <span className="list-item-body">
            <span className="list-item-title">{getGroupTitle(group)}</span>
            <span className="list-item-meta">{describeGroup(group)}</span>
          </span>
          <div className="button-row">
            <button className="button button-primary button-sm" type="button" onClick={onJoin}>
              Join back
            </button>
          </div>
        </li>
      </ul>
    </section>
  )
}
