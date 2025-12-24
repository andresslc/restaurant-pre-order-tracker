import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/stats - Get order statistics
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, delivery_type, wait_time')

    if (error) {
      console.error('Error fetching stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      )
    }

    const stats = {
      total_orders: orders?.length || 0,
      pending_orders: orders?.filter(o => o.status === 'pending').length || 0,
      arrived_orders: orders?.filter(o => o.status === 'arrived').length || 0,
      delivered_orders: orders?.filter(o => o.status === 'delivered').length || 0,
      delivery_orders: orders?.filter(o => o.delivery_type === 'delivery').length || 0,
      onsite_orders: orders?.filter(o => o.delivery_type === 'on-site').length || 0,
      avg_wait_time: (() => {
        const waitTimes = orders?.filter(o => o.wait_time !== null).map(o => o.wait_time!) || []
        return waitTimes.length > 0 
          ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
          : null
      })()
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

