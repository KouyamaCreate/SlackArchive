"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { importSlackZip } from "@/lib/import";
import { useRouter } from "next/navigation";
import { HardDriveDownload, Trash2, ArrowRight, Loader2, Settings, X } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const workspaces = useLiveQuery(() => db.workspaces.toArray());
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem('slack_token') || '');
  }, []);

  const saveToken = () => {
    localStorage.setItem('slack_token', token);
    setShowSettings(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setError(null);
      const wsId = await importSlackZip(file);
      router.push(`/workspace/${wsId}`);
    } catch (err: any) {
      setError(err.message || 'Error importing workspace');
      console.error(err);
    } finally {
      setIsImporting(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workspace?')) return;

    await db.transaction('rw', db.workspaces, db.users, db.channels, db.messages, async () => {
      await db.workspaces.delete(id);
      await db.users.where({ workspaceId: id }).delete();
      await db.channels.where({ workspaceId: id }).delete();
      await db.messages.where({ workspaceId: id }).delete();
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-8 text-center bg-[#4A154B] text-white relative">
          <button
            onClick={() => setShowSettings(true)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-white/90" />
          </button>

          <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
            <HardDriveDownload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight">Slack Export Viewer</h1>
          <p className="text-sm text-purple-200 font-medium">
            Preview your archived Slack exports privately.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-5 border border-red-100 flex items-start">
              <span className="font-semibold mr-2">Error:</span> {error}
            </div>
          )}

          <div className="mb-6">
            <label
              className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isImporting
                ? 'border-gray-200 bg-gray-50 pointer-events-none'
                : 'border-purple-200 bg-purple-50/50 hover:bg-purple-50 hover:border-purple-300'
                }`}
            >
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileChange}
                disabled={isImporting}
              />
              {isImporting ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
                  <span className="text-sm font-semibold text-gray-800">Importing workspace...</span>
                  <span className="text-xs text-gray-500 mt-2">This may take a minute for large exports.</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-purple-700">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 border border-purple-100">
                    <HardDriveDownload className="w-6 h-6 opacity-80" />
                  </div>
                  <span className="text-sm font-semibold">Select a Slack .zip export</span>
                  <span className="text-xs opacity-70 mt-1">Data stays locally in your browser</span>
                </div>
              )}
            </label>
          </div>

          {workspaces !== undefined && workspaces.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Saved Workspaces
                </h2>
                <span className="text-xs bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full font-medium">
                  {workspaces.length}
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {workspaces.map(ws => (
                  <div
                    key={ws.id}
                    onClick={() => router.push(`/workspace/${ws.id}`)}
                    className="flex outline-none items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                  >
                    <div className="truncate pr-4">
                      <h3 className="font-semibold text-gray-900 truncate">{ws.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Imported {new Date(ws.importedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={(e) => handleDelete(e, ws.id!)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete workspace"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-2 text-gray-400 group-hover:text-[#4A154B] bg-gray-50 group-hover:bg-[#4A154B]/10 rounded-lg transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-400">
        <p>100% Client-side processing • Powered by IndexedDB</p>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-gray-800">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Slack Media Token (Optional)</label>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                To view private images securely without triggering Vercel deployment CORS blocks, paste a Slack User Token (`xoxp-...` or `xoxc-...`) or your `d` cookie. It is stored <strong>locally in your browser</strong> and sent only to the internal Image Proxy.
              </p>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="xoxc-..."
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A154B]/30 focus:border-[#4A154B] transition-all"
              />
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={saveToken}
                className="px-5 py-2 bg-[#007a5a] hover:bg-[#148567] text-white font-medium rounded-lg transition-colors text-sm shadow-sm"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
