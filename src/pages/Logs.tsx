"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { apiService } from "@/services/api"

// 日志数据类型定义
interface LogData {
    user_access_log_id: number
    user_id: number
    ip: string
    ua: string
    url: string
    method: string
    status_code: number
    response_code: number
    access_time: string
    duration_ms: number
}

interface LogsApiResponse {
    code: number
    message: {
        logs: LogData[];
    };
    total: number
    total_pages: number
    page: number
    page_size: number
}

export default function LogsPage() {
    const { toast } = useToast()

    // 状态管理
    const [logs, setLogs] = useState<LogData[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [totalPages, setTotalPages] = useState(1)
    const [totalRecords, setTotalRecords] = useState(0)
    const [user_id, setUserId] = useState("")
    const [ip, setIp] = useState("")
    const [start_time, setStartTime] = useState("")
    const [end_time, setEndTime] = useState("")
    const [method, setMethod] = useState("GET")

    // 显示提示消息
    const showToast = useCallback(
        (message: string, variant: "default" | "destructive" | "success" = "default") => {
            toast({
                title: variant === "destructive" ? "错误" : variant === "success" ? "成功" : "提示",
                description: message,
                variant: variant === "destructive" ? "destructive" : variant === "success" ? "success" : "default",
            })
        },
        [toast],
    )

    // 获取日志列表
    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            // 添加page参数到URL，并处理空参数
            let urlParams = `page=${currentPage}&page_size=${pageSize}`;
            if (user_id) {
                urlParams += `&user_id=${user_id}`;
            }
            if (ip) {
                urlParams += `&ip=${ip}`;
            }
            if (method) {
                urlParams += `&action=${method}`;
            }
            if (start_time) {
                urlParams += `&start_time=${start_time}`;
            }
            if (end_time) {
                urlParams += `&end_time=${end_time}`;
            }
            console.log(`/auth/user-logs?${urlParams}`)

            const response = await apiService.get<LogsApiResponse>(
                `/auth/user-logs?${urlParams}`
            );

            if (response.success && response.data) {
                console.log("response",response)
                if (response.data.code === 0) {
                    const logData = response.data.message.logs
                    setLogs(logData)
                    // 使用API返回的分页信息
                    setTotalPages(response.data.total_pages)
                    setTotalRecords(response.data.total)
                    // 确保当前页码与API返回的页码一致
                    setCurrentPage(response.data.page)
                    setPageSize(response.data.page_size)

                    showToast("获取日志数据成功", "success")
                } else {
                    showToast("获取日志数据失败", "destructive")
                }
            } else {
                showToast(response.error || "获取日志数据失败", "destructive")
            }
        } catch (error) {
            showToast("网络请求失败", "destructive")
        } finally {
            setLoading(false)
        }
    }, [showToast, user_id, ip, start_time, end_time, method, currentPage, pageSize])

    // 页面切换
    const handlePageChange = useCallback((page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page)
        }
    }, [totalPages])

    // 点击查看按钮
    const handleSearch = useCallback(() => {
        setCurrentPage(1)
        fetchLogs() // 搜索时主动触发数据获取
    }, [fetchLogs])

    // 监听currentPage变化，重新获取数据
    useEffect(() => {
        console.log("currentPage发生变化：",currentPage,"执行fetchLogs")
        fetchLogs(); // 监听 currentPage 变化，触发数据请求
    }, [currentPage]);


    useEffect(() => {
        console.log('状态变化检测:');
        console.log('logs:', logs);
        console.log('totalPages:', totalPages);
        console.log('totalRecords:', totalRecords);
        console.log('currentPage:', currentPage);
        console.log('pageSize:', pageSize);
    }, [logs, totalPages, totalRecords, currentPage]);

    return (
        <div className="p-6 space-y-6 animate-in fade-in-0 duration-500">
            {/* 页面标题 */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight transition-colors duration-300 ease-in-out">日志查看</h1>
                <p className="text-muted-foreground transition-colors duration-300 ease-in-out">查看系统运行日志</p>
            </div>

            {/* 日志列表卡片 */}
            <Card className="transition-all duration-300 ease-in-out">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 transition-colors duration-300 ease-in-out">
                        日志列表
                    </CardTitle>
                </CardHeader>

                {/* 搜索条件区域 */}
                <CardContent className="border-b">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-shrink-0 space-x-2">
                            <Label htmlFor="user_id" className="whitespace-nowrap flex items-center">用户ID</Label>
                            <Input
                                id="user_id"
                                type="text"
                                value={user_id}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="请输入用户ID"
                                className="flex-grow"
                            />
                        </div>
                        <div className="flex flex-shrink-0 space-x-2">
                            <Label htmlFor="ip" className="whitespace-nowrap flex items-center">IP地址</Label>
                            <Input
                                id="ip"
                                type="text"
                                value={ip}
                                onChange={(e) => setIp(e.target.value)}
                                placeholder="请输入IP地址"
                                className="flex-grow"
                            />
                        </div>
                        <div className="flex flex-shrink-0 space-x-2">
                            <Label htmlFor="start_time" className="whitespace-nowrap flex items-center">开始时间</Label>
                            <Input
                                id="start_time"
                                type="text"
                                value={start_time}
                                onChange={(e) => setStartTime(e.target.value)}
                                placeholder="YYYY-MM-DD HH:MM:SS"
                                className="flex-grow"
                            />
                        </div>
                        <div className="flex flex-shrink-0 space-x-2">
                            <Label htmlFor="end_time" className="whitespace-nowrap flex items-center">结束时间</Label>
                            <Input
                                id="end_time"
                                type="text"
                                value={end_time}
                                onChange={(e) => setEndTime(e.target.value)}
                                placeholder="YYYY-MM-DD HH:MM:SS"
                                className="flex-grow"
                            />
                        </div>
                        <div className="flex flex-shrink-0 space-x-2">
                            <Label htmlFor="method" className="whitespace-nowrap flex items-center">请求方法</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger className="flex-grow">
                                    <span>{method}</span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                    <SelectItem value="DELETE">DELETE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                        <Button type="button" onClick={handleSearch}>
                            <ChevronRight className="w-4 h-4 mr-2" />
                            查看日志
                        </Button>
                    </div>
                </CardContent>

                {/* 日志表格区域 */}
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-muted-foreground transition-colors duration-300 ease-in-out">加载中...</div>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="transition-colors duration-300 ease-in-out">日志ID</TableHead>
                                            <TableHead className="transition-colors duration-300 ease-in-out">用户ID</TableHead>
                                            <TableHead className="transition-colors duration-300 ease-in-out">IP地址</TableHead>
                                            <TableHead className="transition-colors duration-300 ease-in-out">用户代理</TableHead>
                                            <TableHead className="transition-colors duration-300 ease-in-out">请求URL</TableHead>
                                            <TableHead className="transition-colors duration-300 ease-in-out">请求方法</TableHead>
                                            <TableHead className="transition-colors duration-300 ease-in-out">状态码</TableHead>
                                            <TableHead className="transition-colors duration-300 ease-in-out">响应码</TableHead>
                                            <TableHead className="transition-colors duration-300 ease-in-out">访问时间</TableHead>
                                            <TableHead className="transition-colors duration-300 ease-in-out">响应时间(ms)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.user_access_log_id}>
                                                <TableCell>{log.user_access_log_id}</TableCell>
                                                <TableCell>{log.user_id}</TableCell>
                                                <TableCell>{log.ip}</TableCell>
                                                <TableCell className="truncate max-w-[150px]">{log.ua}</TableCell>
                                                <TableCell className="truncate max-w-[200px]">{log.url}</TableCell>
                                                <TableCell>{log.method}</TableCell>
                                                <TableCell>{log.status_code}</TableCell>
                                                <TableCell>{log.response_code}</TableCell>
                                                <TableCell>{log.access_time}</TableCell>
                                                <TableCell>{log.duration_ms}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* 无数据提示 */}
                            {logs.length === 0 && (
                                <div className="py-8 text-center text-muted-foreground">
                                    暂无日志数据
                                </div>
                            )}
                        </>
                    )}
                </CardContent>

                {/* 分页信息 */}
                <div className="flex flex-col md:flex-row justify-between p-4 border-t">
                    {loading ? (
                        <p className="mb-2 md:mb-0">加载中...</p>
                    ) : totalRecords > 0 ? (
                        <p className="mb-2 md:mb-0">
                            显示第 {((currentPage - 1) * pageSize) + 1} 到 {Math.min(currentPage * pageSize, totalRecords)} 条，共 {totalRecords} 条记录
                        </p>
                    ) : (
                        <p className="mb-2 md:mb-0">暂无记录</p>
                    )}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            上一页
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            下一页
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}