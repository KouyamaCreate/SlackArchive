"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { Hash, Lock, Users, MessageSquare, Menu, Search, Clock, HelpCircle, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { MediaPreview } from "./MediaPreview";

import { SidebarSections } from "./SidebarSections";

export default function WorkspacePage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const router = useRouter();
    const workspaceId = parseInt(params.id, 10);

    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

    const workspace = useLiveQuery(() => db.workspaces.get(workspaceId), [workspaceId]);
    const channels = useLiveQuery(() => db.channels.where({ workspaceId }).toArray(), [workspaceId]);
    const users = useLiveQuery(() => db.users.where({ workspaceId }).toArray(), [workspaceId]);

    const generalChannel = channels?.find(c => c.is_general);

    useEffect(() => {
        if (channels && channels.length > 0 && !activeChannelId) {
            const defaultC = generalChannel || channels[0];
            setActiveChannelId(defaultC?.slackId);
        }
    }, [channels, activeChannelId, generalChannel]);

    if (workspace === undefined || channels === undefined) {
        return <div className="min-h-screen bg-[#1A1D21] flex flex-col items-center justify-center text-white">Loading...</div>;
    }

    if (workspace === null) {
        return (
            <div className="min-h-screen bg-[#1A1D21] flex flex-col items-center justify-center text-white">
                <h2 className="text-xl mb-4">Workspace not found</h2>
                <button onClick={() => router.push('/')} className="px-4 py-2 bg-blue-500 rounded text-white font-medium hover:bg-blue-600">Go Home</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-white">
            {/* Top Navbar */}
            <div className="h-11 bg-[#350d36] flex items-center justify-between px-4 z-20 border-b border-white/10 shrink-0 shadow-sm">
                <div className="flex items-center text-[#c9b7c8] w-1/4">
                    <Clock className="w-4 h-4 mr-4 cursor-pointer hover:text-white transition-colors" />
                </div>
                <div className="flex-1 flex justify-center max-w-2xl px-4">
                    <div className="w-full max-w-xl bg-white/20 hover:bg-white/30 transition-all border border-white/10 rounded-md flex items-center px-3 py-1 cursor-pointer">
                        <Search className="w-3.5 h-3.5 text-white/70 mr-2" />
                        <span className="text-white/70 text-[13px] font-medium tracking-wide">Search {workspace.name}</span>
                    </div>
                </div>
                <div className="flex items-center justify-end text-[#c9b7c8] w-1/4 space-x-4">
                    <HelpCircle className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                    <div className="w-[28px] h-[28px] bg-[#007a5a] rounded-md border border-white/20 flex items-center justify-center text-white text-xs font-bold leading-none cursor-pointer">
                        Me
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-[260px] flex shrink-0 flex-col bg-[#3F0E40] text-gray-300 border-r border-[#522653]">
                    <div className="h-12 flex items-center px-4 font-bold text-white border-b border-[#522653] hover:bg-[#350D36] cursor-pointer transition-colors shadow-sm z-10">
                        <span className="truncate text-[15px]">{workspace.name}</span>
                    </div>

                    <SidebarSections
                        workspaceId={workspaceId}
                        activeChannelId={activeChannelId}
                        onSelectChannel={setActiveChannelId}
                        channels={channels}
                    />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                    {activeChannelId ? (
                        <ChannelView
                            workspaceId={workspaceId}
                            channelId={activeChannelId}
                            channels={channels}
                            users={users || []}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                            <Hash className="w-12 h-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium text-gray-500">Select a channel to view messages</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ChannelItem({ channel, isActive, onClick }: { channel: any, isActive: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center px-4 py-1.5 cursor-pointer max-w-full ${isActive
                ? 'bg-[#1164A3] text-white font-medium'
                : 'hover:bg-[#350D36] text-[#c9b7c8]'
                }`}
        >
            <span className={`mr-2 shrink-0 ${isActive ? 'text-white' : 'text-[#c9b7c8]'}`}>
                {channel.is_archived ? <Lock className="w-[14px] h-[14px]" /> : <Hash className="w-[14px] h-[14px]" />}
            </span>
            <span className="truncate text-[15px] leading-tight flex-1">{channel.name}</span>
        </div>
    );
}

function ChannelView({ workspaceId, channelId, channels, users }: { workspaceId: number, channelId: string, channels: any[], users: any[] }) {
    const channel = channels.find(c => c.slackId === channelId);
    const messages = useLiveQuery(
        () => db.messages.where({ workspaceId, channelId }).sortBy('ts'),
        [workspaceId, channelId]
    );

    const getUser = (slackId: string) => users.find(u => u.slackId === slackId);

    if (!channel) return null;

    return (
        <>
            <div className="h-14 border-b flex items-center justify-between px-5 shrink-0 bg-white shadow-sm z-10 relative">
                <div className="flex flex-col min-w-0 pr-4">
                    <div className="flex items-center font-bold text-[15px] text-gray-900 leading-tight truncate">
                        {channel.is_archived ? <Lock className="w-4 h-4 text-gray-500 mr-1" /> : <Hash className="w-4 h-4 text-gray-500 mr-1" />}
                        <span className="truncate">{channel.name}</span>
                    </div>
                    {channel.topic?.value && (
                        <span className="text-[13px] text-gray-500 truncate mt-0.5">{channel.topic.value}</span>
                    )}
                </div>
                <div className="flex items-center space-x-1 shrink-0 text-gray-500 border border-gray-200 rounded-md px-2 py-0.5 hover:bg-gray-50 cursor-default transition-colors">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-sm font-semibold">{channel.members?.length || 0}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white flex flex-col pt-4">
                {!messages ? (
                    <div className="flex justify-center my-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                ) : messages.length === 0 ? (
                    <div className="text-center my-16 text-gray-400 font-medium">No messages found in this channel.</div>
                ) : (
                    <div className="pb-6">
                        {/* End of history indicator */}
                        <div className="mb-6 px-5 mt-10">
                            <h1 className="text-[28px] font-black tracking-tight mb-2 text-gray-900">
                                {channel.is_archived ? <span><Lock className="w-6 h-6 inline-block mr-1 align-sub" /></span> : <span><Hash className="w-7 h-7 inline-block mr-1 align-sub text-gray-400/80" /></span>}
                                {channel.name}
                            </h1>
                            <p className="text-[15px] text-gray-600 mb-4">
                                {channel.is_archived
                                    ? `You are viewing an archived channel.`
                                    : <span>This is the very beginning of the <strong>#{channel.name}</strong> channel.</span>
                                }
                            </p>
                            {channel.purpose?.value && (
                                <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100 flex text-[15px] text-gray-700">
                                    <span className="font-semibold text-gray-900 w-20 shrink-0">Purpose</span>
                                    <span className="break-words">{channel.purpose.value}</span>
                                </div>
                            )}
                        </div>

                        {/* Messages List */}
                        {messages.map((msg, idx) => {
                            const prevMsg = idx > 0 ? messages[idx - 1] : null;

                            const msgDate = new Date(parseFloat(msg.ts) * 1000);
                            const prevDate = prevMsg ? new Date(parseFloat(prevMsg.ts) * 1000) : new Date(0);
                            const isSameDay = msgDate.toDateString() === prevDate.toDateString();
                            const isSameUser = prevMsg && msg.user === prevMsg.user;
                            const isCloseInTime = prevMsg && (parseFloat(msg.ts) - parseFloat(prevMsg.ts)) < 300;

                            // Do not group system messages (subtypes usually exist for system messages)
                            const shouldGroup = isSameDay && isSameUser && isCloseInTime && !msg.subtype && !prevMsg?.subtype;

                            let showDateDivider = !isSameDay;

                            const user = msg.user ? getUser(msg.user) : null;
                            let userName = user ? (user.real_name || user.name) : msg.user || 'Unknown User';

                            let userImage = user?.profile?.image_48 || `https://ca.slack-edge.com/T00000000-U00000000-g00000000000-48`;

                            if (msg.bot_id && !msg.user) {
                                userName = msg.username || 'Bot';
                            }

                            return (
                                <div key={msg.ts}>
                                    {showDateDivider && (
                                        <div className="relative flex items-center py-4 mt-2 group">
                                            <div className="flex-grow border-t border-gray-200 group-hover:border-gray-300 transition-colors"></div>
                                            <span className="flex-shrink-0 mx-4 text-[13px] font-bold px-4 py-1 rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm z-10 group-hover:border-gray-300 transition-colors">
                                                {format(msgDate, 'EEEE, MMMM do')}
                                            </span>
                                            <div className="flex-grow border-t border-gray-200 group-hover:border-gray-300 transition-colors"></div>
                                        </div>
                                    )}

                                    <div className={`group flex items-start px-5 hover:bg-[#F8F8F8] transition-colors py-[4px] min-h-[1.75rem] ${shouldGroup ? '' : 'mt-1 pt-1.5'}`}>
                                        {shouldGroup ? (
                                            <div className="w-[36px] shrink-0 mr-2 flex items-center justify-end">
                                                <span className="text-[10px] text-gray-500 leading-none opacity-0 group-hover:opacity-100 select-none pb-0.5">
                                                    {format(msgDate, 'h:mm')}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="w-[36px] shrink-0 mr-2 flex justify-end">
                                                {msg.subtype === 'channel_join' || msg.subtype === 'channel_leave' || msg.subtype === 'channel_purpose' ? (
                                                    <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded object-cover mt-0.5">
                                                        <Users className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                ) : (
                                                    <img src={userImage} alt={userName} className="w-9 h-9 rounded bg-gray-100 object-cover mt-[2px]" />
                                                )}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0 flex flex-col relative bottom-[1px]">
                                            {!shouldGroup && msg.subtype !== 'channel_join' && msg.subtype !== 'channel_leave' && (
                                                <div className="flex items-baseline space-x-2 leading-tight mb-[2px]">
                                                    <span className="font-bold text-[15px] truncate text-gray-900 cursor-pointer hover:underline">
                                                        {userName}
                                                    </span>
                                                    <span className="text-[12px] text-gray-500 cursor-pointer hover:underline">
                                                        {format(msgDate, 'h:mm a')}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="text-[15px] text-[#1d1c1d] leading-[1.46] break-words">
                                                <SlackTextFormatter text={msg.text || ''} users={users} />

                                                {/* File Previews */}
                                                {msg.files && msg.files.length > 0 && (
                                                    <div className="mt-2 flex flex-col gap-2">
                                                        {msg.files.map((f: any, i: number) => {
                                                            const isMedia = f.mimetype?.startsWith('image/') || f.mimetype?.startsWith('video/');

                                                            return (
                                                                <div key={i} className="flex flex-col">
                                                                    {isMedia ? (
                                                                        <MediaPreview
                                                                            fileId={f.id}
                                                                            fallbackUrl={f.url_private}
                                                                            mimeType={f.mimetype}
                                                                            name={f.name || f.title}
                                                                            workspaceId={workspaceId}
                                                                        />
                                                                    ) : (
                                                                        <div className="border border-gray-200 rounded-lg overflow-hidden max-w-[360px] bg-white group/file cursor-pointer flex">
                                                                            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center border-r border-gray-200 shrink-0">
                                                                                <FileText className="text-gray-400 w-6 h-6" />
                                                                            </div>
                                                                            <div className="p-3 flex flex-col justify-center overflow-hidden min-w-0">
                                                                                <div className="text-sm font-semibold text-blue-600 truncate group-hover/file:underline">{f.name || f.title}</div>
                                                                                <div className="text-xs text-gray-500 uppercase font-medium mt-0.5">{f.filetype} • {(f.size / 1024).toFixed(0)} KB</div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {/* Thread Previews */}
                                                {msg.reply_count > 0 && (
                                                    <div className="mt-1.5 flex items-center">
                                                        <div className="flex items-center -space-x-1 mr-2">
                                                            {msg.reply_users?.slice(0, 4).map((uid: string, i: number) => {
                                                                const u = getUser(uid);
                                                                const img = u?.profile?.image_24 || `https://ca.slack-edge.com/T00000000-U00000000-g00000000000-24`;
                                                                return <img key={i} src={img} className="w-6 h-6 rounded border-2 border-white bg-gray-100" />
                                                            })}
                                                        </div>
                                                        <div className="text-[13px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center">
                                                            {msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}
                                                        </div>
                                                        <div className="text-[13px] text-gray-500 ml-2">
                                                            View thread
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Editor Mock */}
            <div className="p-5 pt-2 pb-6 bg-white shrink-0">
                <div className="border border-gray-400 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 overflow-hidden shadow-sm transition-all h-[90px] flex flex-col relative">
                    <div className="flex-1 p-3 bg-white text-[15px] text-gray-400 cursor-not-allowed select-none">
                        Message #{channel.name}
                    </div>
                    <div className="h-9 bg-[#F8F9FA] border-t border-gray-200 flex items-center px-2 space-x-1">
                        <div className="w-6 h-6 rounded bg-gray-200 opacity-60 m-1 flex items-center justify-center"><Hash className="w-3.5 h-3.5" /></div>
                        <div className="w-6 h-6 rounded bg-gray-200 opacity-60 m-1"></div>
                        <div className="w-6 h-6 rounded bg-gray-200 opacity-60 m-1"></div>
                    </div>

                    {/* Mock send button */}
                    <div className="absolute right-2 bottom-2 w-7 h-7 bg-gray-100 rounded flex items-center justify-center cursor-not-allowed opacity-50">
                        <div className="w-3 h-3 border-t-2 border-r-2 border-gray-400 transform rotate-45 mr-1 mt-1"></div>
                    </div>
                </div>
                <div className="flex justify-between items-center px-1 mt-1.5">
                    <span className="text-xs text-gray-400"><strong>Shift + Return</strong> to add a new line</span>
                </div>
            </div>
        </>
    );
}

// Slightly robust formatter extracting text from links and tagging mentions
function SlackTextFormatter({ text, users }: { text: string, users: any[] }) {
    if (!text) return null;

    // Regex to split by links <http...|label> or <http...> and user mentions <@U...>
    const regex = /(<[^>]+>)/g;
    const parts = text.split(regex);

    if (parts.length === 1 && parts[0] === text) {
        return <span className="whitespace-pre-wrap">{text}</span>;
    }

    return (
        <span className="whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (!part) return null;

                if (part.startsWith('<@') && part.endsWith('>')) {
                    const userId = part.slice(2, -1).split('|')[0];
                    const user = users.find(u => u.slackId === userId);
                    const name = user ? (user.real_name || user.name) : userId;
                    return <span key={i} className="bg-[#e8f5fa] text-[#0b4c8c] font-medium leading-tight px-[2px] rounded align-baseline cursor-pointer hover:bg-[#d0ebf6] transition-colors">@{name}</span>;
                }

                if (part.startsWith('<#') && part.endsWith('>')) {
                    const channelParts = part.slice(2, -1).split('|');
                    return <span key={i} className="bg-[#e8f5fa] text-[#0b4c8c] font-medium leading-tight px-[2px] rounded align-baseline cursor-pointer hover:bg-[#d0ebf6] transition-colors">#{channelParts[1] || channelParts[0]}</span>;
                }

                // Link handling
                if (part.startsWith('<http') && part.endsWith('>')) {
                    const inner = part.slice(1, -1);
                    const splitIdx = inner.indexOf('|');
                    if (splitIdx > -1) {
                        const url = inner.slice(0, splitIdx);
                        const label = inner.slice(splitIdx + 1);
                        return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{label}</a>;
                    } else {
                        const url = inner;
                        return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{url}</a>;
                    }
                }

                // Just unescape HTML entities for generic slack texts (&amp;, &lt;, &gt;)
                const unescaped = part
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>');

                return <span key={i}>{unescaped}</span>;
            })}
        </span>
    );
}
