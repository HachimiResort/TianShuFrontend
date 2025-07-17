"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiService } from "@/services/api.ts";
import { toast } from "@/components/ui/use-toast.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// 设备数据类型定义
interface DeviceData {
    "device_id": string,
    "user_web_device_name": string,
    "last_used_login_time": number,
    "last_used_login_ip": string,
    "last_used_login_ua": string
}

// 设备 API 响应类型定义
interface DeviceApiResponse {
    code: number
    message: {
        "devices": DeviceData[]
    };
}

// 分页配置
const ITEMS_PER_PAGE = 20;

export function DeviceManagement() {
    // 状态管理
    const [devices, setDevices] = useState<DeviceData[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    // 显示提示消息
    const showToast = useCallback(
        (message: string, variant: "default" | "destructive" | "success" = "default") => {
            toast({
                title: variant === "destructive" ? "错误" : variant === "success" ? "成功" : "提示",
                description: message,
                variant: variant === "destructive" ? "destructive" : variant === "success" ? "success" : "default",
            });
        },
        [toast]
    );

    // 获取设备列表
    const getDevices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiService.get<DeviceApiResponse>(`/auth/users/me/web-devices`);
            console.log("response", response);
            if (response.success) {
                const deviceData = response.data?.message.devices || [];
                setDevices(deviceData);
                setTotalPages(Math.ceil(deviceData.length / ITEMS_PER_PAGE));
            } else {
                showToast("获取设备数据失败", "destructive");
            }
        } catch (error) {
            showToast("网络请求失败!", "destructive");
        } finally {
            setLoading(false);
        }
    }, [showToast]);







    // 获取当前页的设备数据
    const getCurrentPageDevices = useCallback(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;

        return devices.slice(startIndex, endIndex);
    }, [devices, currentPage]);

    // 页面切换
    const handlePageChange = useCallback((page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    }, [totalPages]);

    // 组件挂载时获取数据
    useEffect(() => {
        getDevices();
    }, [getDevices]);

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
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="text-muted-foreground transition-colors duration-300 ease-in-out">加载中...</div>
                    </div>
                ) : (
                    <>
                        {/* 设备表格 */}
                        <div className="rounded-md border transition-colors duration-300 ease-in-out">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="transition-colors duration-300 ease-in-out">设备ID</TableHead>
                                        <TableHead className="transition-colors duration-300 ease-in-out">最后使用登录时间</TableHead>
                                        <TableHead className="transition-colors duration-300 ease-in-out">最后使用登录IP</TableHead>
                                        <TableHead className="transition-colors duration-300 ease-in-out">最后使用登录UA</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {getCurrentPageDevices().map((device) => (
                                        <TableRow key={device.device_id}>
                                            <TableCell>{device.device_id}</TableCell>
                                            <TableCell>{new Date(device.last_used_login_time).toLocaleString()}</TableCell>
                                            <TableCell>{device.last_used_login_ip}</TableCell>
                                            <TableCell>{device.last_used_login_ua}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {/* 分页导航 */}
                        <div className="flex justify-center mt-4">
                            <Button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                上一页
                            </Button>
                            <span className="mx-4">
                                第 {currentPage} 页，共 {totalPages} 页
                            </span>
                            <Button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                下一页
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}