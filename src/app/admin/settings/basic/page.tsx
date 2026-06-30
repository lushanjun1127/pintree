"use client";

import { useState, useEffect } from "react";
import { toast, Toaster } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminHeader } from "@/components/admin/header";

import { useSettingImages } from "@/hooks/useSettingImages";
import { updateSettingImage } from "@/actions/update-setting-image";

import { Skeleton } from "@/components/ui/skeleton";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useRouter } from "next/navigation";

import { revalidateData } from "@/actions/revalidate-data";

// 删除国际化相关导入
// import { useTranslation } from "@/hooks/useTranslation";

const defaultSettings = {
  websiteName: "",
  siteUrl: "",
  description: "",
  keywords: "",
  copyrightText: "© 2024 Pintree. All rights reserved.",
  contactEmail: "",
  githubUrl: "",
  twitterUrl: "",
  logoUrl: "",
  faviconUrl: "",
  googleAnalyticsId: "",
  clarityId: "",
};

export default function BasicSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/settings?group=basic');
        if (!response.ok) {
          throw new Error('Failed to load settings');
        }
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      } catch (error) {
        toast.error("加载设置失败");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const saveSettingPromises = [];

      // 保存基本设置
      saveSettingPromises.push(
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            websiteName: settings.websiteName,
            siteUrl: settings.siteUrl,
            description: settings.description,
            keywords: settings.keywords,
            copyrightText: settings.copyrightText,
            contactEmail: settings.contactEmail,
            githubUrl: settings.githubUrl,
            twitterUrl: settings.twitterUrl,
            logoUrl: settings.logoUrl,
            faviconUrl: settings.faviconUrl,
          }),
        })
      );

      // 保存统计设置
      saveSettingPromises.push(
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleAnalyticsId: settings.googleAnalyticsId,
            clarityId: settings.clarityId,
          }),
        })
      );

      // 等待所有设置保存完成
      await Promise.all(saveSettingPromises);

      // 重新验证数据
      await revalidateData('settings');

      toast.success("设置保存成功");
    } catch (error) {
      toast.error("保存设置失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <AdminHeader title="基础设置" />
      <Toaster position="top-center" />

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-4/5 grid-cols-4">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="statistics">统计代码</TabsTrigger>
            <TabsTrigger value="footerSettings">页脚设置</TabsTrigger>
            <TabsTrigger value="socialMedia">社交媒体</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card className="border bg-white">
              <CardHeader className="border-b">
                <CardTitle>网站信息</CardTitle>
                <CardDescription>设置您的网站基本信息</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 p-6">
                <div className="grid gap-2">
                  <Label htmlFor="websiteName">网站名称</Label>
                  <Input
                    id="websiteName"
                    name="websiteName"
                    value={settings.websiteName}
                    onChange={handleChange}
                    placeholder="请输入您的网站名称"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="siteUrl">网站URL</Label>
                  <Input
                    id="siteUrl"
                    name="siteUrl"
                    value={settings.siteUrl}
                    onChange={handleChange}
                    placeholder="https://yoursite.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">网站描述</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={settings.description}
                    onChange={handleChange}
                    placeholder="输入网站描述"
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="keywords">关键词</Label>
                  <Input
                    id="keywords"
                    name="keywords"
                    value={settings.keywords}
                    onChange={handleChange}
                    placeholder="输入关键词，以逗号分隔"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="copyrightText">版权文本</Label>
                  <Input
                    id="copyrightText"
                    name="copyrightText"
                    value={settings.copyrightText}
                    onChange={handleChange}
                    placeholder="输入版权信息"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>网站Logo</Label>
                  <LogoUploader />
                </div>

                <div className="grid gap-2">
                  <Label>网站图标</Label>
                  <FaviconUploader />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-normal">
                统计代码
              </p>
              <Card className="border bg-white">
                <CardHeader className="border-b">
                  <CardTitle>统计代码</CardTitle>
                  <CardDescription>设置您网站的统计代码</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 p-6">
                  <div className="grid gap-2">
                    <Label htmlFor="googleAnalyticsId">
                      Google Analytics ID
                    </Label>
                    <Input
                      id="googleAnalyticsId"
                      name="googleAnalyticsId"
                      value={settings.googleAnalyticsId}
                      onChange={handleChange}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="clarityId">Microsoft Clarity ID</Label>
                    <Input
                      id="clarityId"
                      name="clarityId"
                      value={settings.clarityId}
                      onChange={handleChange}
                      placeholder="XXXXXXXXXX"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="footerSettings">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-normal">
                页脚设置
              </p>
              <FooterSettingsCard
                settings={settings}
                handleChange={handleChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="socialMedia">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-normal">
                社交媒体链接
              </p>
              <SocialMediaCard
                settings={settings}
                handleChange={handleChange}
              />
            </div>
          </TabsContent>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
}

// 添加 Logo 上传组件
function LogoUploader() {
  const { images, isLoading, error } = useSettingImages("logoUrl");
  const [currentLogoUrl, setCurrentLogoUrl] = useState("");
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      
      // 立即显示预览
      setCurrentLogoUrl(base64);
    };
    
    reader.readAsDataURL(file);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="relative w-[260px] h-[60px] border rounded bg-white">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          ) : (
            <Image
              src={currentLogoUrl || images[0].url}
              alt="Current Logo"
              fill
              className="object-contain p-2"
              unoptimized={true}
            />
          )}
        </div>
        <Input
          id="logoUrl"
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="max-w-[200px] bg-slate-100"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        推荐尺寸：20x120px，支持PNG、JPG格式
      </p>
    </div>
  );
};

function FaviconUploader() {
  const { images, isLoading, error } = useSettingImages("faviconUrl");
  const [currentFaviconUrl, setCurrentFaviconUrl] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const base64 = event.target?.result as string;

      // 立即显示预览
      setCurrentFaviconUrl(base64);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {isLoading ? (
          <div className="relative w-[32px] h-[32px] border rounded bg-white">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <div className="relative w-[32px] h-[32px] border rounded bg-white">
            <Image
              src={currentFaviconUrl || images[0].url}
              alt="Current Favicon"
              fill
              className="object-contain p-1"
              unoptimized={true}
            />
          </div>
        )}
        <Input
          id="faviconUrl"
          type="file"
          accept=".ico,.png"
          onChange={handleFileChange}
          className="max-w-[200px] bg-slate-100"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        推荐尺寸：12x512px，支持ICO、PNG格式
      </p>
    </div>
  );
};

// 导入缺少的Textarea组件
import { Textarea } from "@/components/ui/textarea";

// 导入缺少的组件
import FooterSettingsCard from "./FooterSettingsCard";
import SocialMediaCard from "./SocialMediaCard";