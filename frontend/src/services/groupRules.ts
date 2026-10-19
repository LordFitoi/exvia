import type { RouteGroup } from '@/types/routeGroup'

/** The server's limit of riders in a group, the author included (`MAX_GROUP_PARTICIPANTS`). */
export const MAX_GROUP_RIDERS = 10

/** How many riders the author can invite: everyone but themselves. */
export const MAX_INVITEES = MAX_GROUP_RIDERS - 1

const FREE_MODE_LABEL = 'Free mode'

/** What a group rides: its route's name, or "Free mode" when it has none. */
export const getGroupTitle = (group: RouteGroup): string => group.route?.name ?? FREE_MODE_LABEL

/** "Led by ana · 3 riders": the riders are the ones who accepted, the author included. */
export const describeGroup = (group: RouteGroup): string => {
  const riderCount = group.participants.filter(({ status }) => status === 'accepted').length
  return `Led by ${group.author.username} · ${riderCount} ${riderCount === 1 ? 'rider' : 'riders'}`
}
