"use client"

import { useOrders } from "@/lib/orders-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Loader2, AlertCircle } from "lucide-react"
import { useMemo } from "react"

export default function ProductsPage() {
  const { orders, isLoading, error } = useOrders()

  // Aggregate all items from all orders
  const aggregatedProducts = useMemo(() => {
    const productMap = new Map<string, number>()

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const currentQuantity = productMap.get(item.name) || 0
        productMap.set(item.name, currentQuantity + item.quantity)
      })
    })

    // Convert to array and sort by quantity (descending)
    return Array.from(productMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
  }, [orders])

  const totalItems = aggregatedProducts.reduce((sum, product) => sum + product.quantity, 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-xl text-neutral-400">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-red-400 mb-2">Failed to load products</p>
          <p className="text-neutral-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 py-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Products Inventory</h1>
          <p className="mt-2 text-neutral-400">Aggregated view of all products needed across all orders</p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader className="pb-3">
              <CardDescription className="text-neutral-400">Total Products</CardDescription>
              <CardTitle className="text-3xl text-white">{aggregatedProducts.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader className="pb-3">
              <CardDescription className="text-neutral-400">Total Items</CardDescription>
              <CardTitle className="text-3xl text-white">{totalItems}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader className="pb-3">
              <CardDescription className="text-neutral-400">Active Orders</CardDescription>
              <CardTitle className="text-3xl text-white">{orders.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {aggregatedProducts.length === 0 ? (
          <Card className="border-neutral-800 bg-neutral-900">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="mb-4 h-16 w-16 text-neutral-600" />
              <h3 className="text-xl font-semibold text-white">No Products Yet</h3>
              <p className="mt-2 text-neutral-400">Add orders to see product inventory</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {aggregatedProducts.map((product) => (
              <Card key={product.name} className="border-neutral-800 bg-neutral-900">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white">{product.name}</CardTitle>
                    </div>
                    <Package className="h-5 w-5 text-amber-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{product.quantity}</span>
                    <span className="text-sm text-neutral-400">units needed</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
