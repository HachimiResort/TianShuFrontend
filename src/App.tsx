import { BrowserRouter } from "react-router-dom"
import { AppRouter } from "@/router"
import { ThemeProvider } from "@/components/theme-context"
import { Toaster } from "@/components/ui/toaster"
import "./index.css"

function App() {
  return (
      <div>
          <BrowserRouter>
              <ThemeProvider>
                  <AppRouter />
                  <Toaster />
              </ThemeProvider>
          </BrowserRouter>
          <Toaster />
      </div>

  )
}

export default App
