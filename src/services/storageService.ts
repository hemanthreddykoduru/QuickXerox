import { supabase } from '../supabaseClient';
import { prependOrderCoverPage } from '../utils/pdfModifier';
// import { v4 as uuidv4 } from 'uuid'; // Removed unused
// const generateId = ... // Removed unused

/**
 * Uploads a file to Supabase Storage.
 * Path: print-files/{userId}/{orderId}/{fileName}
 * @returns Promise<string> The filePath (NOT the URL) in the bucket.
 */
export const uploadFile = async (
    file: File,
    userId: string,
    orderId: string,
    customerName: string
): Promise<string> => {
    try {
        // 1. Validate File Size (Supabase Free Plan limit is flexible, but requirement said 50MB)
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        if (file.size > MAX_SIZE) {
            throw new Error(`File ${file.name} is too large. Max limit is 50MB.`);
        }

        // 2. Validate File Type
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/jpg',
            'image/png'
        ];
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`File type ${file.type} not allowed. Only PDF, DOCX, and Images.`);
        }

        // 3. Auto-Add Cover Page using pdf-lib (Prepends Order ID and Customer Name)
        const processStartTime = Date.now();
        const modifiedFile = await prependOrderCoverPage(file, orderId, customerName);
        console.log(`Cover page processed in ${Date.now() - processStartTime}ms`);

        // 4. Construct Path
        // Sanitize filename to strict alphanumeric + dot
        const sanitizedFileName = modifiedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filePath = `${userId}/${orderId}/${sanitizedFileName}`;

        // 5. Upload Modified File
        const { data, error } = await supabase.storage
            .from('print-files')
            .upload(filePath, modifiedFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase Upload Error:', error);
            throw error;
        }

        return data.path; // Return the internal path, not a public URL
    } catch (error) {
        console.error('Error uploading file to Supabase:', error);
        throw error;
    }
};

/**
 * Generates a signed URL for temporary access to a private file.
 * @param filePath The internal path in the bucket (e.g. "uid/ord/file.pdf")
 * @returns Promise<string> The signed URL
 */
export const getSignedUrl = async (filePath: string): Promise<string> => {
    try {
        const { data, error } = await supabase.storage
            .from('print-files')
            .createSignedUrl(filePath, 60 * 60 * 24 * 3); // 72 hours (3 days) expiry

        if (error) {
            console.error('Supabase Signed URL Error:', error);
            throw new Error(`Supabase Error: ${error.message}`);
        }

        return data.signedUrl;
    } catch (error: any) {
        console.error('Error generating signed URL:', error);
        throw error;
    }
};

/**
 * Deletes a file from Supabase Storage.
 * @param filePath The internal path in the bucket
 */
export const deleteFile = async (filePath: string): Promise<void> => {
    try {
        const { error } = await supabase.storage
            .from('print-files')
            .remove([filePath]);

        if (error) {
            console.error('Supabase Delete Error:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

/**
 * Uploads a sponsor ad banner to Supabase Storage.
 * Path: print-files/banners/{sponsorId}/{fileName}
 * @returns Promise<string> The filePath in the bucket.
 */
export const uploadSponsorBanner = async (
    file: File,
    sponsorId: string
): Promise<string> => {
    try {
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB for ad banners
        if (file.size > MAX_SIZE) {
            throw new Error(`File ${file.name} is too large. Max limit is 5MB.`);
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`File type ${file.type} not allowed. Only JPEG, JPG, and PNG are allowed.`);
        }

        const fileExt = file.name.split('.').pop() || 'png';
        const sanitizedExt = fileExt.replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${Date.now()}_banner.${sanitizedExt}`;
        const filePath = `banners/${sponsorId}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('print-files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase Banner Upload Error:', error);
            throw error;
        }

        return data.path;
    } catch (error) {
        console.error('Error uploading sponsor banner:', error);
        throw error;
    }
};
