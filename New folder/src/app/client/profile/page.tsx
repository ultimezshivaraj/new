// src/app/client/profile/page.tsx
import { redirect }   from 'next/navigation'
import { getSession } from '@/lib/session'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import ClientProfileClient from '@/components/client/ClientProfileClient'

export const metadata = { title: 'My Profile — Client Portal' }

const T = `${PROJECT}.${TEAM_DATASET}`

export default async function ClientProfilePage() {
  const session = await getSession('client')
  if (!session) redirect('/client/login')

  const clientId = session.id

  const [profileRows, statsRows] = await Promise.allSettled([

    // Client profile details
    bqQuery<Record<string, string>>(`
      SELECT
        CAST(id AS STRING)                                    AS client_id,
        COALESCE(client_name, '')                             AS client_name,
        COALESCE(username, '')                                AS username,
        COALESCE(email_id, '')                                AS email_id,
        COALESCE(mobile_number, '')                           AS mobile_number,
        COALESCE(company_name, '')                            AS company_name,
        COALESCE(address, '')                                 AS address,
        COALESCE(CAST(login_status AS STRING), '0')           AS login_status,
        COALESCE(CAST(date_n_time AS STRING), '')             AS created_at,
        COALESCE(profile_image, '')                           AS profile_image
      FROM \`${T}.newultimez_team_tbl_clients\`
      WHERE id = ${clientId}
      LIMIT 1
    `),

    // Project stats for this client
    bqQuery<Record<string, string>>(`
      SELECT
        CAST(COUNT(*) AS STRING)                                    AS total_projects,
        CAST(COUNTIF(status = 1) AS STRING)                        AS active_projects,
        CAST(COUNTIF(status = 3) AS STRING)                        AS completed_projects,
        CAST(COUNTIF(status = 0) AS STRING)                        AS pending_projects
      FROM \`${T}.newultimez_team_tbl_clients_projects\`
      WHERE client_row_id = ${clientId}
    `),
  ])

  const profile = profileRows.status === 'fulfilled' ? (profileRows.value[0] ?? {}) : {}
  const stats   = statsRows.status   === 'fulfilled' ? (statsRows.value[0]   ?? {}) : {}

  return (
    <ClientProfileClient
      session={session}
      profile={profile as Record<string, string>}
      stats={stats as Record<string, string>}
    />
  )
}
