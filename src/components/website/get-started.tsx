import { Button } from "@/components/ui/button";
import Link from "next/link";

export function GetStarted() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Welcome to CrateNav</h1>
        <p className="text-lg text-gray-600 mb-8">
          CrateNav is a smart bookmark management and organization platform that helps users collect, organize and share their favorite websites in a beautiful way.
        </p>
        <Link href="/admin/collections">
          <Button variant="default" size="lg">
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  );
} 