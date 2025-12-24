"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Clock, CheckCircle, User, MapPin, Loader2, DollarSign, CreditCard, Wallet } from "lucide-react"
import type { Order } from "@/lib/orders-context"

interface OrderCardProps {
  order: Order
  onMarkArrived?: (id: string) => void
  onMarkDelivered?: (id: string) => void
  onAddPayment?: (id: string, amount: number) => Promise<void>
  showActions?: boolean
  isProcessing?: boolean
}

export function OrderCard({ order, onMarkArrived, onMarkDelivered, onAddPayment, showActions = true, isProcessing = false }: OrderCardProps) {
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [isAddingPayment, setIsAddingPayment] = useState(false)

  useEffect(() => {
    if (order.status === "arrived" && order.deliveryType === "on-site") {
      const interval = setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [order.status, order.deliveryType])

  const getElapsedTime = () => {
    if (order.status === "pending") return "00:00"
    if (order.status === "delivered" && order.waitTime !== undefined) {
      const minutes = Math.floor(order.waitTime / 60)
      const seconds = order.waitTime % 60
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }
    if (order.status === "arrived" && order.arrivedAt) {
      const elapsed = Math.floor((currentTime - order.arrivedAt) / 1000)
      const minutes = Math.floor(elapsed / 60)
      const seconds = elapsed % 60
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }
    return "00:00"
  }

  const getStatusBadge = () => {
    switch (order.status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-neutral-700 text-neutral-300 hover:bg-neutral-700">
            Pending
          </Badge>
        )
      case "arrived":
        return <Badge className="bg-amber-600 text-white hover:bg-amber-600">Arrived</Badge>
      case "delivered":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Delivered</Badge>
    }
  }

  const remainingBalance = order.totalAmount - order.amountPaid
  const isPaidInFull = remainingBalance <= 0
  const hasPartialPayment = order.amountPaid > 0 && !isPaidInFull

  const getPaymentBadge = () => {
    if (isPaidInFull) {
      return (
        <Badge 
          variant="outline" 
          className="border-green-500 bg-green-950/30 text-green-400 cursor-pointer hover:bg-green-950/50"
        >
          <DollarSign className="mr-1 h-3 w-3" />
          Paid ${order.amountPaid.toFixed(2)}
        </Badge>
      )
    } else if (hasPartialPayment) {
      return (
        <Badge 
          variant="outline" 
          className="border-yellow-500 bg-yellow-950/30 text-yellow-400 cursor-pointer hover:bg-yellow-950/50"
        >
          <Wallet className="mr-1 h-3 w-3" />
          Owes ${remainingBalance.toFixed(2)}
        </Badge>
      )
    } else {
      return (
        <Badge 
          variant="outline" 
          className="border-red-500 bg-red-950/30 text-red-400 cursor-pointer hover:bg-red-950/50"
        >
          <DollarSign className="mr-1 h-3 w-3" />
          Unpaid ${order.totalAmount.toFixed(2)}
        </Badge>
      )
    }
  }

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    setIsAddingPayment(true)
    try {
      await onAddPayment?.(order.id, amount)
      setPaymentAmount("")
      setShowPaymentDialog(false)
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
      await onAddPayment?.(order.id, remainingBalance)
      setPaymentAmount("")
      setShowPaymentDialog(false)
    } catch (error) {
      console.error("Failed to add payment:", error)
    } finally {
      setIsAddingPayment(false)
    }
  }

  const cardClassName =
    order.status === "arrived" ? "border-amber-500 bg-amber-950/30" : "border-neutral-800 bg-neutral-900"

  const itemsText = order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")

  return (
    <>
      <Card className={`${cardClassName} border-2 transition-colors`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800">
                <User className="h-8 w-8 text-neutral-400" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl font-bold text-white">{order.id}</h3>
                  {getStatusBadge()}
                  {order.deliveryType === "delivery" && (
                    <Badge variant="outline" className="border-blue-600 text-blue-400">
                      <MapPin className="mr-1 h-3 w-3" />
                      Delivery
                    </Badge>
                  )}
                  {onAddPayment ? (
                    <button
                      onClick={() => setShowPaymentDialog(true)}
                      disabled={isProcessing}
                      className="transition-transform hover:scale-105 disabled:opacity-50"
                    >
                      {getPaymentBadge()}
                    </button>
                  ) : (
                    getPaymentBadge()
                  )}
                </div>
                <p className="text-xl font-semibold text-neutral-300">{order.customerName}</p>
                <p className="text-lg text-neutral-400">{itemsText}</p>
                {order.estimatedArrival && (
                  <p className="text-sm text-neutral-500">Est. Arrival: {order.estimatedArrival}</p>
                )}
                {order.address && (
                  <p className="text-sm text-neutral-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {order.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              {order.deliveryType === "on-site" && (
                <div className="text-center">
                  <div className="mb-1 flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5 text-neutral-400" />
                    <span className="text-sm font-medium uppercase text-neutral-400">Wait Time</span>
                  </div>
                  <div
                    className={`text-5xl font-bold tabular-nums ${
                      order.status === "arrived" ? "text-amber-500" : "text-neutral-300"
                    }`}
                  >
                    {getElapsedTime()}
                  </div>
                </div>
              )}

              {showActions && (
                <div className="flex flex-col gap-2">
                  {order.status === "pending" && onMarkArrived && (
                    <Button
                      size="lg"
                      onClick={() => onMarkArrived(order.id)}
                      className="h-14 min-w-[180px] bg-amber-600 text-lg font-semibold text-white hover:bg-amber-700"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <User className="mr-2 h-5 w-5" />
                      )}
                      Mark Arrived
                    </Button>
                  )}
                  {order.status === "arrived" && onMarkDelivered && (
                    <Button
                      size="lg"
                      onClick={() => onMarkDelivered(order.id)}
                      className="h-14 min-w-[180px] bg-emerald-600 text-lg font-semibold text-white hover:bg-emerald-700"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-5 w-5" />
                      )}
                      Mark Delivered
                    </Button>
                  )}
                  {order.status === "delivered" && (
                    <div className="flex h-14 min-w-[180px] items-center justify-center rounded-lg border-2 border-emerald-600 bg-emerald-950/30">
                      <CheckCircle className="mr-2 h-5 w-5 text-emerald-500" />
                      <span className="text-lg font-semibold text-emerald-500">Completed</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="border-neutral-800 bg-neutral-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-amber-500" />
              Payment Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Customer Info */}
            <div className="text-center">
              <p className="text-lg text-neutral-400">Customer</p>
              <p className="text-2xl font-bold text-white">{order.customerName}</p>
              <p className="text-sm text-neutral-500">{order.id}</p>
            </div>

            {/* Payment Summary */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Total Amount</span>
                <span className="text-xl font-bold text-white">${order.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Amount Paid</span>
                <span className="text-xl font-bold text-green-400">${order.amountPaid.toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-800 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-300 font-medium">Remaining Balance</span>
                  <span className={`text-2xl font-bold ${remainingBalance <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${remainingBalance.toFixed(2)}
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
              <>
                {/* Add Payment Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount" className="text-neutral-300">
                      Add Payment
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                        <Input
                          id="payment-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00"
                          className="pl-10 border-neutral-700 bg-neutral-800 text-white text-lg"
                          disabled={isAddingPayment}
                        />
                      </div>
                      <Button
                        onClick={handleAddPayment}
                        disabled={isAddingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isAddingPayment ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-amber-600 bg-amber-950/30 text-amber-400 hover:bg-amber-950/50"
                      onClick={handlePayFullAmount}
                      disabled={isAddingPayment}
                    >
                      {isAddingPayment ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wallet className="mr-2 h-4 w-4" />
                      )}
                      Pay Full (${remainingBalance.toFixed(2)})
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
