"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PlusCircle, X, Save, Loader2, DollarSign } from "lucide-react"
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
  const [totalAmount, setTotalAmount] = useState("")
  const [amountPaid, setAmountPaid] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!customerName.trim()) {
      setSubmitError("Please enter customer name")
      return
    }

    const validItems = items.filter((item) => item.name.trim() !== "")
    if (validItems.length === 0) {
      setSubmitError("Please add at least one item")
      return
    }

    if (deliveryType === "delivery" && !address.trim()) {
      setSubmitError("Please enter delivery address")
      return
    }

    setIsSubmitting(true)

    try {
      await addOrder({
        customerName: customerName.trim(),
        items: validItems,
        status: "pending",
        estimatedArrival: estimatedArrival || undefined,
        deliveryType,
        address: deliveryType === "delivery" ? address.trim() : undefined,
        totalAmount: parseFloat(totalAmount) || 0,
        amountPaid: parseFloat(amountPaid) || 0,
      })

      router.push("/all-orders")
    } catch (error) {
      console.error("Error creating order:", error)
      setSubmitError(error instanceof Error ? error.message : "Failed to create order")
    } finally {
      setIsSubmitting(false)
    }
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
              {submitError && (
                <div className="rounded-lg border border-red-600 bg-red-950/30 p-4 text-red-400">
                  {submitError}
                </div>
              )}

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
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedArrival" className="text-neutral-300">
                  Estimated Arrival Time
                </Label>
                <Input
                  id="estimatedArrival"
                  type="time"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-neutral-300">Delivery Type *</Label>
                <RadioGroup 
                  value={deliveryType} 
                  onValueChange={(value) => setDeliveryType(value as DeliveryType)}
                  disabled={isSubmitting}
                >
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
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Payment Section */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                    <Label className="text-lg font-medium">Payment Information</Label>
                  </div>
                  
                  {/* Payment Status Toggle */}
                  {totalAmount && parseFloat(totalAmount) > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setAmountPaid(totalAmount)}
                        disabled={isSubmitting}
                        className={`${
                          amountPaid === totalAmount
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                        }`}
                      >
                        Paid in Full
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setAmountPaid("0")}
                        disabled={isSubmitting}
                        className={`${
                          amountPaid !== totalAmount
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                        }`}
                      >
                        In Debt
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount" className="text-neutral-300">
                      Total Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-9 border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amountPaid" className="text-neutral-300">
                      Amount Paid (Downpayment)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                      <Input
                        id="amountPaid"
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="0.00"
                        className="pl-9 border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Balance Preview */}
                {totalAmount && (
                  <div className="flex justify-between items-center pt-2 border-t border-neutral-700">
                    <span className="text-neutral-400">Remaining Balance:</span>
                    <span className={`text-lg font-bold ${
                      (parseFloat(totalAmount) || 0) - (parseFloat(amountPaid) || 0) <= 0 
                        ? 'text-green-400' 
                        : 'text-amber-400'
                    }`}>
                      ${((parseFloat(totalAmount) || 0) - (parseFloat(amountPaid) || 0)).toLocaleString('es-CO')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300">Order Items *</Label>
                  <Button
                    type="button"
                    onClick={addItem}
                    variant="outline"
                    size="sm"
                    className="border-amber-600 bg-amber-950/30 text-amber-500 hover:bg-amber-950/50 hover:text-amber-400"
                    disabled={isSubmitting}
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
                          disabled={isSubmitting}
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
                          disabled={isSubmitting}
                        />
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeItem(index)}
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-950/30 hover:text-red-400"
                          disabled={isSubmitting}
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Save Order
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push("/all-orders")}
                  variant="outline"
                  className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  disabled={isSubmitting}
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
