import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '../types';

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = (error) => {
            reject(error);
        };
        img.src = url;
    });
};

export const generateInvoice = async (order: Order, userEmail?: string, returnBlob: boolean = false) => {
    const doc = new jsPDF();

    // Company Logo
    try {
        const logoUrl = '/logo_invoice.png';
        const imgData = await getBase64ImageFromURL(logoUrl);
        const imgProps = doc.getImageProperties(imgData);
        const imgWidth = 50;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        doc.addImage(imgData, 'PNG', 14, 10, imgWidth, imgHeight);

        const startY = 15 + imgHeight;
        doc.setFontSize(10);
        doc.text('Print from Anywhere, Pick up Anytime', 14, startY);
        doc.text('www.quickxerox.app', 14, startY + 5);
        doc.text('Support: support@quickxerox.app', 14, startY + 10);
    } catch (err) {
        console.error('Error loading logo:', err);
        doc.setFontSize(22);
        doc.text('QuickXerox', 14, 20);
        doc.setFontSize(10);
        doc.text('Print from Anywhere, Pick up Anytime', 14, 26);
        doc.text('www.quickxerox.app', 14, 31);
        doc.text('Support: support@quickxerox.app', 14, 36);
    }

    // Invoice Title
    doc.setFontSize(18);
    doc.text('INVOICE', 140, 20);

    // Invoice Details
    doc.setFontSize(10);
    doc.text(`Invoice No: INV-${order.id.slice(-8).toUpperCase()}`, 140, 30);
    doc.text(`Date: ${new Date(order.timestamp).toLocaleDateString()}`, 140, 35);
    if (order.paymentId) {
        doc.text(`Payment ID: ${order.paymentId}`, 140, 40);
    }
    doc.text(`Status: ${order.status.toUpperCase()}`, 140, 45);

    // Bill To
    doc.text('Bill To:', 14, 55);
    doc.setFontSize(12);
    doc.text(order.customerName || 'Customer', 14, 61);
    doc.setFontSize(10);
    let currentY = 66;
    if (order.customerPhone) {
        doc.text(`Phone: ${order.customerPhone}`, 14, currentY);
        currentY += 5;
    }
    if (userEmail) {
        doc.text(`Email: ${userEmail}`, 14, currentY);
    }

    // Items Table
    const tableColumn = ["Item", "Description", "Copies", "Cost"];
    const tableRows: any[] = [];

    order.items.forEach(item => {
        const itemData = [
            item.fileName,
            `${item.pages} pages • ${item.isColor ? 'Color' : 'B/W'}`,
            item.copies,
            // Since we don't have individual item cost in the OrderItem interface yet (based on previous view),
            // we might need to approximate or just show total. 
            // Assuming a standard rate for now or if we can calculate it.
            // Let's just put "-" for individual cost if not available, or calculate if possible.
            // For now, let's leave cost column or put " - "
            "-"
        ];
        tableRows.push(itemData);
    });

    autoTable(doc, {
        startY: 80,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 133, 244] }, // Blue header
    });

    // Total
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.text(`Total Amount: INR ${order.total.toFixed(2)}`, 140, finalY);

    // Footer
    doc.setFontSize(10);
    doc.text('Thank you for choosing QuickXerox!', 14, finalY + 20);
    doc.text('This is a computer-generated invoice.', 14, finalY + 26);


    if (returnBlob) {
        return doc.output('blob');
    } else {
        doc.save(`Invoice_QuickXerox_${order.id}.pdf`);
    }
};
