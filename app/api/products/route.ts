import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/products - Get aggregated product quantities
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Aggregate all items from all orders
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        name,
        quantity,
        orders!inner (
          id
        )
      `)

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    // Aggregate quantities by product name
    const productMap = new Map<string, number>()
    data?.forEach(item => {
      const currentQuantity = productMap.get(item.name) || 0
      productMap.set(item.name, currentQuantity + item.quantity)
    })

    // Convert to array and sort by quantity
    const products = Array.from(productMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)

    return NextResponse.json(products)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

