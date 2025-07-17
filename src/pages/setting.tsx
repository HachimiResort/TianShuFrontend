"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChangePassword } from "@/components/auth/change-password";
import { DeviceManagement } from "@/components/auth/device-management";

export default function Setting() {
    const [activeTab, setActiveTab] = useState('changePassword');

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in-0 duration-500">
            {/* 页面标题 */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight transition-colors duration-300 ease-in-out">设置</h1>
                <p className="text-muted-foreground transition-colors duration-300 ease-in-out">管理系统设置</p>
            </div>

            {/* 顶栏设置选项 */}
            <div className="flex space-x-4">
                <Button
                    variant={activeTab === 'changePassword' ?  'default': 'outline'}
                    onClick={() => handleTabChange('changePassword')}
                >
                    修改密码
                </Button>
                <Button
                    variant={activeTab === 'deviceManagement' ? 'default': 'outline'}
                    onClick={() => handleTabChange('deviceManagement')}
                >
                    设备管理
                </Button>
            </div>

            {/* 根据激活的标签显示相应的设置界面 */}
            {activeTab === 'changePassword' && <ChangePassword />}
            {activeTab === 'deviceManagement' && <DeviceManagement />}

        </div>
    );
}