import JSZip from 'jszip';
import { db } from './db';

export async function importSlackZip(file: File): Promise<number> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    // Find the root directory if the Slack export is wrapped in a folder
    const usersFileObj = Object.values(loadedZip.files).find(
        f => !f.dir && f.name.endsWith('users.json')
    );

    if (!usersFileObj) {
        throw new Error('Invalid Slack export: Missing users.json');
    }

    const rootDir = usersFileObj.name.replace('users.json', '');

    const channelsFileObj = loadedZip.file(rootDir + 'channels.json');
    if (!channelsFileObj) {
        throw new Error('Invalid Slack export: Missing channels.json');
    }

    const usersData = JSON.parse(await usersFileObj.async('string'));
    const channelsData = JSON.parse(await channelsFileObj.async('string'));

    // Create workspace entry
    const workspaceId = await db.workspaces.add({
        name: file.name.replace('.zip', ''),
        importedAt: new Date()
    }) as number;

    // Prepare users & channels
    const usersToInsert = usersData.map((u: any) => ({
        ...u,
        workspaceId,
        slackId: u.id,
        id: undefined
    }));

    const channelsToInsert = channelsData.map((c: any) => ({
        ...c,
        workspaceId,
        slackId: c.id,
        id: undefined
    }));

    await db.users.bulkAdd(usersToInsert);
    await db.channels.bulkAdd(channelsToInsert);

    const messageBatches: any[][] = [];
    const maxBatchSize = 10000;
    let currentBatch: any[] = [];

    const filePromises: Promise<void>[] = [];
    const filesToCache = new Map<string, { url: string, mimetype: string }>();

    const processFile = async (relativePath: string, fileObj: JSZip.JSZipObject) => {
        if (fileObj.dir || !relativePath.endsWith('.json')) return;

        // Strip root directory if exists
        const withoutRoot = relativePath.startsWith(rootDir)
            ? relativePath.substring(rootDir.length)
            : relativePath;

        const parts = withoutRoot.split(/[/\\]/);
        if (parts.length !== 2) return; // We only want channelName/date.json

        const [channelName, fileName] = parts;
        const channel = channelsData.find((c: any) => c.name === channelName);

        if (!channel) return;

        try {
            const messagesData = JSON.parse(await fileObj.async('string'));
            for (const msg of messagesData) {
                msg.workspaceId = workspaceId;
                msg.channelId = channel.id;

                // Extract file URLs for caching
                if (msg.files && Array.isArray(msg.files)) {
                    for (const f of msg.files) {
                        if (f.id && f.url_private && f.mimetype) {
                            filesToCache.set(f.id, { url: f.url_private, mimetype: f.mimetype });
                        }
                    }
                }

                currentBatch.push(msg);

                if (currentBatch.length >= maxBatchSize) {
                    messageBatches.push(currentBatch);
                    currentBatch = [];
                }
            }
        } catch (e) {
            console.error(`Error parsing ${relativePath}:`, e);
        }
    };

    loadedZip.forEach((relativePath, zipObj) => {
        filePromises.push(processFile(relativePath, zipObj));
    });

    await Promise.all(filePromises);

    if (currentBatch.length > 0) {
        messageBatches.push(currentBatch);
    }

    for (const batch of messageBatches) {
        const mappedBatch = batch.map(m => ({ ...m, id: undefined }));
        await db.messages.bulkAdd(mappedBatch);
    }

    // Attempt to cache all discovered files
    const cachePromises: Promise<void>[] = [];
    for (const [fileId, meta] of filesToCache) {
        cachePromises.push((async () => {
            try {
                const res = await fetch(meta.url, { mode: 'no-cors' }); // Best effort
                const blob = await res.blob();
                await db.files.add({
                    workspaceId,
                    fileId,
                    blob,
                    mimeType: meta.mimetype
                });
            } catch (e) {
                console.warn(`Could not cache file ${fileId} from ${meta.url}.`);
            }
        })());
    }

    // We don't want to block the entire import if some files fail
    await Promise.allSettled(cachePromises);

    return workspaceId;
}
