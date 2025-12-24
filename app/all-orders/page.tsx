"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Search, Edit, Trash2, X, Save, PlusCircle, User, MapPin, Loader2, AlertCircle, Filter, DollarSign } from "lucide-react"
import { useOrders, type Order, type DeliveryType } from "@/lib/orders-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function AllOrders() {
  const { orders, updateOrder, deleteOrder, addPayment, isLoading, error } = useOrders()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "delivered" | "active">("all")
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    customerName: "",
    estimatedArrival: "",
    items: [{ name: "", quantity: 1 }],
    deliveryType: "on-site" as DeliveryType,
    address: "",
    totalAmount: "",
    amountPaid: "",
  })

  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Apply status filter
    if (statusFilter === "delivered") {
      filtered = filtered.filter((order) => order.status === "delivered")
    } else if (statusFilter === "active") {
      filtered = filtered.filter((order) => order.status !== "delivered")
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((order) => 
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [orders, searchQuery, statusFilter])

  const handleEditClick = (order: Order) => {
    setEditingOrder(order)
    setEditForm({
      customerName: order.customerName,
      estimatedArrival: order.estimatedArrival || "",
      items: [...order.items],
      deliveryType: order.deliveryType,
      address: order.address || "",
      totalAmount: order.totalAmount?.toString() || "0",
      amountPaid: order.amountPaid?.toString() || "0",
    })
  }

  const handleSaveEdit = async () => {
    if (!editingOrder) return

    const validItems = editForm.items.filter((item) => item.name.trim() !== "")
    if (validItems.length === 0) {
      alert("Please add at least one item")
      return
    }

    if (editForm.deliveryType === "delivery" && !editForm.address.trim()) {
      alert("Please enter delivery address")
      return
    }

    setIsSaving(true)
    try {
      await updateOrder(editingOrder.id, {
        customerName: editForm.customerName,
        estimatedArrival: editForm.estimatedArrival || undefined,
        items: validItems,
        deliveryType: editForm.deliveryType,
        address: editForm.deliveryType === "delivery" ? editForm.address.trim() : undefined,
        totalAmount: parseFloat(editForm.totalAmount) || 0,
        amountPaid: parseFloat(editForm.amountPaid) || 0,
      })
      setEditingOrder(null)
    } catch (error) {
      console.error("Failed to update order:", error)
      alert("Failed to update order. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const addItem = () => {
    setEditForm({
      ...editForm,
      items: [...editForm.items, { name: "", quantity: 1 }],
    })
  }

  const removeItem = (index: number) => {
    if (editForm.items.length > 1) {
      setEditForm({
        ...editForm,
        items: editForm.items.filter((_, i) => i !== index),
      })
    }
  }

  const updateItem = (index: number, field: "name" | "quantity", value: string | number) => {
    const newItems = [...editForm.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setEditForm({ ...editForm, items: newItems })
  }

  const handleDelete = async (orderId: string, customerName: string) => {
    if (confirm(`Are you sure you want to delete order for ${customerName}?`)) {
      setIsDeleting(orderId)
      try {
        await deleteOrder(orderId)
      } catch (error) {
        console.error("Failed to delete order:", error)
        alert("Failed to delete order. Please try again.")
      } finally {
        setIsDeleting(null)
      }
    }
  }

  const handleAddPayment = async (orderId: string, amount: number) => {
    try {
      await addPayment(orderId, amount)
    } catch (error) {
      console.error("Failed to add payment:", error)
      alert("Failed to add payment. Please try again.")
    }
  }

  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
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

  const getPaymentBadge = (order: Order) => {
    const remainingBalance = order.totalAmount - order.amountPaid
    const isPaidInFull = remainingBalance <= 0
    const hasPartialPayment = order.amountPaid > 0 && !isPaidInFull

    if (isPaidInFull) {
      return (
        <Badge 
          variant="outline" 
          className="border-green-500 bg-green-950/30 text-green-400"
        >
          <DollarSign className="mr-1 h-3 w-3" />
          Paid ${order.amountPaid.toFixed(2)}
        </Badge>
      )
    } else if (hasPartialPayment) {
      return (
        <Badge 
          variant="outline" 
          className="border-yellow-500 bg-yellow-950/30 text-yellow-400"
        >
          <DollarSign className="mr-1 h-3 w-3" />
          Owes ${remainingBalance.toFixed(2)}
        </Badge>
      )
    } else {
      return (
        <Badge 
          variant="outline" 
          className="border-red-500 bg-red-950/30 text-red-400"
        >
          <DollarSign className="mr-1 h-3 w-3" />
          Unpaid ${order.totalAmount.toFixed(2)}
        </Badge>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-xl text-neutral-400">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-red-400 mb-2">Failed to load orders</p>
          <p className="text-neutral-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 space-y-4">
          <h2 className="text-3xl font-bold text-white">All Orders</h2>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search by customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 border-neutral-700 bg-neutral-900 pl-10 text-lg text-white placeholder:text-neutral-500"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="lg"
                onClick={() => setStatusFilter("all")}
                className={
                  statusFilter === "all"
                    ? "h-12 bg-blue-600 text-white hover:bg-blue-700"
                    : "h-12 border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }
              >
                <Filter className="mr-2 h-5 w-5" />
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="lg"
                onClick={() => setStatusFilter("active")}
                className={
                  statusFilter === "active"
                    ? "h-12 bg-amber-600 text-white hover:bg-amber-700"
                    : "h-12 border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }
              >
                <Filter className="mr-2 h-5 w-5" />
                Active
              </Button>
              <Button
                variant={statusFilter === "delivered" ? "default" : "outline"}
                size="lg"
                onClick={() => setStatusFilter("delivered")}
                className={
                  statusFilter === "delivered"
                    ? "h-12 bg-emerald-600 text-white hover:bg-emerald-700"
                    : "h-12 border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }
              >
                <Filter className="mr-2 h-5 w-5" />
                Delivered
              </Button>
            </div>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-neutral-800 bg-neutral-900 p-12 text-center">
            <p className="text-xl text-neutral-400">
              {searchQuery ? "No orders found matching your search" : "No orders yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="border-2 border-neutral-800 bg-neutral-900">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800">
                        <User className="h-8 w-8 text-neutral-400" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-2xl font-bold text-white">{order.id}</h3>
                          {getStatusBadge(order.status)}
                          {order.deliveryType === "delivery" && (
                            <Badge variant="outline" className="border-blue-600 text-blue-400">
                              <MapPin className="mr-1 h-3 w-3" />
                              Delivery
                            </Badge>
                          )}
                          {order.totalAmount > 0 && getPaymentBadge(order)}
                        </div>
                        <p className="text-xl font-semibold text-neutral-300">{order.customerName}</p>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-neutral-400">Items:</p>
                          {order.items.map((item, idx) => (
                            <p key={idx} className="text-lg text-neutral-400">
                              • {item.quantity}x {item.name}
                            </p>
                          ))}
                        </div>

                        {order.estimatedArrival && (
                          <p className="text-sm text-neutral-500">Est. Arrival: {order.estimatedArrival}</p>
                        )}
                        {order.address && (
                          <p className="flex items-center gap-1 text-sm text-neutral-500">
                            <MapPin className="h-3 w-3" />
                            {order.address}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEditClick(order)}
                        variant="outline"
                        size="lg"
                        className="border-blue-600 bg-blue-950/30 text-blue-400 hover:bg-blue-950/50 hover:text-blue-300"
                        disabled={isDeleting === order.id}
                      >
                        <Edit className="mr-2 h-5 w-5" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(order.id, order.customerName)}
                        variant="outline"
                        size="lg"
                        className="border-red-600 bg-red-950/30 text-red-400 hover:bg-red-950/50 hover:text-red-300"
                        disabled={isDeleting === order.id}
                      >
                        {isDeleting === order.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-2xl border-neutral-800 bg-neutral-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Order {editingOrder?.id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-customer" className="text-neutral-300">
                Customer Name
              </Label>
              <Input
                id="edit-customer"
                value={editForm.customerName}
                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                className="border-neutral-700 bg-neutral-800 text-white"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-arrival" className="text-neutral-300">
                Estimated Arrival Time
              </Label>
              <Input
                id="edit-arrival"
                value={editForm.estimatedArrival}
                onChange={(e) => setEditForm({ ...editForm, estimatedArrival: e.target.value })}
                placeholder="e.g., 12:30 PM"
                className="border-neutral-700 bg-neutral-800 text-white"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-neutral-300">Delivery Type</Label>
              <RadioGroup
                value={editForm.deliveryType}
                onValueChange={(value) => setEditForm({ ...editForm, deliveryType: value as DeliveryType })}
                disabled={isSaving}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="on-site" id="edit-on-site" />
                  <Label htmlFor="edit-on-site" className="cursor-pointer font-normal text-neutral-300">
                    On-site Pickup
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delivery" id="edit-delivery" />
                  <Label htmlFor="edit-delivery" className="cursor-pointer font-normal text-neutral-300">
                    Delivery
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {editForm.deliveryType === "delivery" && (
              <div className="space-y-2">
                <Label htmlFor="edit-address" className="text-neutral-300">
                  Delivery Address
                </Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Enter delivery address"
                  className="border-neutral-700 bg-neutral-800 text-white"
                  disabled={isSaving}
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
                {editForm.totalAmount && parseFloat(editForm.totalAmount) > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setEditForm({ ...editForm, amountPaid: editForm.totalAmount })}
                      disabled={isSaving}
                      className={`${
                        editForm.amountPaid === editForm.totalAmount
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                      }`}
                    >
                      Paid in Full
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setEditForm({ ...editForm, amountPaid: "0" })}
                      disabled={isSaving}
                      className={`${
                        editForm.amountPaid !== editForm.totalAmount
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
                  <Label htmlFor="edit-totalAmount" className="text-neutral-300">
                    Total Amount
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input
                      id="edit-totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.totalAmount}
                      onChange={(e) => setEditForm({ ...editForm, totalAmount: e.target.value })}
                      placeholder="0.00"
                      className="pl-9 border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                      disabled={isSaving}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-amountPaid" className="text-neutral-300">
                    Amount Paid
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input
                      id="edit-amountPaid"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.amountPaid}
                      onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })}
                      placeholder="0.00"
                      className="pl-9 border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>

              {/* Balance Preview */}
              {editForm.totalAmount && (
                <div className="flex justify-between items-center pt-2 border-t border-neutral-700">
                  <span className="text-neutral-400">Remaining Balance:</span>
                  <span className={`text-lg font-bold ${
                    (parseFloat(editForm.totalAmount) || 0) - (parseFloat(editForm.amountPaid) || 0) <= 0 
                      ? 'text-green-400' 
                      : 'text-amber-400'
                  }`}>
                    ${((parseFloat(editForm.totalAmount) || 0) - (parseFloat(editForm.amountPaid) || 0)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Order Items</Label>
                <Button
                  type="button"
                  onClick={addItem}
                  variant="outline"
                  size="sm"
                  className="border-amber-600 bg-amber-950/30 text-amber-500 hover:bg-amber-950/50"
                  disabled={isSaving}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {editForm.items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      placeholder="Item name"
                      className="flex-1 border-neutral-700 bg-neutral-800 text-white"
                      disabled={isSaving}
                    />
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                      className="w-20 border-neutral-700 bg-neutral-800 text-white"
                      disabled={isSaving}
                    />
                    {editForm.items.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-950/30"
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setEditingOrder(null)}
              variant="outline"
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
