const fs = require('fs');
const { getFont } = require('./invoice-fonts');
const { resolveInvoiceLogoPath } = require('./invoice-logo-path');
const { resolveInvoiceDocumentType } = require('./invoice-document-type');
const { isInvoiceVatEnabled } = require('./invoice-vat');
const PDFDocument = require('pdfkit');

// Helper to sanitize unicode text into standard WinAnsi / ASCII safe characters for PDFKit Helvetica font
function sanitizeText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/₦/g, 'NGN ')
    .replace(/€/g, 'EUR ')
    .replace(/£/g, 'GBP ')
    .replace(/₹/g, 'INR ')
    .replace(/₵/g, 'GHS ')
    .replace(/¥/g, 'JPY ')
    .replace(/zł/g, 'PLN ')
    .replace(/\bkr\b/g, 'SEK ')
    .replace(/R\$/g, 'BRL ')
    .replace(/KSh/g, 'KES ')
    // Keep the South African rand symbol as-is; it is not a general text replacement.
    .replace(/₱/g, 'PHP ')
    .replace(/₫/g, 'VND ')
    .replace(/฿/g, 'THB ')
    .replace(/₺/g, 'TRY ')
    .replace(/₸/g, 'KZT ')
    .replace(/E£/g, 'EGP ')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/’/g, "'")
    .replace(/‘/g, "'")
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/•/g, '*')
    .replace(/[^\x00-\x7F]/g, ''); // strip any remaining non-ASCII characters
}

function generateInvoicePDF(invoice, items, settings = {}, requestedDocumentType) {
  return new Promise((resolve, reject) => {
    try {
      // Font size design tokens
      const FONT_COMPANY = 16;
      const FONT_TITLE = 18;
      const FONT_INVOICE_NUM = 12;
      const FONT_TABLE_HEADER = 10;
      const FONT_BODY = 10;
      const FONT_TOTALS_LABEL = 11;
      const FONT_TOTAL_AMOUNT = 13;
      const FONT_BALANCE = 12;
      const FONT_FINE = 8;
      const fontDef = getFont(invoice.invoice_font);
      const FACE_REGULAR = fontDef.pdf.regular;
      const FACE_BOLD = fontDef.pdf.bold;
      const FACE_ITALIC = fontDef.pdf.italic || 'Times-Italic';

      const headerRowHeight = 22;
      const maxY = 720; // Printable threshold before adding a page

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const rawCurrency = settings.currency_symbol || '$';
      const sanitizedCurrency = sanitizeText(rawCurrency.trim());
      const currency = (sanitizedCurrency && sanitizedCurrency.length > 0) ? (sanitizedCurrency.endsWith(' ') ? sanitizedCurrency : `${sanitizedCurrency} `) : '$ ';

      const leftMargin = 50;
      const rightMargin = 50;
      const cellPadding = 10;
      const pageWidth = doc.page.width; // 595.28
      const rightEdge = pageWidth - rightMargin; // 545.28
      const tableWidth = rightEdge - leftMargin; // 495.28
      const rightColX = 330;
      const rightColWidth = rightEdge - rightColX; // 215.28
      const descX = leftMargin + cellPadding; // 60
      const valX = 420;                          // value column x (totals/bank)
      const valWidth = rightEdge - valX;         // 125.28 pt

      // --- Header: Company Name & Contact ---
      const logoPath = settings.invoice_logo_path ? resolveInvoiceLogoPath(settings.invoice_logo_path) : '';
      const hasLogo = Boolean(settings.invoice_logo_enabled && logoPath && fs.existsSync(logoPath));
      const showCompanyName = settings.invoice_company_name_enabled !== 0;

      if (hasLogo) {
        try {
          doc.image(logoPath, leftMargin, 45, { fit: [120, 40] });
        } catch (e) {
          console.warn('[PDF Generator] Could not load invoice logo image:', e.message);
        }
      }

      const companyNameY = hasLogo ? 92 : 45;
      // const companyDetailsY = hasLogo ? (showCompanyName ? 117 : 92) : (showCompanyName ? 70 : 45);
      const baseDetailsY = hasLogo ? (showCompanyName ? 117 : 92) : (showCompanyName ? 70 : 45);
      const hasTagline = Boolean(settings.tagline && settings.tagline.trim());
      const taglineY = showCompanyName ? baseDetailsY - 4 : baseDetailsY;
      const companyDetailsY = hasTagline ? taglineY + 16 : baseDetailsY;


      if (showCompanyName) {
        doc.fillColor('#000000')
          .fontSize(FONT_COMPANY)
          .font(FACE_BOLD)
          .text(sanitizeText(settings.company_name || 'My Company'), leftMargin, companyNameY);
      }

      if (hasTagline) {
        doc.fillColor('#63696a').fontSize(FONT_FINE).font(FACE_ITALIC).text(sanitizeText(settings.tagline), leftMargin, taglineY, { width: 260 })
      }

      doc.fillColor('#63696a').fontSize(FONT_FINE).font(FACE_REGULAR);
      if (settings.address) {
        doc.text(sanitizeText(settings.address), leftMargin, companyDetailsY, { width: 260 });
      }

      const contactLine = [settings.email, settings.phone].filter(Boolean).map(sanitizeText).join(' * ');
      if (contactLine) {
        doc.text(contactLine, leftMargin, doc.y + 2);
      }
      const companyHeaderBottomY = doc.y;

      // --- Header: Invoice/Receipt Title & Number ---
      const isPaid = invoice.status === 'paid';
      const isReceipt = resolveInvoiceDocumentType(invoice, requestedDocumentType) === 'receipt';
      const docTitle = isReceipt ? 'RECEIPT' : 'INVOICE';
      doc.fillColor('#1f2421')
        .fontSize(FONT_TITLE)
        .font(FACE_BOLD)
        .text(docTitle, rightColX, 45, { align: 'right', width: rightColWidth });

      const headerNum = (isReceipt && invoice.receipt_number) ? invoice.receipt_number : (invoice.invoice_number || 'INV-0000');
      doc.fillColor('#000000')
        .fontSize(FONT_INVOICE_NUM)
        .font(FACE_BOLD)
        .text(sanitizeText(headerNum), rightColX, 72, { align: 'right', width: rightColWidth });

      const invoiceHeaderBottomY = doc.y;
      const topDividerY = Math.max(companyHeaderBottomY + 15, invoiceHeaderBottomY + 15, 110);

      doc.moveTo(leftMargin, topDividerY).lineTo(rightEdge, topDividerY).strokeColor('#e2e0d6').lineWidth(1).stroke();

      // --- Party Details (Billed To & Invoice Dates) ---
      const partyY = topDividerY + 15;

      // Billed To (Left Column)
      doc.fillColor('#63696a').fontSize(FONT_FINE).font(FACE_BOLD).text('BILLED TO', leftMargin, partyY);
      doc.fillColor('#1f2421').fontSize(FONT_BODY + 1).font(FACE_BOLD).text(sanitizeText(invoice.client_name || 'Client Name'), leftMargin, partyY + 14);

      doc.fillColor('#63696a').fontSize(FONT_BODY).font(FACE_REGULAR);
      let currentClientY = partyY + 28;

      if (invoice.client_address) {
        doc.text(sanitizeText(invoice.client_address), leftMargin, currentClientY, { width: 250 });
        currentClientY = doc.y + 2;
      }
      if (invoice.client_email) {
        doc.text(sanitizeText(invoice.client_email), leftMargin, currentClientY);
        currentClientY = doc.y + 2;
      }
      if (invoice.client_tax_id) {
        doc.fillColor('#9a9d94').fontSize(FONT_FINE).font(FACE_REGULAR)
          .text(`Tax ID: ${sanitizeText(invoice.client_tax_id)}`, leftMargin, currentClientY);
        currentClientY = doc.y + 2;
      }

      // Details (Right Column)
      doc.fillColor('#1f2421').fontSize(FONT_BODY).font(FACE_REGULAR);

      let detailsY = partyY;
      if (isReceipt && invoice.receipt_number) {
        doc.text(`Receipt Serial No: ${sanitizeText(invoice.receipt_number)}`, rightColX, detailsY, { align: 'right', width: rightColWidth });
        detailsY += 14;
        doc.text(`Invoice No: ${sanitizeText(invoice.invoice_number || 'N/A')}`, rightColX, detailsY, { align: 'right', width: rightColWidth });
        detailsY += 14;
      } else {
        doc.text(`Invoice No: ${sanitizeText(invoice.invoice_number || 'N/A')}`, rightColX, detailsY, { align: 'right', width: rightColWidth });
        detailsY += 14;
      }
      doc.text(`Date: ${sanitizeText(invoice.issue_date || 'N/A')}`, rightColX, detailsY, { align: 'right', width: rightColWidth });
      detailsY += 14;
      if (invoice.due_date) {
        doc.text(`Due Date: ${sanitizeText(invoice.due_date)}`, rightColX, detailsY, { align: 'right', width: rightColWidth });
        detailsY += 14;
      }

      // Helper to render table headers
      const isDescInvoice = invoice.invoice_type === 'description';
      const hasDiscount = (items || []).some(it => Number(it.tax_rate) > 0);
      const descColWidth = isDescInvoice ? (hasDiscount ? 225 : 240) : (hasDiscount ? 165 : 180);

      function renderTableHeader(y) {
        doc.rect(leftMargin, y, tableWidth, headerRowHeight).fill('#000000');
        doc.fillColor('#ffffff').fontSize(FONT_TABLE_HEADER).font(FACE_BOLD);
        doc.text(isDescInvoice ? 'Service' : 'Description', descX, y + 6, { width: descColWidth });
        if (!isDescInvoice) {
          if (hasDiscount) {
            doc.text('Qty', 230, y + 6, { width: 40, align: 'center' });
            doc.text('Unit Price', 275, y + 6, { width: 95, align: 'right' });
            doc.text('Discount', 375, y + 6, { width: 55, align: 'center' });
            doc.text('Amount', 435, y + 6, { width: 100, align: 'right' });
          } else {
            doc.text('Qty', 250, y + 6, { width: 40, align: 'center' });
            doc.text('Unit Price', 310, y + 6, { width: 95, align: 'right' });
            doc.text('Amount', 435, y + 6, { width: 100, align: 'right' });
          }
        } else {
          if (hasDiscount) {
            doc.text('Price', 290, y + 6, { width: 95, align: 'right' });
            doc.text('Discount', 390, y + 6, { width: 45, align: 'center' });
            doc.text('Amount', 440, y + 6, { width: 95, align: 'right' });
          } else {
            doc.text('Price', 315, y + 6, { width: 95, align: 'right' });
            doc.text('Amount', 440, y + 6, { width: 95, align: 'right' });
          }
        }
      }

      let tableY = Math.max(currentClientY + 20, detailsY + 10);
      const invoiceTitle = sanitizeText(invoice.service_title || '');
      if (invoiceTitle) {
        doc.fillColor('#1f2421').fontSize(FONT_BODY + 2).font(FACE_BOLD)
          .text(invoiceTitle, leftMargin, tableY, { width: tableWidth });
        tableY = doc.y + 2;
      }
      renderTableHeader(tableY);
      tableY += headerRowHeight;

      // --- Table Items ---
      (items || []).forEach((item, index) => {
        const descStr = sanitizeText(item.description || '');
        doc.font(FACE_REGULAR).fontSize(FONT_BODY);

        const descHeight = doc.heightOfString(descStr, { width: descColWidth });
        const currentRowHeight = Math.max(22, Math.ceil(descHeight) + 12);

        // Page overflow check
        if (tableY + currentRowHeight > maxY) {
          doc.moveTo(leftMargin, tableY).lineTo(rightEdge, tableY).strokeColor('#e2e0d6').lineWidth(1).stroke();
          doc.addPage();
          tableY = 50;

          // Header on continued page
          doc.fillColor('#1f2421').fontSize(12).font(FACE_BOLD)
            .text(`${docTitle} ${sanitizeText(invoice.invoice_number || '')} (cont.)`, leftMargin, tableY);
          tableY += 20;

          renderTableHeader(tableY);
          tableY += headerRowHeight;
        }

        if (index % 2 === 1) {
          doc.rect(leftMargin, tableY, tableWidth, currentRowHeight).fill('#f9f8f4');
        }

        const qty = parseInt(item.quantity, 10) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const taxRate = parseFloat(item.tax_rate) || 0;
        const lineTotal = parseFloat(item.line_total) || (qty * unitPrice * (1 - taxRate / 100));

        doc.fillColor('#1f2421');

        doc.font(FACE_REGULAR).fontSize(FONT_BODY).text(descStr, descX, tableY + 6, { width: descColWidth });

        // Price/qty/discount/amount columns (aligned to top of row)
        const colTextY = tableY + 6;
        doc.fillColor('#1f2421').font(FACE_REGULAR).fontSize(FONT_BODY);
        if (!isDescInvoice) {
          if (hasDiscount) {
            doc.text(String(qty), 230, colTextY, { width: 40, align: 'center' });
            doc.text(`${currency}${unitPrice.toFixed(2)}`, 275, colTextY, { width: 95, align: 'right' });
            doc.text(`${taxRate}%`, 375, colTextY, { width: 55, align: 'center' });
            doc.text(`${currency}${lineTotal.toFixed(2)}`, 435, colTextY, { width: 100, align: 'right' });
          } else {
            doc.text(String(qty), 250, colTextY, { width: 40, align: 'center' });
            doc.text(`${currency}${unitPrice.toFixed(2)}`, 310, colTextY, { width: 95, align: 'right' });
            doc.text(`${currency}${lineTotal.toFixed(2)}`, 435, colTextY, { width: 100, align: 'right' });
          }
        } else {
          if (hasDiscount) {
            doc.text(`${currency}${unitPrice.toFixed(2)}`, 290, colTextY, { width: 95, align: 'right' });
            doc.text(`${taxRate}%`, 390, colTextY, { width: 45, align: 'center' });
            doc.text(`${currency}${lineTotal.toFixed(2)}`, 440, colTextY, { width: 95, align: 'right' });
          } else {
            doc.text(`${currency}${unitPrice.toFixed(2)}`, 315, colTextY, { width: 95, align: 'right' });
            doc.text(`${currency}${lineTotal.toFixed(2)}`, 440, colTextY, { width: 95, align: 'right' });
          }
        }

        tableY += currentRowHeight;
      });

      // Bottom border line for line items table
      doc.moveTo(leftMargin, tableY).lineTo(rightEdge, tableY).strokeColor('#e2e0d6').lineWidth(1).stroke();

      // Check if Totals + Bank + Notes section will fit — now they stack vertically
      // Estimate: totals ~80pt, bank ~80pt, notes ~50pt = ~210pt minimum
      if (tableY + 220 > maxY) {
        doc.addPage();
        tableY = 50;
      }

      // --- Totals Section ---
      let totalsY = tableY + 20;

      const subtotal = parseFloat(invoice.subtotal) || 0;
      const vatRate = (invoice.vat_rate !== undefined && invoice.vat_rate !== null && Number(invoice.vat_rate) > 0)
        ? Number(invoice.vat_rate)
        : (settings && settings.default_vat_rate !== undefined && settings.default_vat_rate !== null ? Number(settings.default_vat_rate) : 7.5);
      const vatAmount = isInvoiceVatEnabled(invoice)
        ? (parseFloat(invoice.vat_amount !== undefined && invoice.vat_amount !== null && invoice.vat_amount > 0 ? invoice.vat_amount : (subtotal * (vatRate / 100))) || 0)
        : 0;
      const totalDue = parseFloat(invoice.total !== undefined && invoice.total !== null ? invoice.total : (subtotal + vatAmount)) || (subtotal + vatAmount);
      const paid = parseFloat(invoice.amount_paid) || 0;
      const balance = Math.max(0, totalDue - paid);

      // Thin rule above totals
      // doc.moveTo(leftMargin, totalsY - 5).lineTo(rightEdge, totalsY - 5).strokeColor('#e2e0d6').lineWidth(0.5).stroke();

      // Subtotal
      doc.fillColor('#63696a').fontSize(FONT_TOTALS_LABEL).font(FACE_REGULAR)
        .text('Subtotal:', leftMargin, totalsY, { width: tableWidth - valWidth, align: 'left', lineBreak: false });
      doc.fillColor('#1f2421').fontSize(FONT_TOTALS_LABEL).font(FACE_REGULAR)
        .text(`${currency}${subtotal.toFixed(2)}`, valX, totalsY, { width: valWidth, align: 'right', lineBreak: false });

      if (isInvoiceVatEnabled(invoice)) {
        totalsY += 18;
        doc.fillColor('#63696a').fontSize(FONT_TOTALS_LABEL).font(FACE_REGULAR)
          .text(`VAT (${vatRate}%):`, leftMargin, totalsY, { width: tableWidth - valWidth, align: 'left', lineBreak: false });
        doc.fillColor('#1f2421').fontSize(FONT_TOTALS_LABEL).font(FACE_REGULAR)
          .text(`${currency}${vatAmount.toFixed(2)}`, valX, totalsY, { width: valWidth, align: 'right', lineBreak: false });
      }

      // Bold rule + Total Due
      totalsY += 20;
      doc.moveTo(leftMargin, totalsY - 6).lineTo(rightEdge, totalsY - 6).strokeColor('#000000').lineWidth(1.5).stroke();
      doc.fillColor('#1f2421').fontSize(FONT_TOTAL_AMOUNT).font(FACE_BOLD)
        .text('Total Due:', leftMargin, totalsY, { width: tableWidth - valWidth, align: 'left', lineBreak: false });
      doc.fillColor('#1f2421').fontSize(FONT_TOTAL_AMOUNT).font(FACE_BOLD)
        .text(`${currency}${totalDue.toFixed(2)}`, valX, totalsY, { width: valWidth, align: 'right', lineBreak: false });

      if (isPaid || paid > 0) {
        totalsY += 20;
        doc.fillColor('#63696a').fontSize(FONT_TOTALS_LABEL).font(FACE_REGULAR)
          .text('Amount Paid:', leftMargin, totalsY, { width: tableWidth - valWidth, align: 'left', lineBreak: false });
        doc.fillColor('#1f2421').fontSize(FONT_TOTALS_LABEL).font(FACE_REGULAR)
          .text(`${currency}${paid.toFixed(2)}`, valX, totalsY, { width: valWidth, align: 'right', lineBreak: false });

        if (balance > 0.0001) {
          totalsY += 18;
          doc.fillColor('#1f2421').fontSize(FONT_BALANCE).font(FACE_BOLD)
            .text('Balance Due:', leftMargin, totalsY, { width: tableWidth - valWidth, align: 'left', lineBreak: false });
          doc.fillColor('#1f2421').fontSize(FONT_BALANCE).font(FACE_BOLD)
            .text(`${currency}${balance.toFixed(2)}`, valX, totalsY, { width: valWidth, align: 'right', lineBreak: false });
        }
      }

      // Advance totalsY past the last row text height
      totalsY += 18;

      // --- Bank Details (below totals, full width) ---
      const showBankDetails = settings.invoice_bank_details_enabled !== 0;
      const bName = invoice.bank_id ? invoice.bank_name : (invoice.bank_name || settings.bank_name);
      const bAcctName = invoice.bank_id ? invoice.bank_account_name : (invoice.bank_account_name || settings.bank_account_name);
      const bAcctNum = invoice.bank_id ? invoice.bank_account_number : (invoice.bank_account_number || settings.bank_account_number);
      const bNotes = invoice.bank_id ? null : settings.bank_notes; // only show notes from settings if no specific bank selected
      const hasBankDetails = showBankDetails && Boolean(bName || bAcctName || bAcctNum);
      let bankBottomY = totalsY;

      if (hasBankDetails) {
        // Page break if bank section won't fit
        if (totalsY + 80 > maxY) {
          doc.addPage();
          totalsY = 50;
        }

        let bankY = totalsY + 14;

        // Thin rule + section label
        doc.moveTo(leftMargin, bankY - 6).lineTo(rightEdge, bankY - 6).strokeColor('#e2e0d6').lineWidth(0.5).stroke();

        bankY += 14;

        if (bName) {
          doc.fillColor('#63696a').fontSize(FONT_TOTALS_LABEL).font(FACE_REGULAR)
            .text('Bank:', leftMargin, bankY, { width: 110, align: 'left', lineBreak: false });
          doc.fillColor('#1f2421').fontSize(FONT_TOTALS_LABEL).font(FACE_BOLD)
            .text(sanitizeText(bName), leftMargin + 110, bankY, { width: tableWidth - 110, align: 'left', lineBreak: false });
          bankY += 16;
        }
        if (bAcctName) {
          doc.fillColor('#63696a').fontSize(FONT_TOTALS_LABEL).font(FACE_REGULAR)
            .text('Account Name:', leftMargin, bankY, { width: 110, align: 'left', lineBreak: false });
          doc.fillColor('#1f2421').fontSize(FONT_TOTALS_LABEL).font(FACE_BOLD)
            .text(sanitizeText(bAcctName), leftMargin + 110, bankY, { width: tableWidth - 110, align: 'left', lineBreak: false });
          bankY += 16;
        }
        if (bAcctNum) {
          doc.fillColor('#63696a').fontSize(FONT_TOTALS_LABEL).font(FACE_REGULAR)
            .text('Account No:', leftMargin, bankY, { width: 110, align: 'left', lineBreak: false });
          doc.fillColor('#1f2421').fontSize(FONT_TOTALS_LABEL).font(FACE_BOLD)
            .text(sanitizeText(bAcctNum), leftMargin + 110, bankY, { width: tableWidth - 110, align: 'left', lineBreak: false });
          bankY += 16;
        }
        if (bNotes) {
          doc.fillColor('#63696a').fontSize(FONT_FINE).font(FACE_REGULAR)
            .text(sanitizeText(bNotes), leftMargin, bankY, { width: tableWidth });
          bankY += 14;
        }
        bankBottomY = bankY;
      }

      // --- Notes / Terms ---
      if (invoice.notes) {
        let notesY = bankBottomY + 16;
        if (notesY + 40 > maxY) {
          doc.addPage();
          notesY = 50;
        }
        doc.fillColor('#63696a').fontSize(FONT_FINE).font(FACE_BOLD)
          .text('NOTES / TERMS', leftMargin, notesY);
        doc.fillColor('#1f2421').fontSize(FONT_BODY).font(FACE_REGULAR)
          .text(sanitizeText(invoice.notes), leftMargin, notesY + 12, { width: tableWidth });
        bankBottomY = doc.y;
      }

      const signaturePath = settings.invoice_signature_path;
      if (signaturePath && fs.existsSync(signaturePath)) {
        let signatureY = bankBottomY + 16;
        if (signatureY + 82 > maxY) {
          doc.addPage();
          signatureY = 50;
        }
        try {
          doc.image(signaturePath, leftMargin, signatureY, { fit: [180, 56] });
          doc.moveTo(leftMargin, signatureY + 62).lineTo(leftMargin + 180, signatureY + 62)
            .strokeColor('#94a3b8').lineWidth(0.5).stroke();
          doc.fillColor('#63696a').fontSize(FONT_FINE).font(FACE_REGULAR)
            .text('Authorized signature', leftMargin, signatureY + 66);
        } catch (err) {
          console.warn('[PDF Generator] Could not load invoice signature image:', err.message);
        }
      }

      // Footer
      const footerY = 780;
      doc.fillColor('#9a9d94').fontSize(FONT_FINE).font(FACE_REGULAR)
        .text(`Thank you for doing business with ${sanitizeText(showCompanyName ? (settings.company_name || 'us') : 'us')}!`, leftMargin, footerY, { align: 'center', width: tableWidth });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePDF, sanitizeText };