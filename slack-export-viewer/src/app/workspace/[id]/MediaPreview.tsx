import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Play } from "lucide-react";

export function MediaPreview({ fileId, fallbackUrl, mimeType, name, workspaceId }: { fileId: string, fallbackUrl?: string, mimeType: string, name: string, workspaceId: number }) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let active = true;
        const fetchMedia = async () => {
            try {
                const cached = await db.files.where({ workspaceId, fileId }).first();
                if (cached && cached.blob && active) {
                    const url = URL.createObjectURL(cached.blob);
                    setDataUrl(url);
                    return;
                }
            } catch (e) {
                console.error("Failed to load cached media", e);
            }

            // If not in cache and we have a fallback URL, use it
            if (active && fallbackUrl) {
                setDataUrl(fallbackUrl);
            } else if (active) {
                setError(true);
            }
        };

        fetchMedia();
        return () => { active = false; };
    }, [fileId, workspaceId, fallbackUrl]);

    if (error) return null;

    if (mimeType?.startsWith('image/')) {
        return (
            <div className="mt-2 max-w-[360px] rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center relative group/media">
                {dataUrl ? (
                    <img src={dataUrl} alt={name} className="w-full h-auto max-h-[300px] object-contain" onError={() => setError(true)} />
                ) : (
                    <div className="w-full h-32 animate-pulse bg-gray-200"></div>
                )}
            </div>
        );
    }

    if (mimeType?.startsWith('video/')) {
        return (
            <div className="mt-2 max-w-[360px] rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center relative">
                {dataUrl ? (
                    <video src={dataUrl} controls className="w-full max-h-[300px]" onError={() => setError(true)} />
                ) : (
                    <div className="w-full h-32 animate-pulse bg-gray-800 flex flex-col items-center justify-center">
                        <Play className="text-white/30 w-10 h-10 mb-2" />
                    </div>
                )}
            </div>
        );
    }

    return null;
}
