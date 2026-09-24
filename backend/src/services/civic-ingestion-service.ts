import Papa from 'papaparse';
import { INormalizedRecord } from '../models/civic-dataset-model';

export const MAX_CSV_ROWS = 5000;
export const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_COLUMNS = 50;
const MAX_FIELD_LENGTH = 10_000;
const MAX_URL_LENGTH = 2048;
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

/** Supported CSV header aliases. Unknown columns are ignored. */
const HEADER_ALIASES: Record<string, keyof Omit<INormalizedRecord, 'sourceRow'>> = {
    complaintid: 'complaintId', complaint_id: 'complaintId', 'complaint id': 'complaintId', id: 'complaintId',
    title: 'title', 'issue title': 'title', issue_title: 'title', summary: 'title',
    description: 'description', details: 'description', issue_description: 'description',
    'issue description': 'description', complaint_description: 'description', 'complaint description': 'description',
    problem: 'description', body: 'description',
    category: 'category', type: 'category', issue_type: 'category', 'issue type': 'category',
    department: 'department', dept: 'department', assigned_department: 'department', 'assigned department': 'department',
    severity: 'severity', urgency: 'severity', priority_level: 'severity',
    priority: 'priority', priority_score: 'priority', 'priority score': 'priority',
    status: 'status', complaint_status: 'status', 'complaint status': 'status', current_status: 'status',
    latitude: 'latitude', lat: 'latitude', location_lat: 'latitude',
    longitude: 'longitude', lng: 'longitude', lon: 'longitude', long: 'longitude', location_lng: 'longitude',
    createdat: 'createdAt', created_at: 'createdAt', 'created at': 'createdAt', date: 'createdAt',
    submitted_at: 'createdAt', 'submitted at': 'createdAt', timestamp: 'createdAt',
    imageurl: 'imageUrl', image_url: 'imageUrl', 'image url': 'imageUrl', image: 'imageUrl', photo: 'imageUrl', photo_url: 'imageUrl',
    audiourl: 'audioUrl', audio_url: 'audioUrl', 'audio url': 'audioUrl', audio: 'audioUrl', voice: 'audioUrl', voice_url: 'audioUrl',
};

export interface ValidationError {
    row: number;
    field: string;
    message: string;
}

export interface IngestionResult {
    records: INormalizedRecord[];
    validationErrors: ValidationError[];
    recordCount: number;
    validRecordCount: number;
    invalidRecordCount: number;
    duplicateInputCount: number;
    duplicateInputRows: number[];
}

function normalizeHeader(header: string): string | undefined {
    return HEADER_ALIASES[header.trim().toLowerCase()];
}

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function validateRow(raw: Record<string, string>, sourceRow: number): { record?: INormalizedRecord; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    const get = (field: string): string | undefined => {
        const value = raw[field]?.trim();
        return value || undefined;
    };
    const bounded = (field: string, value: string | undefined, max = MAX_FIELD_LENGTH): string | undefined => {
        if (value && value.length > max) {
            errors.push({ row: sourceRow, field, message: `Value exceeds maximum length (${max} characters)` });
            return undefined;
        }
        return value;
    };

    const title = bounded('title', get('title'));
    const description = bounded('description', get('description'));
    if (!title && !description) errors.push({ row: sourceRow, field: 'description', message: 'Row must contain a title or description' });

    const complaintId = bounded('complaintId', get('complaintId'), 200);
    const category = bounded('category', get('category'));
    const department = bounded('department', get('department'));
    const priority = bounded('priority', get('priority'), 200);
    const status = bounded('status', get('status'), 200);

    let severity: INormalizedRecord['severity'];
    const rawSeverity = bounded('severity', get('severity'), 50);
    if (rawSeverity) {
        if (!SEVERITIES.has(rawSeverity.toLowerCase())) {
            errors.push({ row: sourceRow, field: 'severity', message: 'Invalid severity; expected Low, Medium, High, or Critical' });
        } else {
            severity = rawSeverity[0].toUpperCase() + rawSeverity.slice(1).toLowerCase() as INormalizedRecord['severity'];
        }
    }

    const coordinate = (field: 'latitude' | 'longitude', min: number, max: number): number | undefined => {
        const value = get(field);
        if (!value) return undefined;
        // Number() plus a full numeric syntax check rejects partial parses such as "12north".
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
            errors.push({ row: sourceRow, field, message: `Invalid ${field}; expected a number` });
            return undefined;
        }
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
            errors.push({ row: sourceRow, field, message: `Invalid ${field}; value must be between ${min} and ${max}` });
            return undefined;
        }
        return parsed;
    };
    const latitude = coordinate('latitude', -90, 90);
    const longitude = coordinate('longitude', -180, 180);

    let createdAt: Date | undefined;
    const rawCreatedAt = bounded('createdAt', get('createdAt'), 100);
    if (rawCreatedAt) {
        const timestamp = Date.parse(rawCreatedAt);
        if (!Number.isFinite(timestamp)) errors.push({ row: sourceRow, field: 'createdAt', message: 'Invalid timestamp' });
        else createdAt = new Date(timestamp);
    }

    const mediaUrl = (field: 'imageUrl' | 'audioUrl'): string | undefined => {
        const value = get(field);
        if (!value) return undefined;
        if (value.length > MAX_URL_LENGTH || !isHttpUrl(value)) {
            errors.push({ row: sourceRow, field, message: `Invalid ${field}; expected an HTTP or HTTPS URL up to ${MAX_URL_LENGTH} characters` });
            return undefined;
        }
        return value;
    };
    const imageUrl = mediaUrl('imageUrl');
    const audioUrl = mediaUrl('audioUrl');

    // Any field error invalidates the row, so malformed values never silently enter Step 3.
    if (errors.length) return { errors };

    return {
        errors,
        record: {
            sourceRow,
            description: description || title!,
            ...(complaintId && { complaintId }),
            ...(title && { title }),
            ...(category && { category }),
            ...(department && { department }),
            ...(severity && { severity }),
            ...(priority && { priority }),
            ...(status && { status }),
            ...(latitude !== undefined && { latitude }),
            ...(longitude !== undefined && { longitude }),
            ...(createdAt && { createdAt }),
            ...(imageUrl && { imageUrl }),
            ...(audioUrl && { audioUrl }),
        },
    };
}

/** Parse and validate CSV contents without accessing or modifying Complaint documents. */
export function ingestCsv(csvText: string): IngestionResult {
    if (!csvText.trim()) throw new Error('The uploaded CSV is empty.');

    const parsed = Papa.parse<Record<string, string>>(csvText, {
        delimiter: ',',
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header: string) => header.trim(),
        dynamicTyping: false,
        worker: false,
    });
    const fatalParseError = parsed.errors.find(error => error.type === 'Quotes' || error.code === 'InvalidQuotes' || error.code === 'MissingQuotes');
    if (fatalParseError) throw new Error('The uploaded CSV is malformed. Check its quoting and column structure.');

    const headers = parsed.meta.fields ?? [];
    if (!headers.length) throw new Error('The uploaded CSV must include a header row.');
    if (headers.length > MAX_COLUMNS) throw new Error(`CSV exceeds the maximum number of columns (${MAX_COLUMNS}).`);
    if (!parsed.data.length) throw new Error('The uploaded CSV contains no data rows.');
    if (parsed.data.length > MAX_CSV_ROWS) throw new Error(`CSV exceeds the maximum row count (${MAX_CSV_ROWS}).`);

    const headerMap = new Map<string, string>();
    for (const header of headers) {
        const canonical = normalizeHeader(header);
        if (canonical && ![...headerMap.values()].includes(canonical)) headerMap.set(header, canonical);
    }
    const usableFields = new Set(headerMap.values());
    if (!usableFields.has('title') && !usableFields.has('description')) {
        throw new Error('The uploaded CSV must include a title or description column.');
    }
    const errors: ValidationError[] = [];
    const records: INormalizedRecord[] = [];
    const malformedRows = new Map<number, string>();
    for (const parseError of parsed.errors) {
        if (parseError.type === 'FieldMismatch' && parseError.row !== undefined) {
            malformedRows.set(parseError.row + 2, parseError.message);
        }
    }
    let invalidRecordCount = 0;

    parsed.data.forEach((raw, index) => {
        const row: Record<string, string> = {};
        for (const [sourceHeader, canonical] of headerMap) row[canonical] = raw[sourceHeader] ?? '';
        const sourceRow = index + 2;
        const malformedRowMessage = malformedRows.get(sourceRow);
        if (malformedRowMessage) {
            errors.push({ row: sourceRow, field: 'row', message: `Malformed CSV row: ${malformedRowMessage}` });
            invalidRecordCount++;
            return;
        }
        let oversized = false;
        for (const value of Object.values(row)) {
            if (value.length > MAX_FIELD_LENGTH) {
                errors.push({ row: sourceRow, field: 'row', message: `Field exceeds maximum length (${MAX_FIELD_LENGTH} characters)` });
                oversized = true;
                break;
            }
        }
        const result = oversized ? undefined : validateRow(row, sourceRow);
        if (!result || !result.record) {
            invalidRecordCount++;
            if (result) errors.push(...result.errors);
        } else {
            records.push(result.record);
        }
    });

    const seen = new Map<string, number>();
    const duplicateInputRows: number[] = [];
    for (const record of records) {
        if (!record.complaintId) continue;
        const key = record.complaintId.toLocaleLowerCase();
        const firstRow = seen.get(key);
        if (firstRow !== undefined) {
            duplicateInputRows.push(record.sourceRow);
            errors.push({ row: record.sourceRow, field: 'complaintId', message: `Duplicate complaintId (first seen at row ${firstRow})` });
        } else seen.set(key, record.sourceRow);
    }

    // Duplicate input rows are reported separately and excluded from the Step 3 record set.
    const duplicateSet = new Set(duplicateInputRows);
    const normalizedRecords = records.filter(record => !duplicateSet.has(record.sourceRow));
    invalidRecordCount += duplicateInputRows.length;
    return {
        records: normalizedRecords,
        validationErrors: errors,
        recordCount: parsed.data.length,
        validRecordCount: normalizedRecords.length,
        invalidRecordCount,
        duplicateInputCount: duplicateInputRows.length,
        duplicateInputRows,
    };
}
