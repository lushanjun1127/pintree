"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { AdminHeader } from "@/components/admin/header";
import { CollectionList } from "@/components/collection/CollectionList";
import { CreateCollectionDialog } from "@/components/collection/CreateCollectionDialog";
import { ImportCollectionDialog } from "@/components/collection/ImportCollectionDialog";

export default async function CollectionsPage() {
  return (
    <div className="container mx-auto py-10">
      <AdminHeader 
        title="收藏集管理" 
        action={
          <>
            <ImportCollectionDialog />
            <CreateCollectionDialog />
          </>
        } 
      />
      <CollectionList />
    </div>
  );
}
