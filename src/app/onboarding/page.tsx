'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MapPin, Info, ChevronDown, Search } from 'lucide-react'

// Indian states and union territories
const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [cityName, setCityName] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [user, setUser] = useState<{ display_name: string } | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        const profile = profileData as any
        if (profile) {
          setUser({ display_name: profile.display_name || '' })
        }
      }
    }
    fetchUser()
  }, [])

  const filteredStates = INDIAN_STATES.filter((state) =>
    state.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!selectedState) {
      setError('Please select your state')
      return
    }

    if (!cityName.trim()) {
      setError('Please enter your city/town name')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Session expired. Please login again.')
        router.push('/login')
        return
      }

      const nativePinName = `${cityName.trim()}, ${selectedState}, India`

      // Update profile with native pin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          native_pin_name: nativePinName,
          native_pin_set_at: new Date().toISOString(),
          onboarding_status: 'active',
        })
        .eq('id', user.id)

      if (updateError) {
        setError(updateError.message)
        setIsLoading(false)
        return
      }

      // Redirect to home
      router.push('/')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Welcome{user ? `, ${user.display_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Let's set up your civic identity
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          {/* Info Box */}
          <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground mb-1">
                  Dual-Pin System
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your <strong>Native Pin</strong> is your hometown - where you belong.
                  It determines your regional leaderboards and local challenges.
                  This can only be changed once per year, so choose carefully.
                </p>
              </div>
            </div>
          </div>

          {/* State Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Your State/UT
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3
                           border border-border rounded-lg bg-white
                           hover:border-gold focus:border-gold focus:ring-2 focus:ring-gold/20
                           transition-all"
              >
                <span className={selectedState ? 'text-foreground' : 'text-muted-foreground'}>
                  {selectedState || 'Choose your state...'}
                </span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-border rounded-lg shadow-lg max-h-64 overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search states..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-md
                                   focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredStates.map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => {
                          setSelectedState(state)
                          setIsDropdownOpen(false)
                          setSearchQuery('')
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gold/5 transition-colors
                                    ${selectedState === state ? 'bg-gold/10 text-gold font-medium' : 'text-foreground'}`}
                      >
                        {state}
                      </button>
                    ))}
                    {filteredStates.length === 0 && (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                        No states found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* City Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              City / Town / Village
            </label>
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="Enter your city or town name"
              className="w-full px-4 py-3 border border-border rounded-lg
                         focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none
                         transition-all"
            />
          </div>

          {/* Preview */}
          {selectedState && cityName && (
            <div className="mb-6 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Your Native Pin will be:</p>
              <p className="font-medium text-foreground">
                {cityName.trim()}, {selectedState}, India
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedState || !cityName.trim()}
            className="w-full py-3 px-4 bg-gold text-white font-medium rounded-lg
                       hover:bg-gold-dark transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                Confirm Native Pin
              </>
            )}
          </button>

          {/* Warning */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            ⚠️ Your Native Pin can only be modified once per year after this.
          </p>
        </div>
      </div>
    </div>
  )
}
