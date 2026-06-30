import { useSettings } from "@/hooks/use-settings";

export function TopBanner() {
  const { settings } = useSettings('feature');
  
  if (!settings.enableTopBanner) {
    return null;
  }

  return (
    <div className="bg-blue-600 text-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="font-semibold text-lg">{settings.topBannerTitle}</h3>
            <p className="text-blue-100 hidden md:block">{settings.topBannerDescription}</p>
          </div>
          <a 
            href={settings.topBannerButtonLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors"
          >
            {settings.topBannerButtonText}
          </a>
        </div>
      </div>
    </div>
  );
}