"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, PlusCircle, Users, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-neutral-800 bg-neutral-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-white">Pre-order Tracker</h1>
            <div className="flex gap-2">
              <Link href="/">
                <Button
                  variant={pathname === "/" ? "default" : "ghost"}
                  className={
                    pathname === "/"
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  }
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage Orders
                </Button>
              </Link>
              <Link href="/new-order">
                <Button
                  variant={pathname === "/new-order" ? "default" : "ghost"}
                  className={
                    pathname === "/new-order"
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  }
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Order
                </Button>
              </Link>
              <Link href="/all-orders">
                <Button
                  variant={pathname === "/all-orders" ? "default" : "ghost"}
                  className={
                    pathname === "/all-orders"
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  }
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  All Orders
                </Button>
              </Link>
              <Link href="/products">
                <Button
                  variant={pathname === "/products" ? "default" : "ghost"}
                  className={
                    pathname === "/products"
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  }
                >
                  <Package className="mr-2 h-4 w-4" />
                  Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
