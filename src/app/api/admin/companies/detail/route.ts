// src/app/api/admin/companies/detail/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/adminAuth'
import { bqQuery, PROJECT, DS_APP } from '@/lib/bigquery'

const D = `${PROJECT}.${DS_APP}`

const T_CO = `${D}.main_db_cln_company_lists`
const T_PROS = `${D}.main_db_cln_professionals`
const T_WE = `${D}.main_db_cln_professionals_work_experiences`
const T_MR = `${D}.main_db_cln_professionals_manual_retrievals`
const T_PI = `${D}.main_db_cln_professionals_profile_images`
const T_SL = `${D}.main_db_cln_professionals_social_links`
const T_FUNDING = `${D}.main_db_cln_funding_investment_lists`
const T_FUND_CAT = `${D}.main_db_cln_static_company_funding_rounds`
const T_CMR = `${D}.main_db_cln_company_manual_retrievals`
const T_REVENUE = `${D}.main_db_cln_company_revenue_details`
const T_PRODUCTS = `${D}.main_db_cln_company_products`
const T_SOCIAL = `${D}.main_db_cln_company_social_links`
const T_STAGING = `${D}.Companies_Analyst_AGENT`
const T_FOLLOWERS = `${D}.main_db_cln_company_followers`
const T_SUB_ADM = `${D}.main_db_cln_sub_admins`
const T_ADMINS = `${D}.main_db_cln_admins`
const T_COUNTRIES = `${D}.main_db_cln_static_countries`
const T_BIZ_MDL = `${D}.main_db_cln_static_company_business_models`
const T_EXCHANGE_BODIES = `${D}.main_db_cln_exchange_bodies`
const T_REG_TYPES = `${D}.main_db_cln_company_regulatory_types`
const T_FAQ = `${D}.main_db_cln_company_faq_lists`
const T_EVENTS = `${D}.main_db_cln_events`
const T_EVT_SPD = `${D}.main_db_cln_event_sponsor_partner_details`


const D_MKT = `${PROJECT}.qd_cp_mongodb_markets`
const T_COMPANY_PRODUCTS = `${D_MKT}.main_db_cln_company_products`
const T_TOKENS = `${D_MKT}.main_db_cln_markets_tokens`
const T_TOKENS_MANUAL = `${D_MKT}.main_db_cln_markets_search_contract_addresses`
const T_CHAINS = `${D_MKT}.main_db_cln_chains`
const T_CHAINS_MANUAL = `${D_MKT}.main_db_cln_chains_manuals`
const T_EXCHANGES = `${D_MKT}.main_db_cln_exchanges`
const T_EXCHANGES_MANUAL = `${D_MKT}.main_db_cln_exchanges_manuals`

function safeRows<T>(result: PromiseSettledResult<T[]>, label = ''): T[] {
  if (result.status === 'rejected') {
    console.error(`[detail] query failed${label ? ' (' + label + ')' : ''}:`, result.reason?.message || result.reason)
  }
  return result.status === 'fulfilled' ? result.value : []
}

export async function GET(req: NextRequest) {
  if (!await verifyAdminRequest(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const company_id = (searchParams.get('company_id') || '').trim()
  if (!company_id)
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })

  const t0 = Date.now()
  const cid = company_id.replace(/'/g, "''")

  // ── 1. Main company record ────────────────────────────────────
  const coRows = await bqQuery<Record<string, string>>(`
    SELECT
      CAST(co._id AS STRING)                              AS company_id,
      JSON_VALUE(co.data, '$.company_name')               AS company_name,
      JSON_VALUE(co.data, '$.company_id')                 AS company_url,
      JSON_VALUE(co.data, '$.website_link')               AS website,
      CASE
        WHEN JSON_VALUE(co.data, '$.company_logo') IS NOT NULL AND JSON_VALUE(co.data, '$.company_logo') != ''
        THEN CONCAT('https://image.coinpedia.org/app_uploads/company_logo/', JSON_VALUE(co.data, '$.company_logo'))
        ELSE NULL
      END                                                  AS profile_image,
      JSON_VALUE(bm.data, '$.business_name')              AS primary_category,
      (
        SELECT STRING_AGG(JSON_VALUE(bm2.data, '$.business_name'), ', ')
        FROM \`${T_BIZ_MDL}\` bm2
        WHERE CAST(JSON_VALUE(bm2.data, '$._id') AS STRING)
          IN UNNEST(JSON_VALUE_ARRAY(co.data, '$.business_model_id'))
          AND JSON_VALUE(bm2.data, '$._id') != JSON_VALUE(co.data, '$.main_business_model_id')
      ) AS secondary_categories,
      JSON_VALUE(co.data, '$.about_company')              AS company_description,
      JSON_VALUE(co.data, '$.describe_in_one_line')       AS tagline,
      SAFE_CAST(JSON_VALUE(co.data, '$.created_date_n_time."$date"')  AS INT64) AS created_at_ms,
      SAFE_CAST(JSON_VALUE(co.data, '$.updated_date_n_time."$date"')  AS INT64) AS updated_at_ms,
      SAFE_CAST(JSON_VALUE(co.data, '$.established_in."$date"')       AS INT64) AS launch_date_ms,
      JSON_VALUE(co.data, '$.contact_number')             AS contact_number,
      JSON_VALUE(co.data, '$.company_email_id')           AS email,
      JSON_VALUE(co.data, '$.company_location')           AS location,
      JSON_VALUE(ct.data, '$.country_name')               AS country,
      JSON_VALUE(co.data, '$.city')                       AS city,
      JSON_VALUE(co.data, '$.state')                      AS state,
      JSON_VALUE(co.data, '$.headquarter')                AS address,
      JSON_VALUE(co.data, '$.latitude')                   AS latitude,
      JSON_VALUE(co.data, '$.longitude')                  AS longitude,
      JSON_VALUE(co.data, '$.nft_wallet_address')         AS nft_wallet_address,
      JSON_VALUE(co.data, '$.stock_symbol')               AS stock_symbol,
      JSON_VALUE(co.data, '$.cmc_id')                     AS cmc_id,
      JSON_VALUE(co.data, '$.coingecko_id')               AS coingecko_id,
      JSON_VALUE(co.data, '$.company_size_row_id')        AS company_size,
      JSON_VALUE(co.data, '$.company_valuation')          AS valuation,
      JSON_VALUE(co.data, '$.claim_status')               AS claim_status,
      JSON_VALUE(co.data, '$.approval_status')            AS approval_status,
      JSON_VALUE(co.data, '$.active_status')              AS active_status,
      CAST(JSON_VALUE(co.data, '$.view_counts')   AS INT64) AS view_count,
      CAST(JSON_VALUE(co.data, '$.profile_score') AS INT64) AS profile_score,
      -- IMPLEMENTED CREATED BY LOGIC
      CASE 
        WHEN JSON_VALUE(co.data, '$.claim_status') != '0' THEN
          CASE 
            WHEN JSON_VALUE(sa.data, '$.full_name') IS NOT NULL THEN CONCAT(JSON_VALUE(sa.data, '$.full_name'), ' (Sub Admin)')
            WHEN JSON_VALUE(pro_c.data, '$.full_name') IS NOT NULL THEN CONCAT(JSON_VALUE(pro_c.data, '$.full_name'), ' (User)')
            ELSE 'Admin'
          END
        ELSE 
          CASE 
            WHEN JSON_VALUE(pro_c.data, '$.full_name') IS NOT NULL THEN CONCAT(JSON_VALUE(pro_c.data, '$.full_name'), ' (User)')
            ELSE '-'
          END
      END AS created_by_name,

      -- IMPLEMENTED UPDATED BY LOGIC
      CASE 
        WHEN JSON_VALUE(co.data, '$.updated_by') = 'subadmin' THEN CONCAT(JSON_VALUE(sa_up.data, '$.full_name'), ' (Sub Admin)')
        WHEN JSON_VALUE(co.data, '$.updated_by') = 'user' THEN CONCAT(COALESCE(JSON_VALUE(sa_up.data, '$.full_name'), 'User'), ' (User)')
        WHEN JSON_VALUE(co.data, '$.updated_by') = 'admin' THEN 'Admin'
        ELSE JSON_VALUE(sa_up.data, '$.full_name')
      END AS updated_by_name,
      JSON_VALUE(co.data, '$.created_by_type')            AS created_by_type,
      CASE
        WHEN JSON_VALUE(co.data, '$.created_by_type') = '1' THEN JSON_VALUE(pro_c.data, '$.full_name')
        WHEN JSON_VALUE(co.data, '$.created_by_type') = '2' THEN JSON_VALUE(adm.data, '$.full_name')
        ELSE JSON_VALUE(sa.data, '$.full_name')
      END AS created_by_name,
      CASE
        WHEN JSON_VALUE(co.data, '$.created_by_type') = '1' THEN JSON_VALUE(pro_c.data, '$.email_id')
        WHEN JSON_VALUE(co.data, '$.created_by_type') = '2' THEN JSON_VALUE(adm.data, '$.email_id')
        ELSE JSON_VALUE(sa.data, '$.email_id')
      END AS created_by_email,
      JSON_VALUE(co.data, '$.updated_by')                 AS updated_by_role,
      JSON_VALUE(sa_up.data, '$.full_name')               AS updated_by_name,
      CAST(JSON_VALUE(co.data, '$.basic_details_score')  AS INT64) AS score_basic,
      CAST(JSON_VALUE(co.data, '$.seo_details_score')    AS INT64) AS score_seo,
      CAST(JSON_VALUE(co.data, '$.social_media_score')   AS INT64) AS score_social,
      CAST(JSON_VALUE(co.data, '$.team_detail_score')    AS INT64) AS score_team,
      CAST(JSON_VALUE(co.data, '$.owned_product_score')  AS INT64) AS score_products,
      CAST(JSON_VALUE(co.data, '$.funding_score')        AS INT64) AS score_funding,
      CAST(JSON_VALUE(co.data, '$.investment_score')     AS INT64) AS score_investments,
      CAST(JSON_VALUE(co.data, '$.revenue_score_score')  AS INT64) AS score_revenue,
      CAST(JSON_VALUE(co.data, '$.faq_score')            AS INT64) AS score_faq,
      CAST(JSON_VALUE(co.data, '$.holding_crypto_score') AS INT64) AS score_holdings,
      CAST(JSON_VALUE(co.data, '$.job_opening_score')    AS INT64) AS score_jobs
    FROM \`${T_CO}\` co
    LEFT JOIN \`${T_COUNTRIES}\` ct     ON JSON_VALUE(ct.data, '$._id')     = JSON_VALUE(co.data, '$.country_id')
    LEFT JOIN \`${T_BIZ_MDL}\`   bm     ON JSON_VALUE(bm.data, '$._id')     = JSON_VALUE(co.data, '$.main_business_model_id')
    LEFT JOIN \`${T_SUB_ADM}\`   sa     ON JSON_VALUE(sa.data, '$._id')     = JSON_VALUE(co.data, '$.sub_admin_row_id')
    LEFT JOIN \`${T_SUB_ADM}\`   sa_up  ON JSON_VALUE(sa_up.data, '$._id')  = JSON_VALUE(co.data, '$.updated_by_row_id')
    LEFT JOIN \`${T_PROS}\`      pro_c  ON JSON_VALUE(pro_c.data, '$._id')  = JSON_VALUE(co.data, '$.user_row_id')
    LEFT JOIN \`${T_ADMINS}\`    adm    ON JSON_VALUE(adm.data, '$._id')    = JSON_VALUE(co.data, '$.created_admin_row_id')
    WHERE CAST(co._id AS STRING) = '${cid}'
    LIMIT 1
  `)

  if (!coRows.length)
    return NextResponse.json({ success: false, error: `Company not found: ${company_id}` }, { status: 404 })

  const co = coRows[0]

  // ── 2. All parallel queries ───────────────────────────────────
  const results = await Promise.allSettled([

    // 0 — Team
    bqQuery<Record<string, string>>(`
      SELECT
        JSON_VALUE(we.data, '$._id') AS member_id,
        JSON_VALUE(we.data, '$.user_row_id') AS user_row_id,
        JSON_VALUE(we.data, '$.user_account_type') AS user_account_type,
        COALESCE(NULLIF(JSON_VALUE(we.data, '$.responsibilities'),''), JSON_VALUE(we.data, '$.position')) AS role,
        JSON_VALUE(we.data, '$.designation_type') AS designation_type,
        JSON_VALUE(we.data, '$.till_date_status') AS till_date_status,
        CASE
          WHEN JSON_VALUE(we.data, '$.user_account_type') = '1' THEN JSON_VALUE(p.data, '$.full_name')
          WHEN JSON_VALUE(we.data, '$.user_account_type') = '2' THEN JSON_VALUE(mr.data, '$.full_name')
        END AS full_name,
        CASE
          WHEN JSON_VALUE(pi.data, '$.profile_image') IS NOT NULL
          THEN CONCAT('https://image.coinpedia.org/app_uploads/profile/', JSON_VALUE(pi.data, '$.profile_image'))
          ELSE NULL
        END AS profile_image,
        JSON_VALUE(sl.data, '$.linkedin') AS linkedin_url,
        JSON_VALUE(sl.data, '$.twitter') AS twitter_url,
        JSON_VALUE(sl.data, '$.instagram') AS instagram_url,
        JSON_VALUE(sl.data, '$.facebook') AS facebook_url,
        JSON_VALUE(sl.data, '$.youtube_channel') AS youtube_url,
        JSON_VALUE(sl.data, '$.telegram') AS telegram_url,
        JSON_VALUE(sl.data, '$.medium') AS medium_url,
        JSON_VALUE(sl.data, '$.video_link') AS video_link,
        COALESCE(JSON_VALUE(p.data, '$.user_name'), JSON_VALUE(p.data, '$.username')) AS pro_username
      FROM \`${T_WE}\` we
      LEFT JOIN \`${T_PROS}\` p
        ON JSON_VALUE(we.data, '$.user_account_type') = '1'
        AND JSON_VALUE(we.data, '$.user_row_id') = JSON_VALUE(p.data, '$._id')
      LEFT JOIN \`${T_MR}\` mr
        ON JSON_VALUE(we.data, '$.user_account_type') = '2'
        AND JSON_VALUE(we.data, '$.user_row_id') = JSON_VALUE(mr.data, '$._id')
      LEFT JOIN \`${T_PI}\` pi ON JSON_VALUE(we.data, '$.user_row_id') = JSON_VALUE(pi.data, '$.user_row_id')
      LEFT JOIN \`${T_SL}\` sl ON JSON_VALUE(we.data, '$.user_row_id') = JSON_VALUE(sl.data, '$.user_row_id')
      WHERE JSON_VALUE(we.data, '$.company_row_id') = '${cid}'
        AND JSON_VALUE(we.data, '$.verified_status') = 'true'
        AND JSON_VALUE(we.data, '$.public_view') = 'true'
        AND (
          JSON_VALUE(we.data, '$.user_account_type') = '2'
          OR (JSON_VALUE(we.data, '$.user_account_type') = '1' AND JSON_VALUE(p.data, '$.login_status') = '1')
        )
      ORDER BY
        CASE JSON_VALUE(we.data, '$.designation_type')
          WHEN '2' THEN 1
          WHEN '1' THEN 2
          ELSE 3 END,
        full_name
      LIMIT 100
`),

    // 1 — Funding rounds received
    bqQuery<Record<string, string>>(`
      SELECT
        SAFE.JSON_VALUE(fil.data,'$._id') AS round_id,
        SAFE.JSON_VALUE(fil.data,'$.amount') AS amount,
        SAFE.JSON_VALUE(cat.data,'$.category_name') AS funding_type,
        FORMAT_TIMESTAMP('%Y-%m-%d', COALESCE(
          TIMESTAMP_MILLIS(SAFE_CAST(SAFE.JSON_VALUE(fil.data,'$.announcement_date."$date"') AS INT64)),
          TIMESTAMP_MILLIS(SAFE_CAST(SAFE.JSON_VALUE(fil.data,'$.announcement_date') AS INT64))
        )) AS funding_date,
        CASE
          WHEN SAFE.JSON_VALUE(fil.data,'$.investor_type') = '1' AND SAFE.JSON_VALUE(fil.data,'$.investor_registered_type') = '2'
            THEN SAFE.JSON_VALUE(pmr.data,'$.full_name')
          WHEN SAFE.JSON_VALUE(fil.data,'$.investor_type') = '1'
            THEN SAFE.JSON_VALUE(p.data,'$.full_name')
          WHEN SAFE.JSON_VALUE(fil.data,'$.investor_type') = '2' AND SAFE.JSON_VALUE(fil.data,'$.investor_registered_type') = '2'
            THEN SAFE.JSON_VALUE(cmr.data,'$.company_name')
          WHEN SAFE.JSON_VALUE(fil.data,'$.investor_type') = '2'
            THEN SAFE.JSON_VALUE(cl.data,'$.company_name')
        END AS investor_name
      FROM \`${T_FUNDING}\` fil
      LEFT JOIN \`${T_FUND_CAT}\` cat ON SAFE.JSON_VALUE(cat.data,'$._id') = SAFE.JSON_VALUE(fil.data,'$.category_row_id')
      LEFT JOIN \`${T_PROS}\` p
        ON SAFE.JSON_VALUE(fil.data,'$.investor_type') = '1'
        AND IFNULL(SAFE.JSON_VALUE(fil.data,'$.investor_registered_type'),'1') != '2'
        AND SAFE.JSON_VALUE(fil.data,'$.investor_row_id') = SAFE.JSON_VALUE(p.data,'$._id')
      LEFT JOIN \`${T_MR}\` pmr
        ON SAFE.JSON_VALUE(fil.data,'$.investor_type') = '1'
        AND SAFE.JSON_VALUE(fil.data,'$.investor_registered_type') = '2'
        AND SAFE.JSON_VALUE(fil.data,'$.investor_row_id') = SAFE.JSON_VALUE(pmr.data,'$._id')
      LEFT JOIN \`${T_CO}\` cl
        ON SAFE.JSON_VALUE(fil.data,'$.investor_type') = '2'
        AND IFNULL(SAFE.JSON_VALUE(fil.data,'$.investor_registered_type'),'1') != '2'
        AND SAFE.JSON_VALUE(fil.data,'$.investor_row_id') = SAFE.JSON_VALUE(cl.data,'$._id')
      LEFT JOIN \`${T_CMR}\` cmr
        ON SAFE.JSON_VALUE(fil.data,'$.investor_type') = '2'
        AND SAFE.JSON_VALUE(fil.data,'$.investor_registered_type') = '2'
        AND SAFE.JSON_VALUE(fil.data,'$.investor_row_id') = SAFE.JSON_VALUE(cmr.data,'$._id')
      WHERE SAFE.JSON_VALUE(fil.data,'$.funds_raised_company_row_id') = '${cid}'
        AND SAFE.JSON_VALUE(fil.data,'$.verified_status') = '1'
      ORDER BY funding_date DESC
      LIMIT 50
`),

    // 2 — Products
    bqQuery<Record<string, string>>(`
      WITH company_products AS (
        SELECT
          JSON_VALUE(data, '$._id') AS product_id,
          JSON_VALUE(data, '$.company_row_id') AS company_id,
          JSON_VALUE(data, '$.product_type') AS product_type,
          JSON_VALUE(data, '$.product_row_id') AS ref_id
        FROM \`${T_COMPANY_PRODUCTS}\`
        WHERE JSON_VALUE(data, '$.company_row_id') = '${cid}'
      ),

      tokens AS (
        SELECT
          product_id,
          'token' AS type,
          COALESCE(
            JSON_VALUE(t.data, '$.token_name'),
            JSON_VALUE(tm.data, '$.token_name')
          ) AS name,
          COALESCE(
            JSON_VALUE(t.data, '$.symbol'),
            JSON_VALUE(tm.data, '$.symbol')
          ) AS symbol,
          COALESCE(
            JSON_VALUE(t.data, '$.network_name'),
            JSON_VALUE(tm.data, '$.network_name')
          ) AS network
        FROM company_products cp
        LEFT JOIN \`${T_TOKENS}\` t
          ON cp.ref_id = JSON_VALUE(t.data, '$._id')
        LEFT JOIN \`${T_TOKENS_MANUAL}\` tm
          ON cp.ref_id = JSON_VALUE(tm.data, '$._id')
        WHERE cp.product_type = '1'
      ),

      chains AS (
        SELECT
          product_id,
          'chain' AS type,
          COALESCE(
            JSON_VALUE(c.data, '$.chain_name'),
            JSON_VALUE(cm.data, '$.chain_name')
          ) AS name,
          COALESCE(
            JSON_VALUE(c.data, '$.chain_symbol'),
            JSON_VALUE(cm.data, '$.chain_symbol')
          ) AS symbol,
          NULL AS network
        FROM company_products cp
        LEFT JOIN \`${T_CHAINS}\` c
          ON cp.ref_id = JSON_VALUE(c.data, '$._id')
        LEFT JOIN \`${T_CHAINS_MANUAL}\` cm
          ON cp.ref_id = JSON_VALUE(cm.data, '$._id')
        WHERE cp.product_type = '2'
      ),

      exchanges AS (
        SELECT
          product_id,
          'exchange' AS type,
          COALESCE(
            JSON_VALUE(e.data, '$.exchange_name'),
            JSON_VALUE(em.data, '$.exchange_name')
          ) AS name,
          NULL AS symbol,
          COALESCE(
            JSON_VALUE(e.data, '$.exchange_link'),
            JSON_VALUE(em.data, '$.exchange_link')
          ) AS network
        FROM company_products cp
        LEFT JOIN \`${T_EXCHANGES}\` e
          ON cp.ref_id = JSON_VALUE(e.data, '$._id')
        LEFT JOIN \`${T_EXCHANGES_MANUAL}\` em
          ON cp.ref_id = JSON_VALUE(em.data, '$._id')
        WHERE cp.product_type = '3'
      )

      SELECT * FROM tokens
      UNION ALL
      SELECT * FROM chains
      UNION ALL
      SELECT * FROM exchanges
    `),

    // 3 — Social links
    bqQuery<Record<string, string>>(`
      SELECT
        JSON_VALUE(data, '$.twitter')         AS twitter_url,
        JSON_VALUE(data, '$.linkedin')        AS linkedin_url,
        JSON_VALUE(data, '$.facebook')        AS facebook_url,
        JSON_VALUE(data, '$.instagram')       AS instagram_url,
        JSON_VALUE(data, '$.telegram')        AS telegram_url,
        JSON_VALUE(data, '$.medium')          AS medium_url,
        JSON_VALUE(data, '$.reddit')          AS reddit_url,
        JSON_VALUE(data, '$.youtube_channel') AS youtube_url,
        JSON_VALUE(data, '$.video_link')      AS video_link,
        JSON_VALUE(data, '$.feed_url')      AS feed_url
      FROM \`${T_SOCIAL}\`
      WHERE JSON_VALUE(data, '$.company_row_id') = '${cid}'
      LIMIT 1
    `),

    // 4 — Enrichment history
    bqQuery<Record<string, string>>(`
      SELECT
        id, section, field_name, current_value, agent_value, final_value,
        TO_JSON_STRING(agent_data) AS agent_data,
        source_url, source_name, confidence, status,
        reviewed_by, review_notes, reviewed_at, created_at, run_id, agent_version
      FROM \`${T_STAGING}\`
      WHERE company_id = '${cid}'
      ORDER BY created_at DESC
      LIMIT 200
    `),

    // 5 — Revenue
    bqQuery<Record<string, string>>(`
      SELECT
        JSON_VALUE(data,'$._id')     AS revenue_id,
        JSON_VALUE(data,'$.year')    AS year,
        JSON_VALUE(data,'$.quarter') AS quarter,
        JSON_VALUE(data,'$.revenue') AS revenue
      FROM \`${T_REVENUE}\`
      WHERE JSON_VALUE(data,'$.company_row_id') = '${cid}'
      ORDER BY
        CAST(JSON_VALUE(data,'$.year')    AS INT64) DESC,
        CAST(JSON_VALUE(data,'$.quarter') AS INT64) ASC
      LIMIT 50
    `),

    // 6 — Followers count
    bqQuery<Record<string, string>>(`
      SELECT COUNT(*) AS followers_count
      FROM \`${T_FOLLOWERS}\`
      WHERE JSON_VALUE(data,'$.company_row_id') = '${cid}'
    `),

    // 7 — Investments made (this company as investor)
    bqQuery<Record<string, string>>(`
      SELECT
        SAFE.JSON_VALUE(fil.data,'$._id')                    AS round_id,
        SAFE.JSON_VALUE(fil.data,'$.amount')                  AS amount,
        SAFE.JSON_VALUE(cat.data,'$.category_name')           AS investment_round,
        SAFE.JSON_VALUE(fil.data,'$.investor_category')       AS investor_category,
        FORMAT_TIMESTAMP('%Y-%m-%d', COALESCE(
          TIMESTAMP_MILLIS(SAFE_CAST(SAFE.JSON_VALUE(fil.data,'$.announcement_date."$date"') AS INT64)),
          TIMESTAMP_MILLIS(SAFE_CAST(SAFE.JSON_VALUE(fil.data,'$.announcement_date') AS INT64))
        )) AS invested_on,
        CASE
          WHEN SAFE.JSON_VALUE(fil.data,'$.investor_registered_type') = '2'
            THEN SAFE.JSON_VALUE(cmr.data,'$.company_name')
          ELSE SAFE.JSON_VALUE(fc.data,'$.company_name')
        END AS funded_company_name,
        CASE
          WHEN SAFE.JSON_VALUE(fil.data,'$.investor_registered_type') = '2'
            THEN SAFE.JSON_VALUE(cmr.data,'$.company_id')
          ELSE SAFE.JSON_VALUE(fc.data,'$.company_id')
        END AS funded_company_url,
        CASE
          WHEN SAFE.JSON_VALUE(fil.data,'$.investor_registered_type') = '2'
            THEN CASE WHEN SAFE.JSON_VALUE(cmr.data,'$.company_logo') IS NOT NULL AND SAFE.JSON_VALUE(cmr.data,'$.company_logo') != ''
              THEN CONCAT('https://image.coinpedia.org/app_uploads/profile/', SAFE.JSON_VALUE(cmr.data,'$.company_logo'))
              ELSE NULL END
          ELSE CASE WHEN SAFE.JSON_VALUE(fc.data,'$.company_logo') IS NOT NULL AND SAFE.JSON_VALUE(fc.data,'$.company_logo') != ''
            THEN CONCAT('https://image.coinpedia.org/app_uploads/profile/', SAFE.JSON_VALUE(fc.data,'$.company_logo'))
            ELSE NULL END
        END AS funded_company_logo
      FROM \`${T_FUNDING}\` fil
      LEFT JOIN \`${T_FUND_CAT}\` cat
        ON SAFE.JSON_VALUE(cat.data,'$._id') = SAFE.JSON_VALUE(fil.data,'$.category_row_id')
      LEFT JOIN \`${T_CO}\` fc
        ON SAFE.JSON_VALUE(fil.data,'$.investor_type') = '2'
        AND IFNULL(SAFE.JSON_VALUE(fil.data,'$.investor_registered_type'),'1') != '2'
        AND SAFE.JSON_VALUE(fil.data,'$.funds_raised_company_row_id') = SAFE.JSON_VALUE(fc.data,'$._id')
      LEFT JOIN \`${T_CMR}\` cmr
        ON SAFE.JSON_VALUE(fil.data,'$.investor_type') = '2'
        AND SAFE.JSON_VALUE(fil.data,'$.investor_registered_type') = '2'
        AND SAFE.JSON_VALUE(fil.data,'$.funds_raised_company_row_id') = SAFE.JSON_VALUE(cmr.data,'$._id')
      WHERE SAFE.JSON_VALUE(fil.data,'$.investor_row_id') = '${cid}'
        AND SAFE.JSON_VALUE(fil.data,'$.investor_type') = '2'
        AND SAFE.JSON_VALUE(fil.data,'$.verified_status') = '1'
      ORDER BY invested_on DESC
      LIMIT 50
    `),

    // 8 — Regulatory details
    bqQuery<Record<string, string>>(`
      SELECT
        JSON_VALUE(reg_item, '$.country_id')            AS country_id,
        JSON_VALUE(ct.data,  '$.country_name')          AS country_name,
        JSON_VALUE(reg_item, '$.regulatory_bodies_ids') AS regulatory_body_id,
        JSON_VALUE(body.data,'$.regulatory_bodies_name') AS regulatory_body_name,
        JSON_VALUE(reg_item, '$.regulatory_types_id')   AS regulatory_type_id,
        JSON_VALUE(rtype.data,'$.regulator_type_name')  AS regulatory_type_name
      FROM \`${T_CO}\` co
      LEFT JOIN UNNEST(JSON_QUERY_ARRAY(co.data, '$.regularities_details')) AS reg_item
      LEFT JOIN \`${T_COUNTRIES}\` ct
        ON JSON_VALUE(ct.data, '$._id') = JSON_VALUE(reg_item, '$.country_id')
      LEFT JOIN \`${T_EXCHANGE_BODIES}\` body
        ON JSON_VALUE(body.data, '$._id') = JSON_VALUE(reg_item, '$.regulatory_bodies_ids')
      LEFT JOIN \`${T_REG_TYPES}\` rtype
        ON JSON_VALUE(rtype.data, '$._id') = JSON_VALUE(reg_item, '$.regulatory_types_id')
      WHERE JSON_VALUE(co.data, '$._id') = '${cid}'
    `),

    // 9 — FAQs
    bqQuery<Record<string, string>>(`
      SELECT
        JSON_VALUE(data, '$._id')            AS faq_id,
        JSON_VALUE(data, '$.faq_question')   AS question,
        JSON_VALUE(data, '$.faq_answer')     AS answer
      FROM \`${T_FAQ}\`
      WHERE JSON_VALUE(data, '$.company_row_id') = '${cid}'
      ORDER BY CAST(JSON_VALUE(data, '$._id') AS INT64) ASC
      LIMIT 50
    `),

    // 10 — Sponsored Events
    bqQuery<Record<string, string>>(`
      SELECT
        JSON_VALUE(e.data, '$._id')                       AS event_id,
        JSON_VALUE(e.data, '$.event_title')                AS event_name,
        JSON_VALUE(e.data, '$.event_url')                 AS event_url,
        JSON_VALUE(e.data, '$.event_description')         AS event_description,
        JSON_VALUE(e.data, '$.event_image')          AS event_logo,
        JSON_VALUE(e.data, '$.event_city')                AS event_location,
        JSON_VALUE(e.data, '$.event_type')                AS event_type,
        SAFE_CAST(JSON_VALUE(e.data, '$.start_date."$date"') AS INT64) AS start_date_ms,
        SAFE_CAST(JSON_VALUE(e.data, '$.end_date."$date"')   AS INT64) AS end_date_ms,
        JSON_VALUE(spd.data, '$.sponsor_partner_type')    AS sponsor_type
      FROM \`${T_EVT_SPD}\` spd
      INNER JOIN \`${T_EVENTS}\` e
        ON JSON_VALUE(spd.data, '$.event_row_id') = JSON_VALUE(e.data, '$._id')
      WHERE JSON_VALUE(spd.data, '$.account_type') = '2'
        AND JSON_VALUE(spd.data, '$.user_company_row_id') = '${cid}'
        AND JSON_VALUE(spd.data, '$.registered_type') = '1'
        AND JSON_VALUE(spd.data, '$.sponsor_partner_type') = '1'
        AND JSON_VALUE(e.data, '$.active_status') IN ('1', 'true')
        AND JSON_VALUE(e.data, '$.approval_status') IN ('1', 'true')
      ORDER BY start_date_ms DESC
      LIMIT 50
    `),

    // 11 — Partner Events (sponsor_partner_type = 2)
    bqQuery<Record<string, string>>(`
      SELECT
        JSON_VALUE(e.data, '$._id')                       AS event_id,
        JSON_VALUE(e.data, '$.event_title')                AS event_name,
        JSON_VALUE(e.data, '$.event_url')                 AS event_url,
        JSON_VALUE(e.data, '$.event_description')         AS event_description,
        JSON_VALUE(e.data, '$.event_image')          AS event_logo,
        JSON_VALUE(e.data, '$.event_city')                AS event_location,
        JSON_VALUE(e.data, '$.event_type')                AS event_type,
        SAFE_CAST(JSON_VALUE(e.data, '$.start_date."$date"') AS INT64) AS start_date_ms,
        SAFE_CAST(JSON_VALUE(e.data, '$.end_date."$date"')   AS INT64) AS end_date_ms,
        JSON_VALUE(spd.data, '$.sponsor_partner_type')    AS sponsor_type
      FROM \`${T_EVT_SPD}\` spd
      INNER JOIN \`${T_EVENTS}\` e
        ON JSON_VALUE(spd.data, '$.event_row_id') = JSON_VALUE(e.data, '$._id')
      WHERE JSON_VALUE(spd.data, '$.account_type') = '2'
        AND JSON_VALUE(spd.data, '$.user_company_row_id') = '${cid}'
        AND JSON_VALUE(spd.data, '$.registered_type') = '1'
        AND JSON_VALUE(spd.data, '$.sponsor_partner_type') = '2'
        AND JSON_VALUE(e.data, '$.active_status') IN ('1', 'true')
        AND JSON_VALUE(e.data, '$.approval_status') IN ('1', 'true')
      ORDER BY start_date_ms DESC
      LIMIT 50
    `),

    // 12 — Hosted Events (company as host, list_event_type 2 or 3)
    bqQuery<Record<string, string>>(`
      SELECT
        CAST(ev._id AS STRING)                                        AS event_id,
        JSON_VALUE(ev.data, '$.event_title')                          AS event_name,
        JSON_VALUE(ev.data, '$.event_url')                            AS event_url,
        CASE
          WHEN JSON_VALUE(ev.data, '$.event_image') IS NOT NULL
            AND JSON_VALUE(ev.data, '$.event_image') != ''
          THEN JSON_VALUE(ev.data, '$.event_image')
          ELSE NULL
        END                                                            AS event_logo,
        JSON_VALUE(ev.data, '$.event_city')                           AS event_location,
        JSON_VALUE(ev.data, '$.event_state')                          AS event_state,
        JSON_VALUE(ev.data, '$.event_venue')                          AS event_venue,
        JSON_VALUE(ev.data, '$.event_description')                    AS event_description,
        JSON_VALUE(ev.data, '$.event_link')                           AS event_type,
        SAFE_CAST(JSON_VALUE(ev.data, '$.start_date."$date"') AS INT64) AS start_date_ms,
        SAFE_CAST(JSON_VALUE(ev.data, '$.end_date."$date"')   AS INT64) AS end_date_ms,
        CAST(JSON_VALUE(ev.data, '$.view_counts') AS INT64)           AS view_count,
        JSON_VALUE(ev.data, '$.event_link')                           AS external_link
      FROM \`${T_EVENTS}\` ev
      WHERE JSON_VALUE(ev.data, '$.active_status')   = '1'
        AND JSON_VALUE(ev.data, '$.approval_status') = '1'
        AND JSON_VALUE(ev.data, '$.company_row_id')  = '${cid}'
        AND JSON_VALUE(ev.data, '$.list_event_type') IN ('2', '3')
      ORDER BY start_date_ms DESC
      LIMIT 50
    `),
    // 13 — Holdings (tokens/chains/exchanges, registered + manual)
    bqQuery<Record<string, string>>(`
      WITH company_products AS (
        SELECT
          JSON_VALUE(data, '$._id') AS product_id,
          JSON_VALUE(data, '$.company_row_id') AS company_id,
          JSON_VALUE(data, '$.product_type') AS product_type,
          JSON_VALUE(data, '$.product_row_id') AS ref_id
        FROM \`${T_COMPANY_PRODUCTS}\`
        WHERE JSON_VALUE(data, '$.company_row_id') = '${cid}'
      ),

      tokens AS (
        SELECT
          product_id,
          'token' AS type,
          COALESCE(
            JSON_VALUE(t.data, '$.token_name'),
            JSON_VALUE(tm.data, '$.token_name')
          ) AS name,
          COALESCE(
            JSON_VALUE(t.data, '$.symbol'),
            JSON_VALUE(tm.data, '$.symbol')
          ) AS symbol,
          COALESCE(
            JSON_VALUE(t.data, '$.network_name'),
            JSON_VALUE(tm.data, '$.network_name')
          ) AS network
        FROM company_products cp
        LEFT JOIN \`${T_TOKENS}\` t
          ON cp.ref_id = JSON_VALUE(t.data, '$._id')
        LEFT JOIN \`${T_TOKENS_MANUAL}\` tm
          ON cp.ref_id = JSON_VALUE(tm.data, '$._id')
        WHERE cp.product_type = '1'
      ),

      chains AS (
        SELECT
          product_id,
          'chain' AS type,
          COALESCE(
            JSON_VALUE(c.data, '$.chain_name'),
            JSON_VALUE(cm.data, '$.chain_name')
          ) AS name,
          COALESCE(
            JSON_VALUE(c.data, '$.chain_symbol'),
            JSON_VALUE(cm.data, '$.chain_symbol')
          ) AS symbol,
          NULL AS network
        FROM company_products cp
        LEFT JOIN \`${T_CHAINS}\` c
          ON cp.ref_id = JSON_VALUE(c.data, '$._id')
        LEFT JOIN \`${T_CHAINS_MANUAL}\` cm
          ON cp.ref_id = JSON_VALUE(cm.data, '$._id')
        WHERE cp.product_type = '2'
      ),

      exchanges AS (
        SELECT
          product_id,
          'exchange' AS type,
          COALESCE(
            JSON_VALUE(e.data, '$.exchange_name'),
            JSON_VALUE(em.data, '$.exchange_name')
          ) AS name,
          NULL AS symbol,
          COALESCE(
            JSON_VALUE(e.data, '$.exchange_link'),
            JSON_VALUE(em.data, '$.exchange_link')
          ) AS network
        FROM company_products cp
        LEFT JOIN \`${T_EXCHANGES}\` e
          ON cp.ref_id = JSON_VALUE(e.data, '$._id')
        LEFT JOIN \`${T_EXCHANGES_MANUAL}\` em
          ON cp.ref_id = JSON_VALUE(em.data, '$._id')
        WHERE cp.product_type = '3'
      )

      SELECT * FROM tokens
      UNION ALL
      SELECT * FROM chains
      UNION ALL
      SELECT * FROM exchanges
    `)
  ])

  const teamRows = safeRows(results[0])
  const fundRows = safeRows(results[1])
  const productRows = safeRows(results[2])
  const socialRows = safeRows(results[3])
  const enrichRows = safeRows(results[4])
  const revenueRows = safeRows(results[5])
  const followersRows = safeRows(results[6])
  const investRows = safeRows(results[7])
  const regulatoryRows = safeRows(results[8])
  const faqRows = safeRows(results[9])
  const eventRows = safeRows(results[10], 'events')
  const partnerEventRows = safeRows(results[11], 'partner_events')
  const hostedEventRows = safeRows(results[12], 'hosted_events')
  const holdingsRows = safeRows(results[13], 'holdings')
  const social = socialRows[0] || {}

  // Group enrichment by run_id
  const runMap: Record<string, {
    run_id: string; created_at: string; agent_version: string
    rows: Record<string, string>[]
  }> = {}
  for (const r of enrichRows) {
    const rid = r.run_id || 'unknown'
    if (!runMap[rid]) runMap[rid] = { run_id: rid, created_at: r.created_at, agent_version: r.agent_version, rows: [] }
    runMap[rid].rows.push(r)
  }
  const enrichHistory = Object.values(runMap).sort((a, b) => b.created_at > a.created_at ? 1 : -1)

  const totalRaised = fundRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

  const sizeMap: Record<string, string> = {
    '1': '1-10', '2': '11-50', '3': '51-200',
    '4': '201-500', '5': '501-1,000', '6': '1,000+',
  }

  return NextResponse.json({
    success: true,
    company_id,
    duration: `${((Date.now() - t0) / 1000).toFixed(2)}s`,

    company: {
      company_id: co.company_id,
      company_name: co.company_name,
      company_url: co.company_url || null,
      website: co.website || null,
      profile_image: co.profile_image || null,
      live_url: `https://coinpedia.org/company/${co.company_url || ''}/`,
      primary_category: co.primary_category || null,
      secondary_categories: co.secondary_categories || null,
      company_description: co.company_description
        ? co.company_description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        : null,
      tagline: co.tagline || null,
      launch_date: co.launch_date_ms ? new Date(parseInt(co.launch_date_ms)).toISOString().substring(0, 10) : null,
      created_at: co.created_at_ms ? new Date(parseInt(co.created_at_ms)).toISOString().substring(0, 10) : null,
      updated_at: co.updated_at_ms ? new Date(parseInt(co.updated_at_ms)).toISOString().substring(0, 10) : null,
      created_by: {
        name: co.created_by_name || null,
        email: co.created_by_email || null,
        type: co.created_by_type === '1' ? 'professional'
          : co.created_by_type === '2' ? 'admin'
            : 'sub_admin',
      },
      location: co.location || null,
      city: co.city?.trim() || null,
      state: co.state?.trim() || null,
      address: co.address?.trim() || null,
      latitude: co.latitude?.trim() ? parseFloat(co.latitude) : null,
      longitude: co.longitude?.trim() ? parseFloat(co.longitude) : null,
      registration_country: co.country || null,
      company_size: sizeMap[co.company_size] || co.company_size || null,
      email: co.email?.trim() || null,
      valuation: co.valuation ? parseFloat(co.valuation) : null,
      valuation_fmt: co.valuation ? (
        parseFloat(co.valuation) >= 1e9 ? `$${(parseFloat(co.valuation) / 1e9).toFixed(1)}B`
          : parseFloat(co.valuation) >= 1e6 ? `$${(parseFloat(co.valuation) / 1e6).toFixed(1)}M`
            : `$${Number(co.valuation).toLocaleString()}`
      ) : null,
      profile_score: Number(co.profile_score) || 0,
      view_count: Number(co.view_count) || 0,
      followers_count: followersRows.length ? parseInt(followersRows[0].followers_count) : 0,
      claim_status: co.claim_status === '1' || co.claim_status === 'true',
      approval_status: co.approval_status === '1' || co.approval_status === 'true',
      active_status: co.active_status === '1' ? 'Active' : 'Inactive',
      stock_symbol: co.stock_symbol || null,
      cmc_id: co.cmc_id || null,
      coingecko_id: co.coingecko_id || null,
      nft_wallet_address: co.nft_wallet_address || null,
      contact_number: co.contact_number?.trim() || null,
      updated_by: co.updated_by_name || null,
      score_breakdown: {
        total: Number(co.profile_score) || 0,
        basic: Number(co.score_basic) || 0,
        seo: Number(co.score_seo) || 0,
        social: Number(co.score_social) || 0,
        team: Number(co.score_team) || 0,
        products: Number(co.score_products) || 0,
        funding: Number(co.score_funding) || 0,
        investments: Number(co.score_investments) || 0,
        revenue: Number(co.score_revenue) || 0,
        faq: Number(co.score_faq) || 0,
        holdings: Number(co.score_holdings) || 0,
        jobs: Number(co.score_jobs) || 0,
      },
    },

    team: teamRows.map(m => ({
      member_id: m.member_id,
      full_name: m.full_name || '—',
      role: m.role || '—',
      member_type: m.designation_type === '2' ? 'board' : 'team',
      profile_image: m.profile_image || null,
      linkedin_url: m.linkedin_url || null,
      twitter_url: m.twitter_url || null,
      instagram_url: m.instagram_url || null,
      facebook_url: m.facebook_url || null,
      youtube_url: m.youtube_url || null,
      telegram_url: m.telegram_url || null,
      medium_url: m.medium_url || null,
      video_link: m.video_link || null,
      profile_url: m.user_account_type === '1' && m.pro_username
        ? `https://app.coinpedia.org/${m.pro_username}/`
        : null,
    })),

    funding: {
      rounds: fundRows.map(r => ({
        round_id: r.round_id,
        funding_type: r.funding_type || '—',
        amount: r.amount,
        investor_name: r.investor_name || '—',
        funding_date: r.funding_date || '—',
      })),
      total_raised: totalRaised,
      round_count: fundRows.length,
    },

    investments: investRows.map(r => ({
      round_id: r.round_id,
      funded_company_name: r.funded_company_name || '—',
      funded_company_url: r.funded_company_url || null,
      funded_company_logo: r.funded_company_logo || null,
      investment_round: r.investment_round || '—',
      investor_category: r.investor_category || '—',
      amount: r.amount || null,
      invested_on: r.invested_on || '—',
    })),

    products: {
      tokens,
      chains,
      exchanges,
    },

    social,

    revenue: revenueRows.map(r => {
      const qMap: Record<string, string> = { '1': 'Q1', '2': 'Q2', '3': 'Q3', '4': 'Q4', '5': 'Annually' }
      const rev = parseFloat(r.revenue) || 0
      return {
        year: r.year,
        quarter: qMap[r.quarter] || r.quarter,
        revenue: rev,
        revenue_fmt: rev >= 1e9 ? `$${(rev / 1e9).toFixed(1)}B`
          : rev >= 1e6 ? `$${(rev / 1e6).toFixed(0)}M`
            : rev > 0 ? `$${Math.round(rev).toLocaleString()}`
              : '—',
      }
    }),

    events: eventRows.map(r => ({
      event_id: String(r.event_id),
      event_name: r.event_name || '—',
      event_url: r.event_url || null,
      event_description: r.event_description || null,
      event_logo: r.event_logo
        ? `https://image.coinpedia.org/app_uploads/events/${r.event_logo}`
        : null,
      event_location: r.event_location || null,
      event_type: r.event_type || null,
      start_date: r.start_date_ms ? new Date(parseInt(r.start_date_ms)).toISOString().substring(0, 10) : null,
      end_date: r.end_date_ms ? new Date(parseInt(r.end_date_ms)).toISOString().substring(0, 10) : null,
      sponsor_type: r.sponsor_type || null,
    })),

    partner_events: partnerEventRows.map(r => ({
      event_id: r.event_id || '—',
      event_name: r.event_name || '—',
      event_url: r.event_url || null,
      event_description: r.event_description || null,
      event_logo: r.event_logo
        ? `https://image.coinpedia.org/app_uploads/events/${r.event_logo}`
        : null,
      event_location: r.event_location || null,
      event_type: r.event_type || null,
      start_date: r.start_date_ms ? new Date(parseInt(r.start_date_ms)).toISOString().substring(0, 10) : null,
      end_date: r.end_date_ms ? new Date(parseInt(r.end_date_ms)).toISOString().substring(0, 10) : null,
    })),

    hosted_events: hostedEventRows.map(r => ({
      event_id: r.event_id || '—',
      event_name: r.event_name || '—',
      event_url: r.event_url || null,
      event_description: r.event_description || null,
      event_logo: r.event_logo
        ? `https://image.coinpedia.org/app_uploads/events/${r.event_logo}`
        : null,
      event_location: r.event_location || null,
      event_state: r.event_state || null,
      event_venue: r.event_venue || null,
      external_link: r.external_link || null,
      view_count: r.view_count ? parseInt(r.view_count) : 0,
      start_date: r.start_date_ms ? new Date(parseInt(r.start_date_ms)).toISOString().substring(0, 10) : null,
      end_date: r.end_date_ms ? new Date(parseInt(r.end_date_ms)).toISOString().substring(0, 10) : null,
    })),

    holdings: productRows.map(r => {
      const typeMap: Record<string, string> = { '1': 'Token', '2': 'Chain', '3': 'Exchange' }
      const regMap: Record<string, string> = { '1': 'Registered', '2': 'Manual' }
      return {
        entry_id: r.entry_id,
        product_type: typeMap[r.product_type] || r.product_type,
        register_type: regMap[r.register_type] || r.register_type,
        product_name: r.product_name || '—',
        product_logo: r.product_logo || null,
        product_slug: r.product_slug || null,
      }
    }),

    enrichment: {
      history: enrichHistory,
      total_rows: enrichRows.length,
      pending_count: enrichRows.filter(r => r.status === 'pending').length,
      approved_count: enrichRows.filter(r => r.status === 'approved').length,
      merged_count: enrichRows.filter(r => r.status === 'merged').length,
      rejected_count: enrichRows.filter(r => r.status === 'rejected').length,
    },
    regulatory: regulatoryRows.map(r => ({
      country_id: r.country_id,
      country_name: r.country_name || null,
      regulatory_body_id: r.regulatory_body_id,
      regulatory_body_name: r.regulatory_body_name || null,
      regulatory_type_id: r.regulatory_type_id,
      regulatory_type_name: r.regulatory_type_name || null,
    })),

    faq: faqRows.map(f => ({
      faq_id: f.faq_id,
      question: f.question || '—',
      answer: f.answer || '—',
    })),
  })
}