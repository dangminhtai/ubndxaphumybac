import fs from 'fs';
import path from 'path';
import type { DocumentCatalogItem, DocumentCatalogPayload } from '../types/document-catalog';

const catalogPath = path.resolve(__dirname, '../../../data/document-catalog/danh-muc-chung.json');
const codePattern = /^CH\.(VT|TH|TC|PC|CC|KH)\.\d{2}$/;

function loadCatalog(): DocumentCatalogPayload {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Thiếu dữ liệu danh mục công việc: ${catalogPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as DocumentCatalogPayload;
  if (!Array.isArray(payload.items) || payload.items.length !== 80) {
    throw new Error('Dữ liệu danh mục công việc phải có đúng 80 mục');
  }

  const codes = new Set<string>();
  for (const item of payload.items) {
    if (!codePattern.test(item.code)) {
      throw new Error(`Mã danh mục không hợp lệ: ${item.code}`);
    }
    if (codes.has(item.code)) {
      throw new Error(`Mã danh mục bị trùng: ${item.code}`);
    }
    if (!item.taskName?.trim() || !item.outputProduct?.trim()) {
      throw new Error(`Mục danh mục thiếu dữ liệu bắt buộc: ${item.code}`);
    }
    codes.add(item.code);
  }

  return payload;
}

const catalog = loadCatalog();

export function getDocumentCatalogPayload() {
  return catalog;
}

export function getDocumentCatalogItems(): DocumentCatalogItem[] {
  return catalog.items;
}
