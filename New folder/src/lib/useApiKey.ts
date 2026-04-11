'use client'
// Manages the admin API key stored in localStorage.
// Exposes: apiKey (string), setKey (persist + update), isReady (localStorage read complete)

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'adminKey'

export function useApiKey() {
  const [apiKey,  setApiKey]  = useState<string>('')
  const [isReady, setIsReady] = useState<boolean>(false)

  // Read from localStorage once on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? ''
    setApiKey(stored)
    setIsReady(true)
  }, [])

  // Persist a new key to localStorage and update state
  function setKey(key: string) {
    const trimmed = key.trim()
    localStorage.setItem(STORAGE_KEY, trimmed)
    setApiKey(trimmed)
  }

  return { apiKey, setKey, isReady }
}

// Build Authorization headers — same shape as original HEADERS variable
export function buildHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${apiKey}`,
  }
}
