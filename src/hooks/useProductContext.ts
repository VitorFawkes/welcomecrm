import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Database } from '../database.types'

type Product = Database['public']['Enums']['app_product']

interface ProductState {
    currentProduct: Product
    setProduct: (product: Product) => void
}

export const useProductContext = create<ProductState>()(
    persist(
        (set) => ({
            currentProduct: 'TRIPS', // Default
            setProduct: (product) => set({ currentProduct: product }),
        }),
        {
            name: 'product-storage',
        }
    )
)
