import { useEffect, useState } from "react";

interface OGPData {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    siteName?: string;
}

export function LinkPreview({ url }: { url: string }) {
    const [ogp, setOgp] = useState<OGPData | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        const fetchOgp = async () => {
            try {
                // Ignore internal slack links or common non-OGP links
                if (url.includes('slack.com/archives') || url.includes('files.slack.com')) {
                    setFailed(true);
                    setLoading(false);
                    return;
                }

                const res = await fetch(`/api/ogp?url=${encodeURIComponent(url)}`);
                if (!res.ok) throw new Error("Failed to fetch OGP");

                const data = await res.json();
                if (active && (data.title || data.image)) {
                    setOgp(data);
                } else if (active) {
                    setFailed(true);
                }
            } catch (error) {
                if (active) setFailed(true);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchOgp();
        return () => { active = false; };
    }, [url]);

    if (loading) return null;
    if (failed || !ogp) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col sm:flex-row mt-2 max-w-[500px] border border-gray-300 rounded overflow-hidden hover:bg-gray-50 transition-colors group/ogp no-underline text-inherit"
        >
            <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                {ogp.siteName && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500 font-bold mb-1">
                        <img src={`https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`} className="w-4 h-4 rounded-sm" alt="" />
                        <span>{ogp.siteName}</span>
                    </div>
                )}
                <div className="font-bold text-blue-600 text-[15px] leading-tight mb-1 truncate group-hover/ogp:underline">
                    {ogp.title || url}
                </div>
                {ogp.description && (
                    <div className="text-[13px] text-[#1d1c1d] leading-snug line-clamp-2">
                        {ogp.description}
                    </div>
                )}
            </div>
            {ogp.image && (
                <div className="w-full sm:w-[150px] shrink-0 border-t sm:border-t-0 sm:border-l border-gray-200 bg-gray-100 flex items-center justify-center">
                    <img src={ogp.image} alt={ogp.title || "Preview"} className="max-w-full max-h-[140px] sm:max-h-full object-cover w-full h-full" />
                </div>
            )}
        </a>
    );
}
