import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Prepends a cover page with the Order ID and Customer Name to a PDF file.
 * Handles both existing PDFs and image files (by converting images to a single-page PDF first).
 */
export const prependOrderCoverPage = async (
    file: File,
    orderId: string,
    customerName: string
): Promise<File> => {
    try {
        let pdfDoc: PDFDocument;

        // 1. Load the existing file into a PDFDocument
        if (file.type === 'application/pdf') {
            const existingPdfBytes = await file.arrayBuffer();
            pdfDoc = await PDFDocument.load(existingPdfBytes);
        } else if (file.type.startsWith('image/')) {
            // If it's an image, create a new PDF and embed the image
            pdfDoc = await PDFDocument.create();
            const imageBytes = await file.arrayBuffer();

            let image;
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                image = await pdfDoc.embedJpg(imageBytes);
            } else if (file.type === 'image/png') {
                image = await pdfDoc.embedPng(imageBytes);
            } else {
                throw new Error(`Unsupported image type for PDF conversion: ${file.type}`);
            }

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        } else {
            // If it's a DOCX or other unsupported type, return as-is for now (since we can't easily manipulate DOCX in browser)
            // Note: Ideally, DOCX should be converted to PDF server-side before printing anyway.
            console.warn(`Cover page cannot be added to non-PDF/Image file type: ${file.type}. Returning original file.`);
            return file;
        }

        // 2. Create the new Cover Page (A4 size: 595.28 x 841.89 points)
        const coverPage = pdfDoc.insertPage(0, [595.28, 841.89]);
        const { width, height } = coverPage.getSize();

        // 3. Setup Fonts and Styling
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const helveticaRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // 4. Draw Content centered
        const titleText = 'QuickXerox Print Order';
        const titleSize = 36;
        const titleWidth = helveticaFont.widthOfTextAtSize(titleText, titleSize);

        coverPage.drawText(titleText, {
            x: (width - titleWidth) / 2,
            y: height - 150,
            size: titleSize,
            font: helveticaFont,
            color: rgb(0, 0.4, 0.8), // Blue-ish
        });

        const orderText = `Order ID: ${orderId}`;
        const orderSize = 24;
        const orderWidth = helveticaRegular.widthOfTextAtSize(orderText, orderSize);

        coverPage.drawText(orderText, {
            x: (width - orderWidth) / 2,
            y: height - 250,
            size: orderSize,
            font: helveticaRegular,
            color: rgb(0.2, 0.2, 0.2),
        });

        const nameText = `Customer Name: ${customerName}`;
        const nameSize = 24;
        const nameWidth = helveticaRegular.widthOfTextAtSize(nameText, nameSize);

        coverPage.drawText(nameText, {
            x: (width - nameWidth) / 2,
            y: height - 300,
            size: nameSize,
            font: helveticaRegular,
            color: rgb(0.2, 0.2, 0.2),
        });

        // Add a divider line
        coverPage.drawLine({
            start: { x: 50, y: height - 350 },
            end: { x: width - 50, y: height - 350 },
            thickness: 2,
            color: rgb(0.8, 0.8, 0.8)
        });

        // 5. Serialize and return as a new File object
        const modifiedPdfBytes = await pdfDoc.save();

        // Change extension to .pdf if it was an image
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".pdf";

        return new File([modifiedPdfBytes.buffer as ArrayBuffer], newFileName, {
            type: 'application/pdf',
            lastModified: Date.now(),
        });

    } catch (error) {
        console.error('Error prepending cover page:', error);
        // On failure, return the original file so checkout isn't completely blocked
        return file;
    }
};
