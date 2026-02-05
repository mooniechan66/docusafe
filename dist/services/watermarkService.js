"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.watermarkFile = void 0;
const fs_1 = __importDefault(require("fs"));
const pdf_lib_1 = require("pdf-lib");
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const watermarkFile = async (filePath, text) => {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
        return watermarkPdf(filePath, text);
    }
    else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        return watermarkImage(filePath, text);
    }
    else {
        throw new Error('Unsupported file type for watermarking');
    }
};
exports.watermarkFile = watermarkFile;
const watermarkPdf = async (filePath, text) => {
    const existingPdfBytes = fs_1.default.readFileSync(filePath);
    const pdfDoc = await pdf_lib_1.PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    pages.forEach((page) => {
        const { width, height } = page.getSize();
        page.drawText(text, {
            x: 50,
            y: height / 2,
            size: 30,
            color: (0, pdf_lib_1.rgb)(0.7, 0.7, 0.7), // Light gray
            rotate: (0, pdf_lib_1.degrees)(45),
            opacity: 0.5,
        });
        // Add timestamp/IP at the bottom
        page.drawText(text, {
            x: 20,
            y: 20,
            size: 12,
            color: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5),
            opacity: 0.8,
        });
    });
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
};
const watermarkImage = async (filePath, text) => {
    const image = (0, sharp_1.default)(filePath);
    const metadata = await image.metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;
    const svgImage = `
    <svg width="${width}" height="${height}">
      <style>
        .title { fill: rgba(255, 255, 255, 0.5); font-size: ${Math.min(width, height) / 10}px; font-weight: bold; }
        .footer { fill: rgba(255, 255, 255, 0.8); font-size: 20px; }
      </style>
      <text x="50%" y="50%" text-anchor="middle" class="title" transform="rotate(45, ${width / 2}, ${height / 2})">${text}</text>
      <text x="10" y="${height - 20}" class="footer">${text}</text>
    </svg>
  `;
    return image
        .composite([
        {
            input: Buffer.from(svgImage),
            top: 0,
            left: 0,
        },
    ])
        .toBuffer();
};
//# sourceMappingURL=watermarkService.js.map