import { PDFDocument, rgb } from 'pdf-lib';
import { db, auth } from '../firebase';
import { 
  collection, query, where, getDocs, doc, 
  updateDoc, getDoc, serverTimestamp, increment 
} from 'firebase/firestore';
import { getSignedUrl } from './storageService';

/**
 * Interface representing active ad campaign properties.
 */
interface ActiveCampaign {
  id: string;
  sponsorId: string;
  name: string;
  brandName: string;
  websiteUrl: string;
  ctaText?: string;
  placementType: 'footer' | 'first_page' | 'watermark' | 'coupon';
  budget: number;
  spent: number;
  bannerPath?: string;
  bannerUrl?: string;
}

/**
 * 1. Fetches active campaign targeting the current print shop location.
 */
export const fetchActiveCampaignForShop = async (): Promise<ActiveCampaign | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  try {
    // A. Fetch current seller's settings to build location target string
    const shopSnap = await getDoc(doc(db, 'shopOwners', currentUser.uid));
    if (!shopSnap.exists()) return null;

    const shopData = shopSnap.data();
    const shopName = shopData.settings?.shop?.name || shopData.name;
    const shopAddress = shopData.settings?.shop?.address || shopData.address;
    if (!shopName) return null;

    // Target key exactly matches selection in Sponsor modal
    const targetLocation = shopAddress ? `${shopName} - ${shopAddress}` : shopName;
    console.log(`PDF Ad Engine: Targeting print node location: "${targetLocation}"`);

    // B. Fetch all active paid campaigns
    const q = query(
      collection(db, 'campaigns'),
      where('status', '==', 'active'),
      where('isPaid', '==', true)
    );

    const snapshot = await getDocs(q);
    let matchedCampaign: ActiveCampaign | null = null;

    snapshot.forEach((snapDoc) => {
      const data = snapDoc.data();
      const locations: string[] = data.locations || [];

      // Check if campaign targets this specific shop location
      if (locations.includes(targetLocation) && (data.budget - data.spent) > 0) {
        matchedCampaign = {
          id: snapDoc.id,
          ...data
        } as ActiveCampaign;
      }
    });

    if (matchedCampaign) {
      console.log(`PDF Ad Engine: Matched Active Campaign: "${(matchedCampaign as ActiveCampaign).name}"`);
    } else {
      console.log('PDF Ad Engine: No active sponsor campaign targeting this location.');
    }

    return matchedCampaign;

  } catch (error) {
    console.error('Error matching sponsor campaign for PDF injection:', error);
    return null;
  }
};

/**
 * 2. Fetches signed banner URLs if bannerPath exists.
 */
const resolveCampaignBannerUrl = async (campaign: ActiveCampaign): Promise<string | null> => {
  if (campaign.bannerUrl) return campaign.bannerUrl;
  if (!campaign.bannerPath) return null;

  try {
    return await getSignedUrl(campaign.bannerPath);
  } catch (err) {
    console.error('Error resolving signed URL for campaign banner:', err);
    return null;
  }
};

/**
 * 3. Core PDF Ad Injector Engine.
 * Loads a PDF, draws custom sponsor banners/taglines, embeds dynamically generated QR codes,
 * saves the stamped PDF file, and updates campaign stats/budgets in Firestore.
 */
export const injectAdIntoPDF = async (
  pdfBytes: ArrayBuffer,
  campaign: ActiveCampaign
): Promise<{ pdfBytes: Uint8Array; pageCount: number; costDeducted: number }> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  if (pageCount === 0) {
    return { pdfBytes: new Uint8Array(pdfBytes), pageCount: 0, costDeducted: 0 };
  }

  // A. Fetch banner image bytes & QR Code image bytes
  const bannerUrl = await resolveCampaignBannerUrl(campaign);
  let bannerImage: any = null;
  if (bannerUrl) {
    try {
      const bannerResponse = await fetch(bannerUrl);
      const imageArrayBuffer = await bannerResponse.arrayBuffer();

      if (bannerUrl.includes('.png') || bannerUrl.includes('image/png')) {
        bannerImage = await pdfDoc.embedPng(imageArrayBuffer);
      } else {
        bannerImage = await pdfDoc.embedJpg(imageArrayBuffer);
      }
    } catch (bannerError) {
      console.error('Failed to embed campaign banner inside PDF:', bannerError);
    }
  }

  let qrImage: any = null;
  if (campaign.websiteUrl) {
    try {
      const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(campaign.websiteUrl)}`;
      const qrResponse = await fetch(qrCodeApiUrl);
      const qrArrayBuffer = await qrResponse.arrayBuffer();
      qrImage = await pdfDoc.embedPng(qrArrayBuffer);
    } catch (qrError) {
      console.error('Failed to embed dynamic QR code in PDF:', qrError);
    }
  }

  // B. Apply ad placement geometries to the pages
  let ratePerPage = 0.50;
  if (campaign.placementType === 'first_page') ratePerPage = 1.50;
  else if (campaign.placementType === 'watermark') ratePerPage = 1.00;
  else if (campaign.placementType === 'coupon') ratePerPage = 2.00;

  let costDeducted = 0;

  if (campaign.placementType === 'footer') {
    // 🔲 Placement 1: Footer Banner on all pages
    const footerHeight = 45;
    const padding = 8;
    costDeducted = pageCount * ratePerPage;

    for (const page of pages) {
      const { width } = page.getSize();

      // Soft gray banner container strip
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: footerHeight + padding,
        color: rgb(0.97, 0.97, 0.99),
      });

      // Top divider accent line
      page.drawLine({
        start: { x: 0, y: footerHeight + padding },
        end: { x: width, y: footerHeight + padding },
        thickness: 1,
        color: rgb(0.88, 0.88, 0.92),
      });

      // Render ad creative banner
      if (bannerImage) {
        page.drawImage(bannerImage, {
          x: padding * 2,
          y: padding / 2,
          width: width * 0.55,
          height: footerHeight,
        });
      } else {
        page.drawText(`Sponsored by ${campaign.brandName}`, {
          x: padding * 2,
          y: footerHeight / 2 + 2,
          size: 11,
          color: rgb(0.3, 0.1, 0.7),
        });
      }

      // Action Tagline
      const cta = campaign.ctaText || 'Scan & Get Offer';
      page.drawText(cta, {
        x: width - (qrImage ? footerHeight + 115 : 120),
        y: footerHeight / 2 + 2,
        size: 9,
        color: rgb(0.4, 0.4, 0.5),
      });

      // Dynamic QR Code Stamping
      if (qrImage) {
        page.drawImage(qrImage, {
          x: width - footerHeight - padding * 2,
          y: padding / 2,
          width: footerHeight,
          height: footerHeight,
        });
      }
    }

  } else if (campaign.placementType === 'first_page') {
    // 📄 Placement 2: Header Card on the very first page
    costDeducted = ratePerPage; // Flat cover fee
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    const cardHeight = 90;
    const cardWidth = width - 40;
    const cardX = 20;
    const cardY = height - cardHeight - 20;

    // Premium card container with borders
    firstPage.drawRectangle({
      x: cardX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      color: rgb(0.98, 0.98, 1.0),
    });

    firstPage.drawRectangle({
      x: cardX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      borderColor: rgb(0.55, 0.35, 0.95),
      borderWidth: 1.5,
    });

    // Draw ad creative banner inside card
    if (bannerImage) {
      firstPage.drawImage(bannerImage, {
        x: cardX + 15,
        y: cardY + 12,
        width: cardWidth * 0.6,
        height: cardHeight - 24,
      });
    } else {
      firstPage.drawText(`${campaign.brandName} Campus Deal`, {
        x: cardX + 15,
        y: cardY + cardHeight / 2 - 4,
        size: 14,
        color: rgb(0.1, 0.1, 0.3),
      });
    }

    // QR Code
    if (qrImage) {
      const qrSize = cardHeight - 24;
      firstPage.drawImage(qrImage, {
        x: cardX + cardWidth - qrSize - 15,
        y: cardY + 12,
        width: qrSize,
        height: qrSize,
      });

      // Small CTA floating text
      firstPage.drawText(campaign.ctaText || 'Scan Coupon', {
        x: cardX + cardWidth - qrSize - 15,
        y: cardY + cardHeight - 10,
        size: 7,
        color: rgb(0.55, 0.35, 0.95),
      });
    }

  } else if (campaign.placementType === 'watermark') {
    // 🌫️ Placement 3: Central Watermark Background
    costDeducted = pageCount * ratePerPage;
    if (bannerImage) {
      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawImage(bannerImage, {
          x: width / 2 - 150,
          y: height / 2 - 100,
          width: 300,
          height: 200,
          opacity: 0.08, // Very subtle, does not hinder reading text
        });
      }
    }

  } else if (campaign.placementType === 'coupon') {
    // 🎟️ Placement 4: Full Standalone Separation Page at the end
    costDeducted = ratePerPage; // Flat flyer fee
    const couponPage = pdfDoc.addPage();
    const { width, height } = couponPage.getSize();

    // Elegant separator border frame
    couponPage.drawRectangle({
      x: 25,
      y: 25,
      width: width - 50,
      height: height - 50,
      borderColor: rgb(0.4, 0.2, 0.8),
      borderWidth: 2,
    });

    // Heading Title
    couponPage.drawText('QUICKXEROX EXCLUSIVE DEALS', {
      x: width / 2 - 150,
      y: height - 80,
      size: 18,
      color: rgb(0.3, 0.1, 0.7),
    });

    // Subtitle
    couponPage.drawText('Special discounts brought to you by our local campus sponsors.', {
      x: width / 2 - 190,
      y: height - 105,
      size: 10,
      color: rgb(0.5, 0.5, 0.6),
    });

    // Full sized banner
    if (bannerImage) {
      couponPage.drawImage(bannerImage, {
        x: 50,
        y: height / 2 - 70,
        width: width - 100,
        height: 220,
      });
    }

    // Huge QR code coupon redemption zone
    if (qrImage) {
      const qrSize = 130;
      couponPage.drawImage(qrImage, {
        x: width / 2 - qrSize / 2,
        y: 110,
        width: qrSize,
        height: qrSize,
      });

      couponPage.drawText(campaign.ctaText || 'Scan To Redeem Deal', {
        x: width / 2 - 65,
        y: 80,
        size: 11,
        color: rgb(0.3, 0.1, 0.7),
      });
    }
  }

  // C. Save the modified document
  const stampedBytes = await pdfDoc.save();

  // D. Perform real-time balance updates inside Firestore transactionally
  try {
    const campaignRef = doc(db, 'campaigns', campaign.id);
    const newSpent = campaign.spent + costDeducted;

    // Update impressions and spent budget
    await updateDoc(campaignRef, {
      spent: increment(costDeducted),
      impressions: increment(pageCount),
      updatedAt: serverTimestamp()
    });

    // E. If budget is fully exhausted, mark it completed in real-time!
    if (newSpent >= campaign.budget) {
      await updateDoc(campaignRef, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      console.log(`PDF Ad Engine: Campaign "${campaign.name}" has exhausted its budget and is now complete.`);
    }

  } catch (statError) {
    console.error('Error logging campaign stats / budget deductions:', statError);
  }

  return { pdfBytes: stampedBytes, pageCount, costDeducted };
};
