import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initFirebase } from './firebase'
import { ThemeProvider } from './context/ThemeContext'
import './styles/themes.css'

initFirebase()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find root element to mount to')
}

const root = ReactDOM.createRoot(rootElement)
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
