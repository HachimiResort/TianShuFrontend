"use client"
// import { MapLocation } from "@/components/map/MapLocation"
import { MapTest } from "@/components/map/MapTest"
import { ToastProvider } from "@/components/ui/toast"


export default function LocationPage() {
    return (
        // <MapLocation></MapLocation>
        <ToastProvider>
            {/* <MapLocation></MapLocation> */}
            <MapTest></MapTest>
        </ToastProvider>
        
    )
}
