// ─── Documentos Types ──────────────────────────────────────
import { FileText, FileSpreadsheet, Image as ImageIcon, FileArchive, File, type LucideIcon } from "lucide-react";

export interface Documento {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    size: number | null;
    folder_path: string | null;
    user_id: string;
    organization_id: string;
    process_id: string | null;
    client_id: string | null;
    created_at: string;
}

const FILE_ICONS: Record<string, LucideIcon> = {
    pdf: FileText, doc: FileText, docx: FileText, txt: FileText,
    xls: FileSpreadsheet, xlsx: FileSpreadsheet, csv: FileSpreadsheet,
    jpg: ImageIcon, jpeg: ImageIcon, png: ImageIcon, webp: ImageIcon, svg: ImageIcon,
    zip: FileArchive, rar: FileArchive, "7z": FileArchive,
};

export function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return FILE_ICONS[ext] || File;
}

export function formatFileSize(bytes?: number | null) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
