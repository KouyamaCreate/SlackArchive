import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)'
            }
        });

        if (!response.ok) {
            return new NextResponse(`Failed to fetch URL`, { status: response.status });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const getMetaContext = (property: string) => {
            return $(`meta[property="${property}"]`).attr('content') || $(`meta[name="${property}"]`).attr('content');
        };

        const ogData = {
            title: getMetaContext('og:title') || $('title').text(),
            description: getMetaContext('og:description') || getMetaContext('description'),
            image: getMetaContext('og:image'),
            url: targetUrl,
            siteName: getMetaContext('og:site_name'),
        };

        return NextResponse.json(ogData, {
            headers: {
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200', // Cache for a day
            }
        });

    } catch (error) {
        console.error('OGP fetch error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
