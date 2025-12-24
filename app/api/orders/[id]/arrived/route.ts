import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// POST /api/orders/[id]/arrived - Mark order as arrived
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()

    // Find the order first (try by order_number first, then by UUID)
    let query = supabase
      .from('orders')
      .select('id, status')
    
    // Check if it's a UUID format or order number
    const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('order_number', id)
    }
    
    const { data: existingOrder, error: findError } = await query.single()

    if (findError || !existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (existingOrder.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order is not in pending status' },
        { status: 400 }
      )
    }

    // Update order status to arrived
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'arrived',
        arrived_at: new Date().toISOString()
      })
      .eq('id', existingOrder.id)

    if (updateError) {
      console.error('Error marking order as arrived:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    // Fetch updated order with items
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          id,
          name,
          quantity
        )
      `)
      .eq('id', existingOrder.id)
      .single()

    const transformedOrder = {
      id: updatedOrder?.order_number,
      dbId: updatedOrder?.id,
      customerName: updatedOrder?.customer_name,
      items: updatedOrder?.items || [],
      status: updatedOrder?.status,
      estimatedArrival: updatedOrder?.estimated_arrival,
      arrivedAt: updatedOrder?.arrived_at ? new Date(updatedOrder.arrived_at).getTime() : undefined,
      waitTime: updatedOrder?.wait_time,
      deliveryType: updatedOrder?.delivery_type,
      address: updatedOrder?.address,
      totalAmount: Number(updatedOrder?.total_amount) || 0,
      amountPaid: Number(updatedOrder?.amount_paid) || 0,
    }

    return NextResponse.json(transformedOrder)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

