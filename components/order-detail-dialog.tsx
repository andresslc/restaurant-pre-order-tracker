"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  User, 
  MapPin, 
  DollarSign, 
  Wallet, 
  Package, 
  CheckCircle, 
  Loader2,
  Clock
} from "lucide-react"
import type { Order } from "@/lib/orders-context"

interface OrderDetailDialogProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddPayment: (orderId: string, amount: number) => Promise<void>
  onUpdateItemDelivery: (orderId: string, itemId: string, isDelivered: boolean) => Promise<void>
  onMarkDelivered?: (orderId: string) => Promise<void>
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onAddPayment,
  onUpdateItemDelivery,
  onMarkDelivered,
}: OrderDetailDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("")
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())

  if (!order) return null

  const remainingBalance = order.totalAmount - order.amountPaid
  const isPaidInFull = remainingBalance <= 0
  const allItemsDelivered = order.items.every(item => item.isDelivered)
  const deliveredCount = order.items.filter(item => item.isDelivered).length

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) return

    setIsAddingPayment(true)
    try {
      await onAddPayment(order.id, amount)
      setPaymentAmount("")
    } catch (error) {
      console.error("Failed to add payment:", error)
    } finally {
      setIsAddingPayment(false)
    }
  }

  const handlePayFullAmount = async () => {
    if (remainingBalance <= 0) return
    
    setIsAddingPayment(true)
    try {
      await onAddPayment(order.id, remainingBalance)
      setPaymentAmount("")
    } catch (error) {
      console.error("Failed to add payment:", error)
    } finally {
      setIsAddingPayment(false)
    }
  }

  const handleItemDeliveryChange = async (itemId: string, isDelivered: boolean) => {
    if (!itemId) return
    
    setUpdatingItems(prev => new Set(prev).add(itemId))
    try {
      await onUpdateItemDelivery(order.id, itemId, isDelivered)
    } catch (error) {
      console.error("Failed to update item:", error)
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleMarkAllDelivered = async () => {
    const undeliveredItems = order.items.filter(item => !item.isDelivered && item.id)
    for (const item of undeliveredItems) {
      if (item.id) {
        await handleItemDeliveryChange(item.id, true)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-900 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
              <User className="h-6 w-6 text-neutral-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>{order.customerName}</span>
                <Badge variant="secondary" className="bg-neutral-700 text-neutral-300">
                  {order.id}
                </Badge>
              </div>
              {order.deliveryType === "delivery" && order.address && (
                <p className="text-sm font-normal text-neutral-400 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {order.address}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Items Section */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-white">Order Items</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={allItemsDelivered 
                    ? "border-green-500 text-green-400" 
                    : "border-amber-500 text-amber-400"
                  }
                >
                  {deliveredCount}/{order.items.length} Delivered
                </Badge>
                {!allItemsDelivered && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAllDelivered}
                    className="border-green-600 bg-green-950/30 text-green-400 hover:bg-green-950/50"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Mark All
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div
                  key={item.id || index}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    item.isDelivered
                      ? "bg-green-950/20 border border-green-900"
                      : "bg-neutral-900 border border-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.id ? (
                      updatingItems.has(item.id) ? (
                        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                      ) : (
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={item.isDelivered}
                          onCheckedChange={(checked) => 
                            handleItemDeliveryChange(item.id!, checked as boolean)
                          }
                          className="border-neutral-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      )
                    ) : (
                      <div className="w-5 h-5" />
                    )}
                    <label
                      htmlFor={`item-${item.id}`}
                      className={`text-lg cursor-pointer ${
                        item.isDelivered ? "text-green-400 line-through" : "text-white"
                      }`}
                    >
                      {item.quantity}x {item.name}
                    </label>
                  </div>
                  {item.isDelivered && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment Section */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-white">Payment Information</h3>
            </div>

            {/* Payment Summary */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Total Amount</span>
                <span className="text-xl font-bold text-white">
                  ${order.totalAmount.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Amount Paid</span>
                <span className="text-xl font-bold text-green-400">
                  ${order.amountPaid.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="border-t border-neutral-800 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-300 font-medium">Remaining Balance</span>
                  <span className={`text-2xl font-bold ${
                    remainingBalance <= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${remainingBalance.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            {isPaidInFull ? (
              <div className="rounded-lg border-2 border-green-600 bg-green-950/30 p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-semibold text-green-400">Paid in Full</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Quick Payment Buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handlePayFullAmount}
                    disabled={isAddingPayment}
                  >
                    {isAddingPayment ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="mr-2 h-4 w-4" />
                    )}
                    Pay Full (${remainingBalance.toLocaleString('es-CO')})
                  </Button>
                </div>

                {/* Custom Payment */}
                <div className="space-y-2">
                  <Label htmlFor="payment-amount" className="text-neutral-300">
                    Add Partial Payment
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                      <Input
                        id="payment-amount"
                        type="number"
                        step="100"
                        min="0"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0"
                        className="pl-10 border-neutral-700 bg-neutral-800 text-white text-lg"
                        disabled={isAddingPayment}
                      />
                    </div>
                    <Button
                      onClick={handleAddPayment}
                      disabled={isAddingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {isAddingPayment ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Status Info */}
          {order.status === "arrived" && order.deliveryType === "on-site" && (
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <Clock className="h-5 w-5" />
              <span>Customer is waiting</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {order.status === "arrived" && onMarkDelivered && allItemsDelivered && isPaidInFull && (
            <Button
              onClick={() => {
                onMarkDelivered(order.id)
                onOpenChange(false)
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Order
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

