import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import { Game } from './screens/Game'
import { Landing } from './screens/Landing'


function App() {

  return (
    <div className="h-screen bg-slate-950">
      <Routes>
        <Route path="/" element={<Landing  />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </div>
  )
}

export default App
