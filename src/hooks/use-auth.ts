"use client"

import type { User } from "@/types"
import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import type { ApiResponse, UserInfoResponse } from "@/types";


export interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
  region: string
  phonenumber?: string
}

export interface RegisterResponse {
  code : number
  message : {
    error ?: string 
  }
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  code: number
  message : {
    userid: number
    access_token: string
    token_type: string
  }
}


export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (credentials: LoginRequest) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.post<LoginResponse>("/auth/login", credentials)
      console.log("Login response:", response)

      if (response.success && response.data?.code===0) {
        // setUser(response.data.code===)
        const token = `${response.data.message.access_token}`
        const userid = response.data.message.userid.toString() // 提取 userid 并转换为字符串
        console.log(token)
        localStorage.setItem("token", token)
        localStorage.setItem("userid", userid)
        return { success: true }
      } else {
        setError(response.error || "Login failed")
        return { success: false, error: response.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData: RegisterRequest) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.post<RegisterResponse>('/auth/register',userData)

      if (response.data && response.data.code===0) {
        // setUser(response.data.)
        return { success: true }
      } else {
        setError(response.error || "Registration failed")
        return { success: false, error: response.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("token")
  }

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
  }
}

export function useUserInfo(userid: string) {
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {

        const response: ApiResponse<UserInfoResponse> = await apiService.get<UserInfoResponse>(`/auth/users/${userid}`);

        if (response.success && response.data) {
          setUserInfo(response.data);
        } else {
          setError(response.error || "获取用户信息失败");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "获取用户信息失败";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [userid]);

  return { userInfo, loading, error };
}