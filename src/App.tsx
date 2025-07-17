import { BrowserRouter } from "react-router-dom"
import { AppRouter } from "@/router"
import { ThemeProvider } from "@/components/theme-context"
import { Toaster } from "@/components/ui/toaster"
import "./index.css"
import { MapExample } from "./components/map/MapExample"

// function App() {
//   return (

//         <BrowserRouter>
//           <ThemeProvider>
//               <AppRouter />
//               <Toaster />
//           </ThemeProvider>
//         </BrowserRouter>

//   )
// }

function App() {
  return (
    <MapExample/>
  )
}




export default App
