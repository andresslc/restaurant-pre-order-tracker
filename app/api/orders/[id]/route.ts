import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type OrderItem = {
  id: string
  name: string
  quantity: number
  is_delivered?: boolean
}

type OrderRow = {
  id: string
  order_number: string
  customer_name: string
  status: string
  estimated_arrival: string | null
  arrived_at: string | null
  wait_time: number | null
  delivery_type: string
  address: string | null
  total_amount: number
  amount_paid: number
  items?: OrderItem[]
}

type OrderUpdate = Database['public']['Tables']['orders']['Update']

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
          quantity,
          is_delivered
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

    const orderData = order as OrderRow

    const transformedOrder = {
      id: orderData.order_number,
      dbId: orderData.id,
      customerName: orderData.customer_name,
      items: orderData.items || [],
      status: orderData.status,
      estimatedArrival: orderData.estimated_arrival,
      arrivedAt: orderData.arrived_at ? new Date(orderData.arrived_at).getTime() : undefined,
      waitTime: orderData.wait_time,
      deliveryType: orderData.delivery_type,
      address: orderData.address,
      totalAmount: Number(orderData.total_amount) || 0,
      amountPaid: Number(orderData.amount_paid) || 0,
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

    const existingOrderData = existingOrder as { id: string; order_number: string }

    // Build update object using the proper Database types
    const updateData: OrderUpdate = {}
    
    if (body.customerName !== undefined) updateData.customer_name = body.customerName
    if (body.estimatedArrival !== undefined) updateData.estimated_arrival = body.estimatedArrival
    if (body.status !== undefined) updateData.status = body.status as any
    if (body.deliveryType !== undefined) updateData.delivery_type = body.deliveryType as any
    if (body.address !== undefined) updateData.address = body.address
    if (body.arrivedAt !== undefined) updateData.arrived_at = new Date(body.arrivedAt).toISOString()
    if (body.waitTime !== undefined) updateData.wait_time = body.waitTime
    if (body.totalAmount !== undefined) updateData.total_amount = body.totalAmount
    if (body.amountPaid !== undefined) updateData.amount_paid = body.amountPaid

    // Update the order
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', existingOrderData.id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    // Update items if provided
    if (body.items !== undefined && Array.isArray(body.items)) {
      // Delete all existing items for this order
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', existingOrderData.id)

      if (deleteItemsError) {
        console.error('Error deleting order items:', deleteItemsError)
        return NextResponse.json(
          { error: 'Failed to update order items' },
          { status: 500 }
        )
      }

      // Insert new items
      if (body.items.length > 0) {
        const itemsToInsert = body.items.map((item: { name: string; quantity: number }) => ({
          order_id: existingOrderData.id,
          name: item.name,
          quantity: item.quantity,
        }))

        const { error: insertItemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert)

        if (insertItemsError) {
          console.error('Error inserting order items:', insertItemsError)
          return NextResponse.json(
            { error: 'Failed to update order items' },
            { status: 500 }
          )
        }
      }
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
      .eq('id', existingOrderData.id)
      .single()

    const updatedOrderData = updatedOrder as OrderRow | null

    const transformedOrder = {
      id: updatedOrderData?.order_number,
      dbId: updatedOrderData?.id,
      customerName: updatedOrderData?.customer_name,
      items: updatedOrderData?.items || [],
      status: updatedOrderData?.status,
      estimatedArrival: updatedOrderData?.estimated_arrival,
      arrivedAt: updatedOrderData?.arrived_at ? new Date(updatedOrderData.arrived_at).getTime() : undefined,
      waitTime: updatedOrderData?.wait_time,
      deliveryType: updatedOrderData?.delivery_type,
      address: updatedOrderData?.address,
      totalAmount: Number(updatedOrderData?.total_amount) || 0,
      amountPaid: Number(updatedOrderData?.amount_paid) || 0,
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

    const existingOrderData = existingOrder as { id: string }

    // Delete will cascade to order_items due to ON DELETE CASCADE
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', existingOrderData.id)

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

