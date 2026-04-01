import { NextRequest, NextResponse } from 'next/server'
import { authenticateEmployee } from '@/lib/bigquery'
import { createSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { loginId, password } = await req.json()

    if (!loginId || !password) {
      return NextResponse.json({ error: 'Email/username and password are required' }, { status: 400 })
    }

    const employee = await authenticateEmployee(loginId.trim(), password)

    if (!employee) {
      return NextResponse.json(
        { error: 'Invalid credentials or account is disabled' },
        { status: 401 }
      )
    }

    // Create JWT session
    await createSession({
      id:     employee.id,
      name:   employee.full_name,
      email:  employee.email_id,
      panel:  'employee',
      roles:  employee.create_type_row_id,
    })

    // Return safe employee data (no password)
    return NextResponse.json({
      success: true,
      employee: {
        id:                    employee.id,
        full_name:             employee.full_name,
        username:              employee.username,
        email_id:              employee.email_id,
        position:              employee.position,
        location:              employee.location,
        profile_image:         employee.profile_image,
        create_type_row_id:    employee.create_type_row_id,
        employee_type:         employee.employee_type,
        employee_category_type:employee.employee_category_type,
        ultimez_join_date:     employee.ultimez_join_date,
        mobile_number:         employee.mobile_number,
      },
    })
  } catch (err) {
    console.error('[employee login]', err)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
