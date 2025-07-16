"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { apiService } from "@/services/api.ts";



export function ChangePassword() {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showVerification, setShowVerification] = useState(false);
    const userid= localStorage.getItem("userid");

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            toast({
                description: "请填写所有字段",
                variant: "destructive",
                duration: 2000,
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({
                description: "新密码和确认密码不匹配",
                variant: "destructive",
                duration: 2000,
            });
            return;
        }

        if (!userid) {
            toast({
                description: "未获取到用户 ID",
                variant: "destructive",
                duration: 2000,
            });
            return;
        }

        const body = {
            "user_id": parseInt(userid),
            "old_password": oldPassword,
            "new_password": newPassword,
            "confirm_password": confirmPassword
        };

        try {
            const response = await apiService.post(`/auth/users/${userid}/updatePasswordRequire`, body);
            console.log("response", response);
            if (response.success) {
                const responseData = response.data as { code: number; message: { msg: string } };
                if (responseData.code === 0) {
                    toast({
                    description: "验证码已发送到邮箱，请在5分钟内输入验证码",
                    variant: "success",
                    duration: 4000,
                });

                    setShowVerification(true);
                }
                if(responseData.message.msg=="旧密码错误"){
                    toast({
                        description: "旧密码错误！",
                        variant: "destructive",
                        duration: 2000,
                    });
                }
                if(responseData.message.msg=="新密码不能与旧密码相同"){
                    toast({
                        description: "新密码不能与旧密码相同！",
                        variant: "destructive",
                        duration: 2000,
                    });
                }
            } else {
                toast({
                    description: response.error || "网络请求失败!",
                    variant: "destructive",
                    duration: 2000,
                });
            }
        } catch (error) {
            toast({
                description: "网络请求失败!",
                variant: "destructive",
                duration: 2000,
            });
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode) {
            toast({
                description: "请输入验证码!",
                variant: "destructive",
                duration: 2000,
            });
            return;
        }

        if (!userid) {
            toast({
                description: "未获取到用户ID",
                variant: "destructive",
                duration: 2000,
            });
            return;
        }

        try {
            const verifyBody = {
                "user_id": parseInt(userid),
                "code": verificationCode
            };
            const verifyResponse = await apiService.post(`/auth/users/${userid}/updatePasswordConfirm`, verifyBody);
            console.log("verifyResponse",verifyResponse)
            if (verifyResponse.success) {
                const verifyResponseData = verifyResponse.data as { code: number; message: { msg: string } };
                if(verifyResponseData.code==0){
                    toast({
                        description: "修改密码成功!",
                        variant: "success",
                        duration: 2000,
                    });
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setVerificationCode('');
                    setShowVerification(false);
                }
                if(verifyResponseData.message.msg=="验证码错误"){
                    toast({
                        description: "验证码错误!",
                        variant: "destructive",
                        duration: 2000,
                    });
                }
                if(verifyResponseData.message.msg=="验证码已过期或未请求修改"){
                    toast({
                        description: "验证码已过期!",
                        variant: "destructive",
                        duration: 2000,
                    });
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setVerificationCode('');
                    setShowVerification(false);
                }

            } else {
                toast({
                    description: verifyResponse.error || "验证码验证失败",
                    variant: "destructive",
                    duration: 2000,
                });
            }
        } catch (error) {
            toast({
                description: "网络请求失败",
                variant: "destructive",
                duration: 2000,
            });
        }
    };

    return (
        <Card className="transition-all duration-300 ease-in-out">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 transition-colors duration-300 ease-in-out">
                    修改密码
                </CardTitle>
                <CardDescription className="transition-colors duration-300 ease-in-out">
                    修改您的账户密码
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="oldPassword">旧密码</Label>
                        <Input
                            id="oldPassword"
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="请输入旧密码"
                            className="transition-colors duration-300"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">新密码</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="请输入新密码"
                            className="transition-colors duration-300"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">确认密码</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="请再次输入新密码"
                            className="transition-colors duration-300"
                        />
                    </div>
                    {showVerification && (
                        <div className="space-y-2">
                            <Label htmlFor="verificationCode">验证码</Label>
                            <div className="flex">
                                <Input
                                    id="verificationCode"
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    placeholder="请输入验证码"
                                    className="transition-colors duration-300 flex-1"
                                />
                                <Button type="button" onClick={handleVerifyCode} className="ml-2">
                                    验证
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <Button type="button" onClick={handleChangePassword} className="mt-4">
                    确认修改
                </Button>
            </CardContent>
        </Card>
    );
}