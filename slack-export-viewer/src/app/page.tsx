"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { importSlackZip } from "@/lib/import";
import { useRouter } from "next/navigation";
import { HardDriveDownload, Trash2, ArrowRight, Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const workspaces = useLiveQuery(() => db.workspaces.toArray());
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="p-8 text-center bg-[#4A154B] text-white">
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
    </div>
  );
}
