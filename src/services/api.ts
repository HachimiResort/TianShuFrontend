import { config } from "@/config"
import type { ApiResponse } from "@/types"

class ApiService {
  private baseURL: string

  constructor() {
    this.baseURL = config.apiBaseUrl
  }

  /**
   * 核心请求方法
   * @param endpoint API 路径
   * @param options Fetch API 的配置选项
   * @returns Promise<ApiResponse<T>>
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const defaultHeaders = {
      "Content-Type": "application/json",
      // 如果有token，通常会在这里统一添加
      'Authorization': `Bearer ${localStorage.getItem("token")}` || ""
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      })

      // 处理 204 No Content 或其他无返回体的成功响应
      if (response.status === 204 || response.headers.get("content-length") === "0") {
        return response.ok 
          ? { success: true, data: {} as T } 
          : { success: false, error: `请求失败, 状态码: ${response.status}` }
      }

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "请求失败",
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "网络或解析错误",
      }
    }
  }

  /**
   * 发送 GET 请求
   * @param endpoint API 路径
   * @param options Fetch API 的配置选项
   */
  public get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    })
  }

  /**
   * 发送 POST 请求
   * @param endpoint API 路径
   * @param body 请求体数据
   * @param options Fetch API 的配置选项
   */
  public post<T>(endpoint: string, body: unknown, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  public put<T>(endpoint: string, body: unknown, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    })
  }

}

// 导出一个单例，在整个应用中共享使用
export const apiService = new ApiService()