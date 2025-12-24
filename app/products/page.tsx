"use client"

import { useOrders } from "@/lib/orders-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Loader2, AlertCircle, Sparkles, Search, ChevronDown, ChevronRight, RefreshCw } from "lucide-react"
import { useMemo, useState, useCallback, useEffect } from "react"

type ProductItem = {
  name: string
  quantity: number
}

type GroupedProduct = {
  groupName: string
  variants: string[]
  totalQuantity: number
  items: ProductItem[]
}

type SearchResult = {
  searchQuery: string
  searchResults: ProductItem[]
  totalQuantity: number
  matchCount: number
}

export default function ProductsPage() {
  const { orders, isLoading, error } = useOrders()
  const [aiMode, setAiMode] = useState(false)
  const [aiGroups, setAiGroups] = useState<GroupedProduct[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isInitialized, setIsInitialized] = useState(false)
  const [loadedFromCache, setLoadedFromCache] = useState(false)

  // Aggregate all items from all orders (regular mode)
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

  // Load persisted state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const savedState = localStorage.getItem('products-ai-state')
      if (savedState) {
        const parsed = JSON.parse(savedState)
        
        // Restore AI mode
        if (parsed.aiMode) {
          setAiMode(true)
        }
        
        // Restore AI groups with timestamp check (refresh if older than 5 minutes)
        if (parsed.aiGroups && parsed.timestamp) {
          const age = Date.now() - parsed.timestamp
          const FIVE_MINUTES = 5 * 60 * 1000
          
          if (age < FIVE_MINUTES) {
            setAiGroups(parsed.aiGroups)
            setLoadedFromCache(true)
            // Hide the cache indicator after 3 seconds
            setTimeout(() => setLoadedFromCache(false), 3000)
          } else if (parsed.aiMode) {
            // Auto-refresh if AI mode was enabled but data is stale
            fetchAiGroups()
          }
        } else if (parsed.aiMode) {
          // If AI mode was on but no groups saved, fetch them
          fetchAiGroups()
        }
        
        // Restore expanded groups
        if (parsed.expandedGroups && Array.isArray(parsed.expandedGroups)) {
          setExpandedGroups(new Set(parsed.expandedGroups))
        }
      }
    } catch (err) {
      console.error('Failed to load persisted state:', err)
    } finally {
      setIsInitialized(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return
    
    try {
      const stateToSave = {
        aiMode,
        aiGroups,
        expandedGroups: Array.from(expandedGroups),
        timestamp: Date.now()
      }
      localStorage.setItem('products-ai-state', JSON.stringify(stateToSave))
    } catch (err) {
      console.error('Failed to save state:', err)
    }
  }, [aiMode, aiGroups, expandedGroups, isInitialized])

  // Fetch AI-grouped products
  const fetchAiGroups = useCallback(async () => {
    setAiLoading(true)
    setAiError(null)
    setSearchResults(null)
    setSearchQuery("")

    try {
      const response = await fetch('/api/products/ai-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to group products')
      }

      const data = await response.json()
      setAiGroups(data.groups || [])
      setAiMode(true)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to load AI groups')
    } finally {
      setAiLoading(false)
    }
  }, [])

  // AI-powered search
  const handleAiSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }

    setSearchLoading(true)
    setAiError(null)

    try {
      const response = await fetch('/api/products/ai-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery: searchQuery.trim() })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Search failed')
      }

      const data = await response.json()
      setSearchResults(data)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery])

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }

  // Switch to regular mode
  const switchToRegularMode = () => {
    setAiMode(false)
    setAiGroups([])
    setSearchResults(null)
    setSearchQuery("")
    setAiError(null)
    setExpandedGroups(new Set())
  }

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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-white">Products Inventory</h1>
                {aiMode && !loadedFromCache && (
                  <Badge variant="outline" className="border-purple-500 text-purple-400">
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI Mode
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-neutral-400">
                {aiMode 
                  ? "AI-powered grouping of similar products (auto-saved)" 
                  : "Aggregated view of all products needed across all orders"}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {loadedFromCache && aiMode && (
                <Badge className="bg-blue-600 text-white animate-in fade-in">
                  Loaded from cache
                </Badge>
              )}
              
              {aiMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={fetchAiGroups}
                    disabled={aiLoading}
                    className="border-amber-600 bg-transparent text-amber-500 hover:bg-amber-950/30"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    onClick={switchToRegularMode}
                    className="border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                  >
                    Regular View
                  </Button>
                </>
              ) : (
                <Button
                  onClick={fetchAiGroups}
                  disabled={aiLoading || aggregatedProducts.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-amber-600 text-white hover:from-purple-700 hover:to-amber-700"
                >
                  {aiLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  AI Group Similar
                </Button>
              )}
            </div>
          </div>

          {/* AI Search Bar - Only show in AI mode */}
          {aiMode && (
            <div className="mt-6 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Search with AI (finds similar products, plurals, variations...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                  className="h-12 border-neutral-700 bg-neutral-900 pl-10 text-lg text-white placeholder:text-neutral-500"
                />
              </div>
              <Button
                onClick={handleAiSearch}
                disabled={searchLoading || !searchQuery.trim()}
                className="h-12 bg-purple-600 text-white hover:bg-purple-700"
              >
                {searchLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    AI Search
                  </>
                )}
              </Button>
              {searchResults && (
                <Button
                  variant="outline"
                  onClick={() => setSearchResults(null)}
                  className="h-12 border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {aiError && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/30 p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>{aiError}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader className="pb-3">
              <CardDescription className="text-neutral-400">
                {aiMode && !searchResults ? "Product Groups" : "Total Products"}
              </CardDescription>
              <CardTitle className="text-3xl text-white">
                {searchResults 
                  ? searchResults.matchCount 
                  : aiMode 
                    ? aiGroups.length 
                    : aggregatedProducts.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader className="pb-3">
              <CardDescription className="text-neutral-400">Total Items</CardDescription>
              <CardTitle className="text-3xl text-white">
                {searchResults 
                  ? searchResults.totalQuantity 
                  : totalItems}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader className="pb-3">
              <CardDescription className="text-neutral-400">Active Orders</CardDescription>
              <CardTitle className="text-3xl text-white">{orders.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">
                AI Search Results for &quot;{searchResults.searchQuery}&quot;
              </h2>
              <Badge className="bg-purple-600 text-white">
                {searchResults.matchCount} matches · {searchResults.totalQuantity} total items
              </Badge>
            </div>
            
            {searchResults.searchResults.length === 0 ? (
              <Card className="border-neutral-800 bg-neutral-900">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="mb-4 h-12 w-12 text-neutral-600" />
                  <p className="text-lg text-neutral-400">No matching products found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {searchResults.searchResults.map((product) => (
                  <Card key={product.name} className="border-purple-800/50 bg-neutral-900">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-white">{product.name}</CardTitle>
                        <Package className="h-5 w-5 text-purple-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-white">{product.quantity}</span>
                        <span className="text-sm text-neutral-400">units</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Grouped Products */}
        {aiMode && !searchResults && (
          <>
            {aiLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
                  <p className="text-lg text-neutral-400">AI is analyzing your products...</p>
                  <p className="text-sm text-neutral-500 mt-2">Grouping similar items together</p>
                </div>
              </div>
            ) : aiGroups.length === 0 ? (
              <Card className="border-neutral-800 bg-neutral-900">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="mb-4 h-16 w-16 text-neutral-600" />
                  <h3 className="text-xl font-semibold text-white">No Products to Group</h3>
                  <p className="mt-2 text-neutral-400">Add orders to see product grouping</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {aiGroups.map((group) => (
                  <Card key={group.groupName} className="border-neutral-800 bg-neutral-900 overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-800/50 transition-colors"
                      onClick={() => toggleGroup(group.groupName)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedGroups.has(group.groupName) ? (
                          <ChevronDown className="h-5 w-5 text-amber-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-amber-500" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-white">{group.groupName}</h3>
                          <p className="text-sm text-neutral-400">
                            {group.items.length} variant{group.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-3xl font-bold text-white">{group.totalQuantity}</span>
                          <span className="ml-2 text-sm text-neutral-400">total units</span>
                        </div>
                        <Package className="h-6 w-6 text-amber-500" />
                      </div>
                    </div>
                    
                    {expandedGroups.has(group.groupName) && group.items.length > 0 && (
                      <div className="border-t border-neutral-800 bg-neutral-950/50 p-4">
                        <p className="text-xs text-neutral-500 mb-3">Individual variants:</p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {group.items.map((item) => (
                            <div 
                              key={item.name}
                              className="flex items-center justify-between rounded-lg bg-neutral-800/50 px-3 py-2"
                            >
                              <span className="text-sm text-neutral-300 truncate">{item.name}</span>
                              <Badge variant="outline" className="border-amber-600 text-amber-500 ml-2">
                                {item.quantity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Regular Product View */}
        {!aiMode && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
