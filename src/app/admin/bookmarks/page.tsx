import { AdminHeader } from "@/components/admin/header";
import { BookmarkDataTable } from "@/components/bookmark/BookmarkDataTable";
import { getBookmarks } from "@/lib/api/collections";

export default async function BookmarksPage() {
  const bookmarks = await getBookmarks();

  return (
    <div className="container mx-auto py-10">
      <AdminHeader title="书签管理" />
      <BookmarkDataTable data={bookmarks} />
    </div>
  );
}

const LoadingSkeleton = () => {
    return (
        <div className="space-y-6">
            {/* 顶部操作区域骨架屏 */}
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-10 w-[200px]" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[120px]" />
                    <Skeleton className="h-10 w-[120px]" />
                </div>
            </div>

            {/* 文件夹导航路径骨架屏 */}
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-9 w-[60px]" />
                <Skeleton className="h-4 w-4" /> {/* 箭头图标 */}
                <Skeleton className="h-9 w-[100px]" />
            </div>

            {/* 表格骨架屏 */}
            <div className="rounded-lg border border-gray-200">
                {/* 表头 */}
                <div className="border-b border-gray-200 bg-gray-50/40">
                    <Skeleton className="h-12 w-full" />
                </div>
                
                {/* 表格内容 */}
                <div className="divide-y divide-gray-200">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center p-4 gap-4">
                            <Skeleton className="h-8 w-8 rounded-full" /> {/* 图标 */}
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-[200px]" /> {/* 标题 */}
                                <Skeleton className="h-3 w-[300px]" /> {/* URL */}
                            </div>
                            <Skeleton className="h-4 w-[100px]" /> {/* 创建时间 */}
                            <Skeleton className="h-8 w-8 rounded-md" /> {/* 操作按钮 */}
                        </div>
                    ))}
                </div>
            </div>

            {/* 分页骨架屏 */}
            <div className="flex items-center justify-end gap-2 mt-4">
                <Skeleton className="h-10 w-[100px]" />
                <Skeleton className="h-10 w-[100px]" />
            </div>
        </div>
    );
};
