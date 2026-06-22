import { supabase, type Lead } from './supabase'
import { formatCZK } from './format'

export const AGENT_NAME = 'Petra Zábranská'

// --- Šablony e-mailů (tabulka email_sablony) ---

export interface Template {
  id: string
  name: string
  subject: string
  body: string
  created_at: string
  updated_at: string
}

export async function fetchTemplates(): Promise<Template[]> {
  const { data, error } = await supabase.from('email_sablony').select('*').order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Template[]
}

export async function saveTemplate(
  t: Pick<Template, 'name' | 'subject' | 'body'> & { id?: string }
): Promise<void> {
  if (t.id) {
    const { error } = await supabase
      .from('email_sablony')
      .update({ name: t.name, subject: t.subject, body: t.body, updated_at: new Date().toISOString() })
      .eq('id', t.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('email_sablony')
      .insert({ name: t.name, subject: t.subject, body: t.body })
    if (error) throw new Error(error.message)
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('email_sablony').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Prolinkovací pole {{...}} ---

/** Nahradí pole jako {{jmeno}}, {{lokalita}}, {{cena}}, {{makler}} hodnotami z leadu. */
export function mergeFields(text: string, lead: Lead): string {
  const cena =
    lead.price != null
      ? formatCZK(Number(lead.price))
      : lead.price_estimate != null
        ? formatCZK(Number(lead.price_estimate))
        : ''
  const map: Record<string, string> = {
    jmeno: lead.name ?? '',
    krestni: (lead.name ?? '').split(' ')[0] ?? '',
    lokalita: lead.location ?? '',
    cena,
    email: lead.email ?? '',
    telefon: lead.phone ?? '',
    makler: AGENT_NAME
  }
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => map[key.toLowerCase()] ?? `{{${key}}}`)
}

/** Seznam dostupných polí pro nápovědu v editoru šablon. */
export const MERGE_FIELDS = [
  { token: '{{jmeno}}', label: 'Celé jméno' },
  { token: '{{krestni}}', label: 'Křestní jméno' },
  { token: '{{lokalita}}', label: 'Lokalita' },
  { token: '{{cena}}', label: 'Cena / rozpočet' },
  { token: '{{telefon}}', label: 'Telefon' },
  { token: '{{makler}}', label: 'Jméno makléře' }
]

// --- Odeslání e-mailu přes Edge Function (Resend) ---

export interface SendResult {
  ok: boolean
  error?: string
}

export async function sendEmail(args: {
  to: string
  subject: string
  body: string
}): Promise<SendResult> {
  const html = args.body
    .split('\n')
    .map((line) => (line.length ? escapeHtml(line) : '<br/>'))
    .join('<br/>\n')

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to: args.to, subject: args.subject, text: args.body, html }
  })

  if (error) {
    // Edge Function vrací chybu (např. chybějící RESEND_API_KEY) v těle.
    const ctx = (error as { context?: { error?: string } }).context
    return { ok: false, error: ctx?.error || error.message }
  }
  if (data && (data as { error?: string }).error) {
    return { ok: false, error: (data as { error: string }).error }
  }
  return { ok: true }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
