"use client";

import { useState, useEffect } from 'react';
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminHeader } from "@/components/admin/header";
import { revalidateData } from "@/actions/revalidate-data";

const defaultSettings = {
  // websiteName: "",
  description: "",
  keywords: "",
  siteUrl: "",
};

export default function SeoSettingsPage() {
  // Removed translation hook, using hardcoded Chinese text
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/settings?group=seo');
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
    
    // 验证网站 URL 格式
    try {
      if (settings.siteUrl) {
        if (!settings.siteUrl.startsWith('http://') && !settings.siteUrl.startsWith('https://')) {
          throw new Error('网站URL必须以http://或https://开头');
        }
        
        // 验证URL格式
        new URL(settings.siteUrl);
      } else {
        throw new Error('请输入网站URL');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '网站URL格式不正确');
      return;
    }

    try {
      setLoading(true);
      const saveSettingPromises = [];

      // 添加基本设置保存到 saveSettingPromises
      saveSettingPromises.push(
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...settings,
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
      <AdminHeader title="SEO设置" />
      <Toaster position="top-center" />

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card className="border bg-white">
            <CardHeader className="border-b">
              <CardTitle>SEO设置</CardTitle>
              <CardDescription>配置您的网站SEO信息</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 p-6">
              {/* <div className="grid gap-2">
                <label htmlFor="websiteName" className="font-medium">
                  网站标题
                </label>
                <Input
                  id="websiteName"
                  name="websiteName"
                  value={settings.websiteName}
                  onChange={handleChange}
                  placeholder="Enter website title"
                />
              </div> */}

              <div className="grid gap-2">
                <label htmlFor="description" className="font-medium">
                  网站描述
                </label>
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
                <label htmlFor="keywords" className="font-medium">
                  关键词
                </label>
                <Input
                  id="keywords"
                  name="keywords"
                  value={settings.keywords}
                  onChange={handleChange}
                  placeholder="输入关键词，以逗号分隔"
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="siteUrl" className="font-medium">
                  网站URL
                </label>
                <Input
                  id="siteUrl"
                  name="siteUrl"
                  value={settings.siteUrl}
                  onChange={handleChange}
                  placeholder="https://yoursite.com"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}