import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, adminDb } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    // Check if the request is for matching a campaign
    const { action, shopId } = req.query;

    if (action === 'campaign') {
        if (!shopId || typeof shopId !== 'string') {
            return res.status(400).json({ error: 'Missing shopId' });
        }

        try {
            console.log(`Backend campaign query started for shopId: ${shopId}`);
            
            // 1. Fetch shop details
            const shopSnap = await adminDb.collection('shopOwners').doc(shopId).get();
            if (!shopSnap.exists) {
                console.log(`shopOwners document not found for shopId: ${shopId}`);
                return res.status(404).json({ error: 'Shop owner not found' });
            }

            const shopData = shopSnap.data() || {};
            const shopName = shopData.settings?.shop?.name || shopData.name;
            const shopAddress = shopData.settings?.shop?.address || shopData.address;
            
            if (!shopName) {
                return res.status(400).json({ error: 'Shop name not set' });
            }

            const targetLocation = shopAddress ? `${shopName} - ${shopAddress}` : shopName;
            console.log(`Backend location: "${targetLocation}" | Name: "${shopName}"`);

            // 2. Fetch active campaigns
            const campaignSnapshot = await adminDb.collection('campaigns')
                .where('status', '==', 'active')
                .get();

            console.log(`Found ${campaignSnapshot.size} active campaigns on backend.`);
            let matchedCampaign: any = null;

            campaignSnapshot.forEach((doc) => {
                const data = doc.data();
                const locations: string[] = data.locations || [];
                
                // Case-insensitive partial matching
                const isLocationMatched = locations.some((loc: string) => 
                    loc === targetLocation || 
                    loc === shopName ||
                    loc.toLowerCase().includes(shopName.toLowerCase())
                );

                const hasBudget = (data.budget - data.spent) > 0;
                const isPaid = data.isPaid !== false;

                if (isLocationMatched && hasBudget && isPaid) {
                    matchedCampaign = {
                        id: doc.id,
                        ...data
                    };
                }
            });

            console.log(`Matched campaign backend result:`, matchedCampaign ? matchedCampaign.name : 'None');
            return res.status(200).json({ campaign: matchedCampaign });

        } catch (err: any) {
            console.error('Backend match campaign error:', err);
            return res.status(500).json({ error: err.message || 'Failed to match campaign' });
        }
    }

    if (action === 'deduct-budget') {
        const { campaignId, costDeducted, pageCount } = req.query;
        if (!campaignId || typeof campaignId !== 'string') {
            return res.status(400).json({ error: 'Missing campaignId' });
        }

        try {
            const cost = parseFloat(costDeducted as string) || 0;
            const pages = parseInt(pageCount as string) || 1;
            console.log(`Backend deducting campaign budget for campaignId: ${campaignId} | Cost: ${cost} | Pages: ${pages}`);

            const campaignRef = adminDb.collection('campaigns').doc(campaignId);

            await adminDb.runTransaction(async (transaction) => {
                const docSnap = await transaction.get(campaignRef);
                if (!docSnap.exists) {
                    throw new Error('Campaign not found');
                }

                const data = docSnap.data() || {};
                const currentSpent = data.spent || 0;
                const currentImpressions = data.impressions || 0;
                const newSpent = currentSpent + cost;
                
                const updates: any = {
                    spent: newSpent,
                    impressions: currentImpressions + pages,
                    updatedAt: new Date().toISOString()
                };

                if (newSpent >= (data.budget || 0)) {
                    updates.status = 'completed';
                    updates.completedAt = new Date().toISOString();
                }

                transaction.update(campaignRef, updates);
            });

            console.log(`Successfully completed budget deduction transaction.`);
            return res.status(200).json({ success: true });

        } catch (err: any) {
            console.error('Backend deduct budget error:', err);
            return res.status(500).json({ error: err.message || 'Failed to deduct budget' });
        }
    }


    // Default: Proxy PDF request
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.query;
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing PDF URL' });
    }

    try {
        console.log(`Proxying PDF request for URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        return res.send(Buffer.from(buffer));
    } catch (error: any) {
        console.error('Proxy PDF Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to proxy PDF' });
    }
};

export default allowCors(handler);
