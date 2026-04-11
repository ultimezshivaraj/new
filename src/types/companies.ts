// src/types/companies.ts

export interface CompanyRow {
  company_id: string
  company_name: string
  company_url: string | null
  website: string | null
  profile_image: string | null
  category: string | null
  location: string | null
  profile_score: number
  view_count: number
  missing_fields: string[]
  missing_count: number
  enrichment_priority: number
  enrichment_status: 'not_run' | 'pending' | 'approved' | 'merged' | 'staged'
  last_run_at: string | null
  pending_count: number
  approved_count: number
  merged_count: number
  live_url: string
}

export interface CompaniesListResponse {
  success: boolean
  page: number
  limit: number
  total: number
  pages: number
  search: string | null
  sort: string
  companies: CompanyRow[]
  duration: string
}

// ── Company Detail ────────────────────────────────────────────
export interface ScoreBreakdown {
  total: number
  basic: number
  seo: number
  social: number
  team: number
  products: number
  funding: number
  investments: number
  revenue: number
  faq: number
  holdings: number
  jobs: number
}

export interface CompanyDetail {
  company_id: string
  company_name: string
  company_url: string | null
  website: string | null
  profile_image: string | null
  live_url: string
  primary_category: string | null
  secondary_categories: string | null
  company_description: string | null
  tagline: string | null
  founder_name: string | null
  launch_date: string | null
  created_at: string | null
  updated_at: string | null
  created_by: { name: string | null; email: string | null; type: string }
  updated_by: string | null
  location: string | null
  city: string | null
  state: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  registration_country: string | null
  company_size: string | null
  email: string | null
  contact_number: string | null
  valuation: number | null
  valuation_fmt: string | null
  nft_wallet_address: string | null
  profile_score: number
  view_count: number
  followers_count: number
  claim_status: boolean
  approval_status: boolean
  active_status: string
  stock_symbol: string | null
  cmc_id: string | null
  coingecko_id: string | null
  score_breakdown: ScoreBreakdown
}

export interface TeamMember {
  member_id: string
  full_name: string
  role: string
  member_type: 'Board' | 'Team' | string
  profile_image: string | null
  profile_url: string | null
  linkedin_url: string | null
  twitter_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  youtube_url: string | null
  telegram_url: string | null
  medium_url: string | null
  video_link: string | null
}

export interface FundingRound {
  round_id: string
  funding_type: string
  amount: string | null
  investor_name: string
  investor_type: string
  funding_date: string
}

export interface FundingSummary {
  rounds: FundingRound[]
  total_raised: number
  round_count: number
}

export interface Investment {
  round_id: string
  funded_company_name: string
  funded_company_url: string | null
  funded_company_logo: string | null
  investment_round: string
  investor_category: string
  amount: string | null
  invested_on: string
}

export interface Product {
  product_id: string
  product_name: string
  product_description: string | null
  product_url: string | null
  product_category: string | null
}

export interface SocialLinks {
  twitter_url: string | null
  linkedin_url: string | null
  feed_url: string | null
  telegram_url: string | null
  reddit_url: string | null
  youtube_url: string | null
  medium_url: string | null
  instagram_url: string | null
}

export interface RegulatoryEntry {
  country_id: string | null
  country_name: string | null
  regulatory_body_id: string | null
  regulatory_body_name: string | null
  regulatory_type_id: string | null
  regulatory_type_name: string | null
}

export interface FaqItem {
  faq_id: string
  question: string | null
  answer: string | null
}

export interface RevenueRecord {
  year: string
  quarter: string
  revenue: number
  revenue_fmt: string
}

export interface SponsoredEvent {
  event_id: string
  event_name: string
  event_url: string | null
  event_description: string | null
  event_logo: string | null
  event_location: string | null
  event_type: string | null
  start_date: string | null
  end_date: string | null
  sponsor_type: string | null
}

export interface HostedEvent {
  event_id: string
  event_name: string
  event_url: string | null
  event_description: string | null
  event_logo: string | null
  event_location: string | null
  event_state: string | null
  event_venue: string | null
  external_link: string | null
  view_count: number
  start_date: string | null
  end_date: string | null
}

export interface CompanyProduct {
  product_id: string
  type: 'token' | 'chain' | 'exchange'
  name: string
  symbol?: string | null
  network?: string | null
}

export interface EnrichmentRow {
  id: string
  section: string
  field_name: string
  current_value: string | null
  agent_value: string | null
  final_value: string | null
  agent_data: Record<string, unknown> | null
  source_url: string | null
  source_name: string | null
  confidence: number
  status: 'pending' | 'approved' | 'rejected' | 'edited' | 'merged'
  reviewed_by: string | null
  review_notes: string | null
  reviewed_at: string | null
  created_at: string
  run_id: string
  agent_version: string
}

export interface EnrichmentRun {
  run_id: string
  created_at: string
  agent_version: string
  rows: EnrichmentRow[]
}

export interface EnrichmentSummary {
  history: EnrichmentRun[]
  total_rows: number
  pending_count: number
  approved_count: number
  merged_count: number
  rejected_count: number
}

export interface CompanyDetailResponse {
  success: boolean
  company_id: string
  duration: string
  company: CompanyDetail
  team: TeamMember[]
  funding: FundingSummary
  products: Product[]
  social: SocialLinks
  regulatory: RegulatoryEntry[]
  investments: Investment[]
  revenue: RevenueRecord[]
  faq: FaqItem[]
  events: SponsoredEvent[]
  partner_events: SponsoredEvent[]
  hosted_events: HostedEvent[]
  tokens: CompanyProduct[]
  chains: CompanyProduct[]
  exchanges: CompanyProduct[]
  enrichment: EnrichmentSummary
}



// ── Queue ─────────────────────────────────────────────────────
export interface QueueSummary {
  total_rows: number
  pending: number
  approved: number
  rejected: number
  edited: number
  merged: number
  companies_count: number
  total_runs: number
  avg_confidence: number
  last_run_at: string | null
  sections: Record<string, number>
}

export interface QueueCompanySummary {
  company_id: string
  company_name: string
  company_url: string | null
  profile_url: string
  total_rows: number
  pending: number
  approved: number
  rejected: number
  edited: number
  merged: number
  sections_enriched: number
  avg_confidence: number
  last_enriched_at: string | null
}

export interface QueueResponse {
  success: boolean
  duration: string
  summary: QueueSummary
  section_stats: Record<string, { total: number; pending: number }>
  companies: QueueCompanySummary[]
  grouped_rows: Record<string, unknown>
  rows: EnrichmentRow[]
}

// ── Agent Run ─────────────────────────────────────────────────
export interface AgentRunRequest {
  company_id: string
  sections: string[]
  dry_run?: boolean
}

export interface AgentRunResponse {
  success: boolean
  run_id?: string
  company_id?: string
  company_name?: string
  sections_run?: string[]
  rows_staged?: number
  content_chars?: number
  dry_run?: boolean
  duration?: string
  message?: string
  error?: string
}

// ── Review ────────────────────────────────────────────────────
export type ReviewAction = 'approve' | 'reject' | 'edit' | 'bulk_approve' | 'bulk_reject' | 'reset'

export interface ReviewRequest {
  action: ReviewAction
  id?: string
  ids?: string[]
  company_id?: string
  section?: string
  reviewed_by?: string
  final_value?: string
  review_notes?: string
}

export interface ReviewResponse {
  success: boolean
  action: string
  rows_updated: number
  reviewed_by: string
  duration: string
  error?: string
}
