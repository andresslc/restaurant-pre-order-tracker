import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/orders/[id] - Fetch a single order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()

    // Check if it's a UUID format or order number
    const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    
    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          id,
          name,
          quantity
        )
      `)
    
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('order_number', id)
    }

    const { data: order, error } = await query.single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const transformedOrder = {
      id: order.order_number,
      dbId: order.id,
      customerName: order.customer_name,
      items: order.items || [],
      status: order.status,
      estimatedArrival: order.estimated_arrival,
      arrivedAt: order.arrived_at ? new Date(order.arrived_at).getTime() : undefined,
      waitTime: order.wait_time,
      deliveryType: order.delivery_type,
      address: order.address,
      totalAmount: Number(order.total_amount) || 0,
      amountPaid: Number(order.amount_paid) || 0,
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

// PATCH /api/orders/[id] - Update an order
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    // Find the order first (by UUID or order_number)
    const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    
    let query = supabase
      .from('orders')
      .select('id, order_number')
    
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

    // Build update object
    const updateData: Record<string, unknown> = {}
    
    if (body.customerName !== undefined) updateData.customer_name = body.customerName
    if (body.estimatedArrival !== undefined) updateData.estimated_arrival = body.estimatedArrival
    if (body.status !== undefined) updateData.status = body.status
    if (body.deliveryType !== undefined) updateData.delivery_type = body.deliveryType
    if (body.address !== undefined) updateData.address = body.address
    if (body.arrivedAt !== undefined) updateData.arrived_at = new Date(body.arrivedAt).toISOString()
    if (body.waitTime !== undefined) updateData.wait_time = body.waitTime
    if (body.totalAmount !== undefined) updateData.total_amount = body.totalAmount
    if (body.amountPaid !== undefined) updateData.amount_paid = body.amountPaid

    // Update the order
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', existingOrder.id)

    if (updateError) {
      console.error('Error updating order:', updateError)
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

// DELETE /api/orders/[id] - Delete an order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServerSupabaseClient()

    // Find the order first
    const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    
    let query = supabase
      .from('orders')
      .select('id')
    
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

    // Delete will cascade to order_items due to ON DELETE CASCADE
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', existingOrder.id)

    if (deleteError) {
      console.error('Error deleting order:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete order' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

