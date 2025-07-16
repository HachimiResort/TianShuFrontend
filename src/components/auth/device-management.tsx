"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DeviceManagement() {
    return (
        <Card className="transition-all duration-300 ease-in-out">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 transition-colors duration-300 ease-in-out">
                    设备管理
                </CardTitle>
                <CardDescription className="transition-colors duration-300 ease-in-out">
                    管理您的设备
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground">
                    敬请期待...
                </div>
            </CardContent>
        </Card>
    );
}