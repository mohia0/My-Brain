import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { email, message } = await req.json();

        // 1. Save to Supabase (assuming 'bug_reports' table exists)
        // Table schema: id (uuid), email (text), message (text), created_at (timestamp)
        const { error: dbError } = await supabase
            .from('bug_reports' as any)
            .insert([{ email, message, created_at: new Date().toISOString() }]);

        if (dbError) {
            console.warn('[BugReportAPI] Could not save to DB (table might not exist):', dbError.message);
        }

        // 2. DISCORD WEBHOOK (Optional but recommended for instant notifications)
        // Add DISCORD_BUG_WEBHOOK to your environment variables
        const discordWebhook = process.env.DISCORD_BUG_WEBHOOK;
        if (discordWebhook) {
            await fetch(discordWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '🚀 **New Bug Report Received**',
                    embeds: [{
                        title: 'Bug Details',
                        color: 0x6e56cf, // Accent color
                        fields: [
                            { name: 'User Email', value: email, inline: true },
                            { name: 'Message', value: message }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                })
            }).catch(e => console.error('[BugReportAPI] Discord webhook failed:', e));
        }

        console.log('--- BUG REPORT RECEIVED ---');
        console.log('From:', email);
        console.log('Message:', message);
        console.log('---------------------------');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Bug report API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
