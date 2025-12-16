"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PlusCircle, X, Save } from "lucide-react"
import { useOrders, type DeliveryType } from "@/lib/orders-context"

interface OrderItem {
  name: string
  quantity: number
}

export default function NewOrder() {
  const router = useRouter()
  const { addOrder } = useOrders()
  const [customerName, setCustomerName] = useState("")
  const [estimatedArrival, setEstimatedArrival] = useState("")
  const [items, setItems] = useState<OrderItem[]>([{ name: "", quantity: 1 }])
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("on-site")
  const [address, setAddress] = useState("")

  const addItem = () => {
    setItems([...items, { name: "", quantity: 1 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName.trim()) {
      alert("Please enter customer name")
      return
    }

    const validItems = items.filter((item) => item.name.trim() !== "")
    if (validItems.length === 0) {
      alert("Please add at least one item")
      return
    }

    if (deliveryType === "delivery" && !address.trim()) {
      alert("Please enter delivery address")
      return
    }

    addOrder({
      customerName: customerName.trim(),
      items: validItems,
      status: "pending",
      estimatedArrival: estimatedArrival || undefined,
      deliveryType,
      address: deliveryType === "delivery" ? address.trim() : undefined,
    })

    router.push("/all-orders")
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-4xl p-6">
        <h2 className="mb-6 text-3xl font-bold text-white">Create New Order</h2>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-white">Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-neutral-300">
                  Customer Name *
                </Label>
                <Input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedArrival" className="text-neutral-300">
                  Estimated Arrival Time
                </Label>
                <Input
                  id="estimatedArrival"
                  type="text"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  placeholder="e.g., 12:30 PM"
                  className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-neutral-300">Delivery Type *</Label>
                <RadioGroup value={deliveryType} onValueChange={(value) => setDeliveryType(value as DeliveryType)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="on-site" id="on-site" />
                    <Label htmlFor="on-site" className="cursor-pointer font-normal text-neutral-300">
                      On-site Pickup
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="cursor-pointer font-normal text-neutral-300">
                      Delivery
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {deliveryType === "delivery" && (
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-neutral-300">
                    Delivery Address *
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter delivery address"
                    className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                    required
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300">Order Items *</Label>
                  <Button
                    type="button"
                    onClick={addItem}
                    variant="outline"
                    size="sm"
                    className="border-amber-600 bg-amber-950/30 text-amber-500 hover:bg-amber-950/50 hover:text-amber-400"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          placeholder="Item name"
                          className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                          placeholder="Qty"
                          className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                        />
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeItem(index)}
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-950/30 hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-lg font-semibold text-white hover:bg-emerald-700"
                >
                  <Save className="mr-2 h-5 w-5" />
                  Save Order
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push("/all-orders")}
                  variant="outline"
                  className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
