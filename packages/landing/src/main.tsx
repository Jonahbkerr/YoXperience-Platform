import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { YoXperienceProvider } from './lib/yoxperience'
import { App } from './App'
import './index.css'

// Dogfooding: the YoXperience landing runs on YoXperience. Same anonymous-id
// convention as customer sites — stable per browser via localStorage.
function anonymousId(): string {
  const KEY = 'yxp_anon_id'
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = 'anon_' + crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'anon_session'
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <YoXperienceProvider
        apiBaseUrl="https://gateway-one-wheat.vercel.app"
        publishableKey="yxp_pk_tQIMJg8MjdXN8tcqP3CfbyimrAnAUQOr"
        userId={anonymousId()}
      >
        <App />
      </YoXperienceProvider>
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>,
)