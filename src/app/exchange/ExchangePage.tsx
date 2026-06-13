'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn, formatCompactNumber } from '@/lib/utils'
import { Coins, ShoppingBag, X, CheckCircle } from 'lucide-react'

interface Voucher {
  id: string
  title: string
  description?: string
  image_url?: string
  ic_cost: number
  stock: number
  merchant_name: string
}

interface ExchangePageProps {
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  impactCredits: number
  vouchers: Voucher[]
}

export function ExchangePage({ user, impactCredits, vouchers }: ExchangePageProps) {
  const [balance, setBalance] = useState(impactCredits)
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean
    code?: string
    error?: string
  } | null>(null)

  const handleRedeem = async () => {
    if (!selectedVoucher) return

    setIsRedeeming(true)
    try {
      const response = await fetch(`/api/vouchers/${selectedVoucher.id}/redeem`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setRedeemResult({ success: true, code: data.code })
        setBalance((b) => b - selectedVoucher.ic_cost)
      } else {
        setRedeemResult({ success: false, error: data.error })
      }
    } catch (error) {
      setRedeemResult({ success: false, error: 'Failed to redeem voucher' })
    } finally {
      setIsRedeeming(false)
    }
  }

  const closeModal = () => {
    setSelectedVoucher(null)
    setRedeemResult(null)
  }

  return (
    <AppLayout user={user}>
      {/* Balance Card */}
      <div className="bg-gold p-6 m-4 rounded-xl text-white">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-5 h-5" />
          <span className="text-sm opacity-90">Impact Credits Balance</span>
        </div>
        <p className="text-4xl font-serif font-bold">
          {formatCompactNumber(balance)} IC
        </p>
        <p className="text-xs opacity-75 mt-2">
          Not convertible to fiat currency
        </p>
      </div>

      {/* Vouchers Grid */}
      <div className="p-4 pt-0">
        <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          Available Vouchers
        </h2>

        {vouchers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No vouchers available</p>
            <p className="text-sm mt-1">Check back later for new rewards</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {vouchers.map((voucher) => {
              const canAfford = balance >= voucher.ic_cost
              return (
                <button
                  key={voucher.id}
                  onClick={() => canAfford && setSelectedVoucher(voucher)}
                  disabled={!canAfford}
                  className={cn(
                    'text-left border border-border rounded-lg overflow-hidden',
                    'transition-all',
                    canAfford
                      ? 'hover:border-gold hover:shadow-md cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {/* Image */}
                  <div className="aspect-square bg-muted">
                    {voucher.image_url ? (
                      <img
                        src={voucher.image_url}
                        alt={voucher.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-3">
                    <p className="font-medium text-foreground text-sm line-clamp-1">
                      {voucher.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {voucher.merchant_name}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      <Coins className="w-4 h-4 text-gold" />
                      <span className="font-medium text-gold">
                        {voucher.ic_cost} IC
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Redeem Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-medium text-foreground">
                {redeemResult ? 'Redemption' : 'Confirm Redemption'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {redeemResult ? (
                redeemResult.success ? (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="font-medium text-foreground mb-2">
                      Voucher Redeemed!
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Show this code at {selectedVoucher.merchant_name}
                    </p>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-mono font-bold text-foreground tracking-wider">
                        {redeemResult.code}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                      <X className="w-8 h-8 text-red-600" />
                    </div>
                    <p className="font-medium text-foreground mb-2">
                      Redemption Failed
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {redeemResult.error}
                    </p>
                  </div>
                )
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 rounded-lg bg-muted">
                      {selectedVoucher.image_url ? (
                        <img
                          src={selectedVoucher.image_url}
                          alt={selectedVoucher.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {selectedVoucher.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedVoucher.merchant_name}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="font-medium text-gold">
                        {selectedVoucher.ic_cost} IC
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">
                        Remaining Balance
                      </span>
                      <span className="font-medium">
                        {balance - selectedVoucher.ic_cost} IC
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleRedeem}
                    disabled={isRedeeming}
                    className="w-full py-3 bg-gold text-white font-medium rounded-lg
                               hover:bg-gold-dark transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2"
                  >
                    {isRedeeming ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Redemption'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
