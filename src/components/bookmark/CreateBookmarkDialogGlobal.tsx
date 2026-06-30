"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronsUpDown, Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Collection {
  id: string;
  name: string;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;  // 添加 parentId
  displayName?: string;     // 添加 displayName
}

interface CreateBookmarkDialogGlobalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCollectionId?: string;
  defaultFolderId?: string;
  onSuccess?: (folderId?: string) => void;
}

interface UrlInfo {
  title: string;
  description: string;
  icon: string;
  icons: string[];
  error?: string;
}

export default function CreateBookmarkDialogGlobal({
  open,
  onOpenChange,
  defaultCollectionId,
  defaultFolderId,
  onSuccess
}: CreateBookmarkDialogGlobalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");  // 添加错误状态
  const [collections, setCollections] = useState<Collection[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    icon: "",
    collectionId: defaultCollectionId || "",
    folderId: defaultFolderId || "none",
    folderName: "", // 新增
    isFeatured: false,
    sortOrder: 0
  });

  // 添加新的状态
  const [hasLoadedInfo, setHasLoadedInfo] = useState(false);

  // 添加 availableIcons 状态
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);

  // 修改 useEffect，当对话框关闭时重置所有状态
  useEffect(() => {
    if (!open) {
      setHasLoadedInfo(false);
      setError("");
      setFormData({
        title: "",
        url: "",
        description: "",
        icon: "",
        collectionId: defaultCollectionId || "",
        folderId: defaultFolderId || "none",
        folderName: "",
        isFeatured: false,
        sortOrder: 0
      });
    }
  }, [open, defaultCollectionId, defaultFolderId]);

  // 初始化时获取集合列表
  useEffect(() => {
    fetchCollections();
  }, []);

  // 当 collectionId 变化时获取文件夹列表
  useEffect(() => {
    if (formData.collectionId) {
      fetchFolders(formData.collectionId);
    }
  }, [formData.collectionId]);

  // 当默认值改变时更新表单
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      collectionId: defaultCollectionId || "",
      folderId: defaultFolderId || "none"
    }));
  }, [defaultCollectionId, defaultFolderId]);

  // 在 useEffect 中设置默认文件夹名称
  useEffect(() => {
    if (defaultFolderId) {
      const folder = folders.find(f => f.id === defaultFolderId);
      if (folder) {
        setFormData(prev => ({
          ...prev,
          folderName: folder.name
        }));
      }
    }
  }, [defaultFolderId, folders]);

  // 在组件内部，我们将使用 props 中的 open 和 onOpenChange，而不是创建新的状态
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");  // 重置错误信息

    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          folderId: formData.folderId === "none" ? null : formData.folderId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Create failed");
        return;
      }

      onOpenChange(false);
      onSuccess?.(formData.folderId === "none" ? undefined : formData.folderId);
      
      // 重置表单
      setFormData({
        title: "",
        url: "",
        description: "",
        icon: "",
        collectionId: defaultCollectionId || "",
        folderId: defaultFolderId || "none",
        folderName: "", // 新增
        isFeatured: false,
        sortOrder: 0
      });
    } catch (error) {
      console.error("Create bookmark failed:", error);
      setError("Create bookmark failed, please try again");
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await fetch("/api/collections");
      const data = await response.json();
      setCollections(data.collections || data);
    } catch (error) {
      console.error("Failed to fetch collections:", error);
    }
  };

  const fetchFolders = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/folders`);
      const data = await response.json();
      setFolders(data.folders || data);
    } catch (error) {
      console.error("Failed to fetch folders:", error);
      setFolders([]);
    }
  };

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, url }));

    if (url && /^https?:\/\/.+/.test(url)) {
      try {
        const response = await fetch(`/api/url-info?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const info = await response.json();
          setFormData(prev => ({
            ...prev,
            title: prev.title || info.title || "",
            description: prev.description || info.description || "",
            icon: prev.icon || info.icon || ""
          }));
          setAvailableIcons(info.icons || []);
          setHasLoadedInfo(true);
        }
      } catch (err) {
        console.error("Failed to fetch URL info:", err);
      }
    }
  };

  const handleCollectionChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      collectionId: value,
      folderId: "none", // 更改集合时重置文件夹选择
      folderName: ""    // 重置文件夹名称
    }));
  };

  const toggleFolderSelection = () => {
    if (formData.folderId === "none") {
      // 如果当前是"无文件夹"，打开下拉菜单让用户选择或创建
      setPopoverOpen(true);
    } else {
      // 如果当前已选择文件夹，切换回"无文件夹"状态
      setFormData(prev => ({ ...prev, folderId: "none", folderName: "" }));
    }
  };

  const handleCreateNewFolder = async () => {
    if (!formData.folderName.trim()) {
      setError("Folder name is required");
      return;
    }

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.folderName,
          collectionId: formData.collectionId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to create folder");
        return;
      }

      // 添加新文件夹到列表
      const newFolder = result.folder;
      setFolders(prev => [...prev, newFolder]);
      
      // 选择新创建的文件夹
      setFormData(prev => ({
        ...prev,
        folderId: newFolder.id,
        folderName: newFolder.name
      }));

      setPopoverOpen(false);
    } catch (error) {
      console.error("Failed to create folder:", error);
      setError("Failed to create folder");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Bookmark</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon URL</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              placeholder="https://example.com/icon.png"
            />
          </div>

          <div className="space-y-2">
            <Label>Collection *</Label>
            <Select value={formData.collectionId} onValueChange={handleCollectionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Folder</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between"
                  type="button"
                >
                  {formData.folderId === "none" ? "No folder" : formData.folderName}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search folders..." />
                  <CommandList>
                    <CommandEmpty>No folders found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          setFormData(prev => ({ ...prev, folderId: "none", folderName: "" }));
                          setPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.folderId === "none" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        No folder
                      </CommandItem>
                      {folders.map((folder) => (
                        <CommandItem
                          key={folder.id}
                          value={folder.name}
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, folderId: folder.id, folderName: folder.name }));
                            setPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.folderId === folder.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <Folder className="mr-2 h-4 w-4" />
                          {folder.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked }))}
              />
              <Label htmlFor="isFeatured">Featured</Label>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}