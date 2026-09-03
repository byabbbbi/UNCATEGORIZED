import { StrictMode, useState, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LaunchScreen } from './components/LaunchScreen'

type LaunchMode = 'startFresh' | 'startContinue' | 'startDemo' | 'startDaily'

export function Bootstrap() {
  const [GameApp, setGameApp] = useState<ComponentType | null>(null)

  const launch = async (mode: LaunchMode) => {
    const [{ useGameStore }, { default: App }] = await Promise.all([
      import('./store/gameStore'),
      import('./App'),
    ])
    await useGameStore.getState()[mode]()
    setGameApp(() => App)
  }

  return GameApp ? <GameApp /> : <LaunchScreen onLaunch={launch} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
)
