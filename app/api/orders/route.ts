import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/orders - Fetch all orders with items
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Fetch orders with their items
    const { data: orders, error } = await supabase
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Transform the data to match frontend expectations
    const transformedOrders = orders?.map(order => ({
      id: order.order_number,
      dbId: order.id,
      customerName: order.customer_name,
      items: order.items?.map((item: { id: string; name: string; quantity: number; is_delivered?: boolean }) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        isDelivered: item.is_delivered ?? false,
      })) || [],
      status: order.status,
      estimatedArrival: order.estimated_arrival,
      arrivedAt: order.arrived_at ? new Date(order.arrived_at).getTime() : undefined,
      waitTime: order.wait_time,
      deliveryType: order.delivery_type,
      address: order.address,
      totalAmount: Number(order.total_amount) || 0,
      amountPaid: Number(order.amount_paid) || 0,
    }))

    return NextResponse.json(transformedOrders)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { customerName, items, estimatedArrival, deliveryType, address, totalAmount, amountPaid } = body

    // Validate required fields
    if (!customerName || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer name and at least one item are required' },
        { status: 400 }
      )
    }

    if (deliveryType === 'delivery' && !address) {
      return NextResponse.json(
        { error: 'Address is required for delivery orders' },
        { status: 400 }
      )
    }

    // Create the order - build insert object dynamically
    const insertData: Record<string, unknown> = {
      customer_name: customerName,
      estimated_arrival: estimatedArrival || null,
      delivery_type: deliveryType,
      address: deliveryType === 'delivery' ? address : null,
      status: 'pending',
    }

    // Add payment fields if provided (requires migration 003)
    if (totalAmount !== undefined) insertData.total_amount = totalAmount || 0
    if (amountPaid !== undefined) insertData.amount_paid = amountPaid || 0

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(insertData)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Create order items
    const orderItems = items.map((item: { name: string; quantity: number }) => ({
      order_id: order.id,
      name: item.name,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      // Rollback: delete the order if items failed
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      )
    }

    // Fetch the complete order with items
    const { data: completeOrder } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          id,
          name,
          quantity
        )
      `)
      .eq('id', order.id)
      .single()

    const transformedOrder = {
      id: completeOrder?.order_number,
      dbId: completeOrder?.id,
      customerName: completeOrder?.customer_name,
      items: completeOrder?.items || [],
      status: completeOrder?.status,
      estimatedArrival: completeOrder?.estimated_arrival,
      arrivedAt: completeOrder?.arrived_at ? new Date(completeOrder.arrived_at).getTime() : undefined,
      waitTime: completeOrder?.wait_time,
      deliveryType: completeOrder?.delivery_type,
      address: completeOrder?.address,
      totalAmount: Number(completeOrder?.total_amount) || 0,
      amountPaid: Number(completeOrder?.amount_paid) || 0,
    }

    return NextResponse.json(transformedOrder, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

