import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({ apiKey })
}

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

// POST /api/products/ai-group - Group similar products using AI
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get search query if provided
    const body = await request.json().catch(() => ({}))
    const searchQuery = body.searchQuery as string | undefined

    // Fetch all products
    const { data, error } = await supabase
      .from('order_items')
      .select('name, quantity')

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

    const products = Array.from(productMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))

    if (products.length === 0) {
      return NextResponse.json({ groups: [], searchResults: [] })
    }

    const openai = getOpenAIClient()

    // If there's a search query, find similar products
    if (searchQuery && searchQuery.trim()) {
      const searchPrompt = `Given this search term: "${searchQuery}"
      
Find ALL products from this list that match or are similar to the search term. Include:
- Exact matches
- Plural/singular variations (burger/burgers, fry/fries)
- Common misspellings
- Similar items (e.g., "cola" matches "Coca-Cola", "soda", "coke")
- Related food items

Products list:
${products.map(p => `- ${p.name} (qty: ${p.quantity})`).join('\n')}

Return a JSON array of matching product names. Only include products from the list above.
Format: { "matches": ["product1", "product2"] }`

      const searchResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a product matching assistant. Return only valid JSON.'
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })

      const searchContent = searchResponse.choices[0]?.message?.content
      if (!searchContent) {
        return NextResponse.json({ groups: [], searchResults: products })
      }

      try {
        const parsed = JSON.parse(searchContent)
        const matchingNames = new Set(parsed.matches || [])
        const searchResults = products.filter(p => matchingNames.has(p.name))
        const totalQuantity = searchResults.reduce((sum, p) => sum + p.quantity, 0)
        
        return NextResponse.json({
          searchQuery,
          searchResults,
          totalQuantity,
          matchCount: searchResults.length
        })
      } catch {
        return NextResponse.json({ groups: [], searchResults: products })
      }
    }

    // Group similar products
    const groupPrompt = `Analyze this list of product names and group similar items together.
Group items that are:
- Plural/singular versions of the same thing (burger/burgers)
- Common misspellings or variations
- The same product with different descriptions

Products:
${products.map(p => `- "${p.name}" (qty: ${p.quantity})`).join('\n')}

Return a JSON object with groups. Each group should have:
- groupName: A normalized name for the group (use the most common/proper form)
- variants: Array of all product names that belong to this group

Format:
{
  "groups": [
    { "groupName": "Burger", "variants": ["burger", "burgers", "Burger", "hamburguer"] },
    { "groupName": "French Fries", "variants": ["fries", "french fries", "Fries", "papas fritas"] }
  ]
}

IMPORTANT: Every product must be included in exactly one group. Single items get their own group.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a product categorization assistant for a restaurant. Group similar menu items together. Return only valid JSON.'
        },
        {
          role: 'user',
          content: groupPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    try {
      const parsed = JSON.parse(content)
      const groups: GroupedProduct[] = []

      // Process each group
      for (const group of parsed.groups || []) {
        const variantSet = new Set(group.variants.map((v: string) => v.toLowerCase()))
        const matchingProducts = products.filter(p => 
          variantSet.has(p.name.toLowerCase()) || 
          group.variants.some((v: string) => v.toLowerCase() === p.name.toLowerCase())
        )

        if (matchingProducts.length > 0) {
          groups.push({
            groupName: group.groupName,
            variants: group.variants,
            totalQuantity: matchingProducts.reduce((sum, p) => sum + p.quantity, 0),
            items: matchingProducts
          })
        }
      }

      // Sort by total quantity descending
      groups.sort((a, b) => b.totalQuantity - a.totalQuantity)

      return NextResponse.json({ groups })
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('AI grouping error:', error)
    
    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to group products with AI' },
      { status: 500 }
    )
  }
}

