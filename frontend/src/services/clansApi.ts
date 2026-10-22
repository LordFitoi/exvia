import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isClan, isClanDetail, isClanInvitation, isClanNotice } from '@/services/clanGuards'
import type { Clan, ClanDetail, ClanInvitation, ClanNotice, NewClan, NewClanNotice } from '@/types/clan'

const CLANS_PATH = '/api/clans/'
const FEED_PATH = `${CLANS_PATH}notices/`
const INVITATIONS_PATH = `${CLANS_PATH}invitations/`
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

const unexpectedResponse = (): ApiError => new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)

const readList = <TItem>(payload: unknown, isItem: (value: unknown) => value is TItem): TItem[] => {
  if (!Array.isArray(payload) || !payload.every(isItem)) throw unexpectedResponse()
  return payload
}

/** The clans the caller belongs to, newest first. */
export const fetchMyClans = async (): Promise<Clan[]> =>
  readList(await requestJsonAuthorized(CLANS_PATH), isClan)

/** Creates a clan owned by the caller, who becomes its first member. */
export const createClan = async (clan: NewClan): Promise<Clan> => {
  const created = await requestJsonAuthorized(CLANS_PATH, { method: 'POST', body: clan })
  if (!isClan(created)) throw unexpectedResponse()
  return created
}

/** One of the caller's clans, with its members. */
export const fetchClan = async (id: number): Promise<ClanDetail> => {
  const clan = await requestJsonAuthorized(`${CLANS_PATH}${id}/`)
  if (!isClanDetail(clan)) throw unexpectedResponse()
  return clan
}

/** The notices of one clan, newest first. */
export const fetchClanNotices = async (clanId: number): Promise<ClanNotice[]> =>
  readList(await requestJsonAuthorized(`${CLANS_PATH}${clanId}/notices/`), isClanNotice)

/** Posts a notice to a clan the caller belongs to. */
export const createClanNotice = async (clanId: number, notice: NewClanNotice): Promise<ClanNotice> => {
  const created = await requestJsonAuthorized(`${CLANS_PATH}${clanId}/notices/`, {
    method: 'POST',
    body: notice,
  })
  if (!isClanNotice(created)) throw unexpectedResponse()
  return created
}

/** Changes the text and the attached route of a notice the caller posted. */
export const updateClanNotice = async (
  clanId: number,
  noticeId: number,
  notice: NewClanNotice,
): Promise<ClanNotice> => {
  const updated = await requestJsonAuthorized(`${CLANS_PATH}${clanId}/notices/${noticeId}/`, {
    method: 'PATCH',
    body: notice,
  })
  if (!isClanNotice(updated)) throw unexpectedResponse()
  return updated
}

/** The latest notices of every clan the caller belongs to, newest first. */
export const fetchFeedNotices = async (): Promise<ClanNotice[]> =>
  readList(await requestJsonAuthorized(FEED_PATH), isClanNotice)

/** Invites a user, by username, to a clan the caller belongs to. */
export const inviteToClan = async (clanId: number, username: string): Promise<void> => {
  await requestJsonAuthorized(`${CLANS_PATH}${clanId}/invitations/`, { method: 'POST', body: { username } })
}

/** The invitations waiting for the caller's answer, newest first. */
export const fetchMyInvitations = async (): Promise<ClanInvitation[]> =>
  readList(await requestJsonAuthorized(INVITATIONS_PATH), isClanInvitation)

/** Joins the clan of an invitation. */
export const acceptInvitation = async (id: number): Promise<void> => {
  await requestJsonAuthorized(`${INVITATIONS_PATH}${id}/accept/`, { method: 'POST' })
}

/** Turns an invitation down. */
export const declineInvitation = async (id: number): Promise<void> => {
  await requestJsonAuthorized(`${INVITATIONS_PATH}${id}/`, { method: 'DELETE' })
}
