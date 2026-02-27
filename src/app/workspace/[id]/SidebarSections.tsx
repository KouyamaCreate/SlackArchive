import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Hash, Lock, ChevronDown, ChevronRight, Plus } from "lucide-react";

export function SidebarSections({ workspaceId, activeChannelId, onSelectChannel, channels }: { workspaceId: number, activeChannelId: string | null, onSelectChannel: (id: string) => void, channels: any[] }) {
    // Create a default grouping
    const [localSections, setLocalSections] = useState<{ id: string, name: string, channelIds: string[] }[]>([]);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const sortChannelsAlphabetically = (ids: string[]) => {
        return ids.sort((a, b) => {
            const chanA = channels.find(c => c.slackId === a);
            const chanB = channels.find(c => c.slackId === b);
            if (!chanA || !chanB) return 0;
            // Clean names of leading punctuation for accurate Slack-like sorting
            const cleanA = chanA.name.replace(/^[_#-]+/, '').toLowerCase();
            const cleanB = chanB.name.replace(/^[_#-]+/, '').toLowerCase();
            return cleanA.localeCompare(cleanB);
        });
    };

    useEffect(() => {
        // Basic initialization: put everything in "Channels" if no sections exist
        if (channels && channels.length > 0 && localSections.length === 0) {
            const publicIds = channels.filter(c => !c.is_archived).map(c => c.slackId);
            const archivedIds = channels.filter(c => c.is_archived).map(c => c.slackId);

            setLocalSections([
                { id: 'channels', name: 'Channels', channelIds: sortChannelsAlphabetically(publicIds) },
                ...(archivedIds.length > 0 ? [{ id: 'archived', name: 'Archived', channelIds: sortChannelsAlphabetically(archivedIds) }] : [])
            ]);
        }
    }, [channels]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const newSections = Array.from(localSections);
        const sourceSectionIndex = newSections.findIndex(s => s.id === source.droppableId);
        const destSectionIndex = newSections.findIndex(s => s.id === destination.droppableId);

        const sourceSection = newSections[sourceSectionIndex];
        const destSection = newSections[destSectionIndex];

        const [movedChannelId] = sourceSection.channelIds.splice(source.index, 1);
        destSection.channelIds.splice(destination.index, 0, movedChannelId);

        setLocalSections(newSections);
        // TODO: Save to IndexedDB if we implement persistent custom sections
    };

    const toggleCollapse = (id: string) => {
        setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const createNewSection = () => {
        const name = prompt("Enter new section name:");
        if (!name) return;

        const newId = `section-${Date.now()}`;
        setLocalSections([...localSections, { id: newId, name, channelIds: [] }]);
    };

    if (!channels || channels.length === 0) return null;

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-2 flex items-center justify-between group cursor-pointer hover:bg-[#350D36] transition-colors border-b border-[#522653]" onClick={createNewSection}>
                <span className="text-xs font-semibold text-[#c9b7c8] group-hover:text-white">Create Section</span>
                <Plus className="w-4 h-4 text-[#c9b7c8] group-hover:text-white" />
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
                    {localSections.map(section => (
                        <Droppable key={section.id} droppableId={section.id}>
                            {(provided, snapshot) => (
                                <div
                                    className={`mb-4 ${snapshot.isDraggingOver ? 'bg-[#350d36]/50' : ''} transition-colors rounded-lg mx-2 pb-1`}
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    <div
                                        className="px-2 flex items-center justify-between group cursor-pointer mb-1 hover:bg-[#350D36] rounded p-1"
                                        onClick={() => toggleCollapse(section.id)}
                                    >
                                        <div className="flex items-center text-[#c9b7c8] group-hover:text-white transition-colors">
                                            {collapsed[section.id] ? <ChevronRight className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                                            <span className="text-xs font-semibold tracking-wider">{section.name}</span>
                                        </div>
                                        <Plus className="w-4 h-4 text-[#c9b7c8] opacity-0 group-hover:opacity-100 hover:text-white transition-all" />
                                    </div>

                                    {!collapsed[section.id] && (
                                        <div className="min-h-[2px]">
                                            {section.channelIds.map((channelId, index) => {
                                                const channel = channels.find(c => c.slackId === channelId);
                                                if (!channel) return null;
                                                const isActive = activeChannelId === channel.slackId;

                                                return (
                                                    <Draggable key={channel.slackId} draggableId={channel.slackId} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => onSelectChannel(channel.slackId)}
                                                                className={`flex items-center px-6 py-[5px] cursor-pointer max-w-full rounded mx-2 my-0.5 ${isActive
                                                                    ? 'bg-[#1164A3] text-white font-medium'
                                                                    : snapshot.isDragging ? 'bg-[#350D36] text-white shadow-lg ring-1 ring-[#522653]' : 'hover:bg-[#350D36] text-[#c9b7c8]'
                                                                    }`}
                                                            >
                                                                <span className={`mr-2 shrink-0 ${isActive || snapshot.isDragging ? 'text-white' : 'text-[#c9b7c8]'}`}>
                                                                    {channel.is_archived ? <Lock className="w-[14px] h-[14px]" /> : <Hash className="w-[14px] h-[14px]" />}
                                                                </span>
                                                                <span className="truncate text-[15px] leading-tight flex-1">{channel.name}</span>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
