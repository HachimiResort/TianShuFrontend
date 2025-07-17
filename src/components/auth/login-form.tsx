"use client"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { User, Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "@/components/ui/use-toast"
import { apiService } from "@/services/api.ts"
import type { ApiResponse } from "@/types"
import { config } from "@/config"

interface LoginFormProps {
  onSwitchToRegister: () => void
}

export interface LoginResponse {
  code: number
  message: {
    userid: number
    access_token: string
    token_type: string
  }
}

interface CaptchaIDData {
  "code": number,
  "message": {
    "captcha_id": string
    , "image_url": string
  }
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [captcha_id, setCaptcha_id] = useState("");
  const [captchaImageUrl, setCaptchaImageUrl] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captcha_code, setCaptchaCode] = useState("");

  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username) {
      toast({
        description: "请填写用户名！",
        variant: "destructive",
        duration: 2000,
      })
      return
    }
    if (!formData.password) {
      toast({
        description: "请填写密码！",
        variant: "destructive",
        duration: 2000,
      })
      return
    }

    const response = await login(formData);
    const result: ApiResponse<LoginResponse> =
        'success' in response && response.data !== null
            ? response
            : {
              success: false,
              data: { code: -1, message: { userid: 0, access_token: '', token_type: '' } },
              error: response.error || 'Login failed'
            };
    console.log("result", result)

    if (result.success) {
      if (result.data?.code == 0) {
        toast({
          description: "登录成功！",
          variant: "success",
          duration: 2000,
        })
        // 登陆成功页面跳转
        navigate("/profile")
      }
      if (result.data?.code == 110) {
        toast({
          description: "请先前往邮箱验证！",
          variant: "destructive",
          duration: 4000,
        })
      }
      if (result.data?.code == 109) {
        setShowCaptcha(true);
        getCaptchaId()
            .then((captchaId) => getCaptcha(captchaId))
            .catch((error) => {
              console.error("获取验证码流程出错:", error);
              // 可以在这里添加更多错误处理逻辑，比如重置页面状态等
            });
        toast({
          description: "请先进行验证！",
          variant: "destructive",
          duration: 4000,
        })
      }
    } else {
      toast({
        description: result.error || "登录失败！",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCaptchaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaptchaCode(e.target.value);
  }

  const loginAndCheck = async () => {
    try {
      const response = await apiService.post<LoginResponse>(`/auth/complex-login?captcha_id=${captcha_id}&captcha_code=${captcha_code}`, formData);
      console.log("loginAndCheck-response", response);
      if (response.success && response.data?.code == 0) {
        toast({
          description: "验证成功!",
          variant: "success",
          duration: 2000,
        });
        const token = `${response.data?.message.access_token}`
        const userid = response.data?.message.userid.toString()

        localStorage.setItem("token", token)
        localStorage.setItem("userid", userid)
        navigate("/profile")
      } else {
        // 验证失败，重置相关状态
        setCaptchaCode("");
        setShowCaptcha(false);
        setCaptchaImageUrl(null);
        toast({
          description: "验证失败，请检查输入信息后重新尝试！",
          variant: "destructive",
          duration: 2000,
        });
      }
    } catch (error) {
      toast({
        description: "网络请求失败!",
        variant: "destructive",
        duration: 2000,
      })
    }
  };

  const getCaptchaId = async () => {
    try {
      const response = await apiService.get<CaptchaIDData>(`/auth/captcha`);
      console.log("response", response);
      if (response.success) {
        const captchaId = response.data?.message.captcha_id;
        if (captchaId) {
          setCaptcha_id(captchaId);
          return captchaId;
        }
      }
    } catch (error) {
      toast({
        description: "网络请求失败!",
        variant: "destructive",
        duration: 2000,
      });
    }
    return null;
  };

  const getCaptcha = async (captchaId: string | null) => {
    if (!captchaId) {
      toast({
        description: "captcha_id 无效，无法获取验证码图片!",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    try {
      const response = await fetch(config.apiBaseUrl + `/auth/captcha/${captchaId}`);
      const blob = await response.blob();
      console.log("blob", blob);
      const imageUrl = URL.createObjectURL(blob);
      setCaptchaImageUrl(imageUrl);
    } catch (error) {
      toast({
        description: "验证码图片获取失败！",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  return (
      <>
        <Card className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground shadow-xl">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">欢迎回来</h2>
            <p className="text-muted-foreground">请登录您的账户</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="pl-10"

                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">用户名</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10"

                />
              </div>
            </div>

            {showCaptcha && (
                <div className="space-y-2">
                  <Label htmlFor="captcha">验证码</Label>
                  <div className="relative">
                    <Input
                        id="captcha"
                        name="captcha"
                        type="text"
                        placeholder="请输入验证码"
                        value={captcha_code}
                        onChange={handleCaptchaChange}
                        className="pl-10"
                    />
                  </div>
                  {/* 图片移至输入框下方 */}
                  <div className="flex justify-center mt-1">
                    {captchaImageUrl && (
                        <img
                            src={captchaImageUrl}
                            alt="验证码"
                            className="h-10 w-auto object-contain cursor-pointer"
                            onClick={getCaptchaId}
                        />
                    )}
                  </div>
                </div>
            )}

            <Button type="button" className="w-full" disabled={loading} onClick={showCaptcha? loginAndCheck : handleSubmit}>
              {loading? (showCaptcha? "验证中..." : "登录中...") : (showCaptcha? "验证并登录" : "登录")}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              还没有账户？{" "}
              <button type="button" onClick={onSwitchToRegister} className="text-primary hover:underline font-medium">
                立即注册
              </button>
            </p>
          </div>
        </Card>
      </>
  )
}