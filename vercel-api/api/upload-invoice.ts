import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { allowCors } from './_utils';

// Initialize Supabase Admin Client (Service Role)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any;

if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
    console.warn('Supabase credentials missing in environment variables');
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Server configuration error: Supabase not initialized' });
    }

    const { fileName, fileBase64, mimeType } = req.body;

    if (!fileName || !fileBase64 || !mimeType) {
        return res.status(400).json({ error: 'Missing required fields: fileName, fileBase64, mimeType' });
    }

    try {
        // Convert base64 to buffer
        const buffer = Buffer.from(fileBase64, 'base64');

        // Upload to Supabase Storage (invoices bucket)
        // Using upsert: true to overwrite if exists
        const { data, error } = await supabase.storage
            .from('invoices')
            .upload(fileName, buffer, {
                contentType: mimeType,
                upsert: true
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw error;
        }

        // Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from('invoices')
            .getPublicUrl(fileName);

        return res.status(200).json({
            success: true,
            url: publicUrlData.publicUrl,
            path: data.path
        });

    } catch (error: any) {
        console.error('Error uploading invoice:', error);
        return res.status(500).json({ error: 'Failed to upload invoice', details: error.message });
    }
};

export default allowCors(handler);
