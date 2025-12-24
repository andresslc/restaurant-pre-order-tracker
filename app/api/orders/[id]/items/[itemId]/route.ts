import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// PATCH /api/orders/[id]/items/[itemId] - Update item delivery status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { isDelivered } = body

    if (typeof isDelivered !== 'boolean') {
      return NextResponse.json(
        { error: 'isDelivered must be a boolean' },
        { status: 400 }
      )
    }

    // Find the order first
    const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    
    let orderQuery = supabase
      .from('orders')
      .select('id')
    
    if (isUUID) {
      orderQuery = orderQuery.eq('id', id)
    } else {
      orderQuery = orderQuery.eq('order_number', id)
    }
    
    const { data: order, error: orderError } = await orderQuery.single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Update the item
    const { error: updateError } = await supabase
      .from('order_items')
      .update({ is_delivered: isDelivered })
      .eq('id', itemId)
      .eq('order_id', order.id)

    if (updateError) {
      console.error('Error updating item:', updateError)
      return NextResponse.json(
        { error: 'Failed to update item' },
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
          quantity,
          is_delivered
        )
      `)
      .eq('id', order.id)
      .single()

    const transformedOrder = {
      id: updatedOrder?.order_number,
      dbId: updatedOrder?.id,
      customerName: updatedOrder?.customer_name,
      items: updatedOrder?.items?.map((item: { id: string; name: string; quantity: number; is_delivered: boolean }) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        isDelivered: item.is_delivered ?? false,
      })) || [],
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

