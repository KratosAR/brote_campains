import { Campaign, Contact, ContactId } from '@bcp/domain'
import { IContactRepository, IGroupRepository } from '@bcp/contracts'

export interface ResolvedContact {
  contactId: string
  address: string
  contact: Contact
}

// ponytail: sin paginación real, carga todo de una con un limit grande.
// Upgrade path: si una audiencia supera este limit, iterar páginas hasta agotar el total.
const LARGE_PAGE = { page: 1, limit: 10000 }

export async function resolve(
  campaign: Campaign,
  workspaceId: string,
  contactRepository: IContactRepository,
  _groupRepository: IGroupRepository,
): Promise<ResolvedContact[]> {
  const contacts = await loadCandidates(campaign, workspaceId, contactRepository, _groupRepository)
  return contacts.reduce<ResolvedContact[]>((acc, contact) => {
    if (contact.isOptedOut()) return acc
    const channel = contact.channels.find((c) => c.type === campaign.channel)
    if (!channel) return acc
    acc.push({ contactId: contact.contactId.toString(), address: channel.value, contact })
    return acc
  }, [])
}

// ponytail: _groupRepository sin usar — findByGroup ya vive en IContactRepository. Se mantiene
// el parámetro por firma pública estable, para el día que resolver grupos necesite IGroupRepository.
async function loadCandidates(
  campaign: Campaign,
  workspaceId: string,
  contactRepository: IContactRepository,
  _groupRepository: IGroupRepository,
): Promise<Contact[]> {
  const audience = campaign.audience

  if (audience.type === 'all') {
    const page = await contactRepository.search(workspaceId, {}, LARGE_PAGE)
    return page.items
  }

  if (audience.type === 'group') {
    const pages = await Promise.all(
      (audience.groupIds ?? []).map((groupId) => contactRepository.findByGroup(groupId, workspaceId, LARGE_PAGE)),
    )
    return pages.flatMap((p) => p.items)
  }

  if (audience.type === 'manual') {
    const results = await Promise.all(
      (audience.contactIds ?? []).map((id) => contactRepository.findById(ContactId.from(id), workspaceId)),
    )
    return results.filter((r) => r.isOk()).map((r) => r.getValue())
  }

  // ponytail: segment audience no implementado, CampaignAudience tampoco lo soporta todavía
  return []
}
