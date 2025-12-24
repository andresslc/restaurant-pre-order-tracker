import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// POST /api/orders/[id]/payment - Add payment to order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()
    const body = await request.json()
    const { amount } = body

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      )
    }

    // Check if it's a UUID format or order number
    const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    
    let query = supabase
      .from('orders')
      .select('id, total_amount, amount_paid')
    
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

    // Calculate new amount paid
    const currentPaid = Number(existingOrder.amount_paid) || 0
    const newAmountPaid = currentPaid + amount

    const { error: updateError } = await supabase
      .from('orders')
      .update({ amount_paid: newAmountPaid })
      .eq('id', existingOrder.id)

    if (updateError) {
      console.error('Error adding payment:', updateError)
      return NextResponse.json(
        { error: 'Failed to add payment' },
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
