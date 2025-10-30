"use client"

import * as React from "react"

type KeyMode = "env" | "local"
type ChatMode = "sidebar" | "chatbox"

interface LocalKeys {
  provider: string // "openrouter" | "ai-gateway" | "custom" or custom URL
  apiKey: string
  model: string
  maxTokens: string
  customEndpoint?: string // For when provider is "custom" or a custom URL
}

interface AiConfig {
  enabled: boolean
  onboarded: boolean
  keyMode: KeyMode
  chatMode: ChatMode
  localKeys?: LocalKeys
}

interface AiConfigProviderProps {
  children: React.ReactNode
  defaultConfig?: Partial<AiConfig>
  storageKey?: string
}

interface AiConfigProviderState {
  config: AiConfig
  setConfig: (config: Partial<AiConfig> | ((prev: AiConfig) => Partial<AiConfig>)) => void
  isHydrated: boolean
}

const isServer = typeof window === "undefined"
const AiConfigContext = React.createContext<AiConfigProviderState | undefined>(
  undefined
)

const defaultAiConfig: AiConfig = {
  enabled: false,
  onboarded: false,
  keyMode: "env",
  chatMode: "chatbox",
  localKeys: undefined,
}

const saveToLS = (storageKey: string, config: AiConfig) => {
  try {
    // Save individual keys for backward compatibility
    localStorage.setItem("aiChatEnabled", config.enabled.toString())
    localStorage.setItem("aiChatOnboarded", config.onboarded.toString())
    localStorage.setItem("aiKeyMode", config.keyMode)
    localStorage.setItem("aiChatMode", config.chatMode)
    
    if (config.localKeys) {
      localStorage.setItem("aiProvider", config.localKeys.provider)
      localStorage.setItem("openRouterApiKey", config.localKeys.apiKey)
      localStorage.setItem("openRouterModel", config.localKeys.model)
      localStorage.setItem("openRouterMaxTokens", config.localKeys.maxTokens)
      if (config.localKeys.customEndpoint) {
        localStorage.setItem("aiCustomEndpoint", config.localKeys.customEndpoint)
      }
    }
    
    // Also save the complete config as JSON for easier future management
    localStorage.setItem(storageKey, JSON.stringify(config))
  } catch {
    // Unsupported
  }
}

const loadFromLS = (storageKey: string, defaultConfig: AiConfig): AiConfig => {
  if (isServer) return defaultConfig

  try {
    // Try to load from new JSON format first
    const savedConfig = localStorage.getItem(storageKey)
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig) as AiConfig
      // Merge with defaultConfig but KEEP enabled/onboarded from defaultConfig if they're explicitly set to true
      return {
        ...defaultConfig,
        ...parsed,
        // Override with defaultConfig if it has enabled/onboarded explicitly set
        enabled: defaultConfig.enabled || parsed.enabled,
        onboarded: defaultConfig.onboarded || parsed.onboarded,
      }
    }

    // Fallback to legacy individual keys for backward compatibility
    // If defaultConfig has enabled/onboarded set, use those, otherwise check localStorage
    const enabled = defaultConfig.enabled || localStorage.getItem("aiChatEnabled") === "true"
    const onboarded = defaultConfig.onboarded || localStorage.getItem("aiChatOnboarded") === "true"
    const keyMode = (localStorage.getItem("aiKeyMode") as KeyMode) || defaultConfig.keyMode
    const chatMode = (localStorage.getItem("aiChatMode") as ChatMode) || defaultConfig.chatMode

    const localKeys = keyMode === "local" ? {
      provider: localStorage.getItem("aiProvider") || "openrouter",
      apiKey: localStorage.getItem("openRouterApiKey") || "",
      model: localStorage.getItem("openRouterModel") || "openai/gpt-4o-mini",
      maxTokens: localStorage.getItem("openRouterMaxTokens") || "4000",
      customEndpoint: localStorage.getItem("aiCustomEndpoint") || undefined,
    } : undefined

    const config: AiConfig = {
      enabled,
      onboarded,
      keyMode,
      chatMode,
      localKeys,
    }

    // Migrate to new format
    saveToLS(storageKey, config)

    return config
  } catch {
    return defaultConfig
  }
}

const useAiConfig = () => {
  const context = React.useContext(AiConfigContext)
  if (context === undefined) {
    throw new Error("useAiConfig must be used within an AiConfigProvider")
  }
  return context
}

const AiConfigRoot = ({
  storageKey = "ai-config",
  defaultConfig: providedDefaults,
  children,
}: AiConfigProviderProps) => {
  const defaultConfig = React.useMemo(() => ({
    ...defaultAiConfig,
    ...providedDefaults,
  }), [providedDefaults])

  const [config, setConfigState] = React.useState<AiConfig>(() =>
    loadFromLS(storageKey, defaultConfig)
  )

  const setConfig = React.useCallback(
    (value: Partial<AiConfig> | ((prev: AiConfig) => Partial<AiConfig>)) => {
      if (typeof value === "function") {
        setConfigState((prevConfig) => {
          const updates = value(prevConfig)
          const newConfig = { ...prevConfig, ...updates }
          saveToLS(storageKey, newConfig)
          return newConfig
        })
      } else {
        setConfigState((prevConfig) => {
          const newConfig = { ...prevConfig, ...value }
          saveToLS(storageKey, newConfig)
          return newConfig
        })
      }
    },
    [storageKey]
  )

  // localStorage event handling for cross-tab synchronization
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== storageKey && !e.key?.startsWith("ai") && !e.key?.startsWith("openRouter")) {
        return
      }

      // Reload config from localStorage when it changes in another tab
      const newConfig = loadFromLS(storageKey, defaultConfig)
      setConfigState(newConfig)
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [storageKey, defaultConfig])

  // Prevent config access during hydration
  const [isHydrated, setIsHydrated] = React.useState(false)
  React.useEffect(() => {
    setIsHydrated(true)
  }, [])

  const providerValue = React.useMemo(
    () => ({
      config: isHydrated ? config : defaultConfig,
      setConfig,
      isHydrated,
    }),
    [config, setConfig, isHydrated, defaultConfig]
  )

  return (
    <AiConfigContext.Provider value={providerValue}>
      {children}
    </AiConfigContext.Provider>
  )
}

const AiConfigProvider = (props: AiConfigProviderProps) => {
  const context = React.useContext(AiConfigContext)

  // Ignore nested context providers, just passthrough children
  if (context) return <>{props.children}</>
  return <AiConfigRoot {...props} />
}

// Convenience hooks for common use cases
const useAiEnabled = () => {
  const { config } = useAiConfig()
  return config.enabled && config.onboarded
}

const useAiKeyMode = () => {
  const { config, setConfig } = useAiConfig()
  return {
    keyMode: config.keyMode,
    setKeyMode: (keyMode: KeyMode) => setConfig({ keyMode }),
  }
}

const useChatMode = () => {
  const { config, setConfig } = useAiConfig()
  return {
    chatMode: config.chatMode,
    setChatMode: (chatMode: ChatMode) => setConfig({ chatMode }),
  }
}

const useLocalKeys = () => {
  const { config, setConfig } = useAiConfig()
  return {
    localKeys: config.localKeys,
    setLocalKeys: (localKeys: LocalKeys) => setConfig({ localKeys }),
  }
}

// Legacy compatibility - matches your existing AiChatStorage interface
const AiChatStorageCompat = {
  getConfig: (): AiConfig => {
    return loadFromLS("ai-config", defaultAiConfig)
  },
  
  saveConfig: (updates: Partial<AiConfig>) => {
    const currentConfig = loadFromLS("ai-config", defaultAiConfig)
    const newConfig = { ...currentConfig, ...updates }
    saveToLS("ai-config", newConfig)
  }
}

export { 
  useAiConfig, 
  AiConfigProvider, 
  useAiEnabled, 
  useAiKeyMode, 
  useChatMode, 
  useLocalKeys,
  AiChatStorageCompat as AiChatStorage,
  type AiConfig,
  type KeyMode,
  type ChatMode,
  type LocalKeys,
}