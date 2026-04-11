import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { bqQuery, PROJECT, TEAM_DATASET } from '@/lib/bigquery'
import ClientDashboardClient from '@/components/client/ClientDashboardClient'

export const metadata = { title: 'My Projects — Ultimez Client Portal' }

export default async function ClientDashboardPage() {
  const session = await getSession('client')
  if (!session) redirect('/client/login')

  const clientId = session.id

  // Projects + tasks + notifications in parallel
  const [projectsRes, notificationsRes, tasksRes] = await Promise.allSettled([

    bqQuery<Record<string,unknown>>(`
      SELECT
        CAST(id AS STRING)            AS id,
        COALESCE(project_name, '')    AS project_name,
        COALESCE(project_description,'') AS project_description,
        COALESCE(CAST(status AS STRING),'0') AS status,
        COALESCE(CAST(project_type AS STRING),'') AS project_type,
        COALESCE(CAST(start_date AS STRING),'') AS start_date,
        COALESCE(CAST(end_date AS STRING),'')   AS end_date,
        COALESCE(CAST(date_n_time AS STRING),'') AS date_n_time,
        COALESCE(CAST(priority AS STRING),'0')   AS priority
      FROM \`${PROJECT}.${TEAM_DATASET}.newultimez_team_tbl_clients_projects\`
      WHERE client_row_id = ${clientId}
      ORDER BY date_n_time DESC
      LIMIT 20
    `),

    bqQuery<Record<string,unknown>>(`
      SELECT
        CAST(id AS STRING)                  AS id,
        COALESCE(message, '')               AS message,
        COALESCE(CAST(is_read AS STRING),'0') AS is_read,
        COALESCE(CAST(date_n_time AS STRING),'') AS date_n_time,
        COALESCE(CAST(notification_type AS STRING),'') AS notification_type
      FROM \`${PROJECT}.${TEAM_DATASET}.newultimez_team_tbl_clients_notifications_messages\`
      WHERE client_row_id = ${clientId}
      ORDER BY date_n_time DESC
      LIMIT 20
    `),

    bqQuery<Record<string,unknown>>(`
      SELECT
        CAST(t.id AS STRING)                AS id,
        COALESCE(t.task_title,'')           AS task_title,
        COALESCE(CAST(t.status AS STRING),'0') AS status,
        COALESCE(CAST(t.priority AS STRING),'0') AS priority,
        COALESCE(CAST(t.due_date AS STRING),'')  AS due_date,
        COALESCE(p.project_name,'')         AS project_name,
        CAST(p.id AS STRING)                AS project_id
      FROM \`${PROJECT}.${TEAM_DATASET}.newultimez_team_tbl_clients_projects_assign_tasks\` t
      JOIN \`${PROJECT}.${TEAM_DATASET}.newultimez_team_tbl_clients_projects\` p
        ON p.id = t.project_row_id
      WHERE p.client_row_id = ${clientId}
      ORDER BY t.date_n_time DESC
      LIMIT 30
    `),
  ])

  return (
    <ClientDashboardClient
      session={session}
      projects={projectsRes.status === 'fulfilled' ? projectsRes.value : []}
      notifications={notificationsRes.status === 'fulfilled' ? notificationsRes.value : []}
      tasks={tasksRes.status === 'fulfilled' ? tasksRes.value : []}
    />
  )
}
