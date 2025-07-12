import { BrowserRouter } from "react-router-dom"
import { AppRouter } from "@/router"
import { ThemeProvider } from "@/components/theme-context"
// import { MapExample } from "@/components/map/MapExample"
import "./index.css"

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </BrowserRouter>
  )
}

// function App() {
//   return (
//     <MapExample />
//   )
// }


export default App
