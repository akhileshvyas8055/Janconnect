import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth-middleware';
import CivicDataset, { DatasetStatus } from '../models/civic-dataset-model';
import { ingestCsv, MAX_CSV_BYTES } from '../services/civic-ingestion-service';
import CivicCluster, { ClusterRelationship, ClusterSeverity } from '../models/civic-cluster-model';
import { analyzeDataset as analyzeNormalizedDataset, DerivedCluster, haversineMeters } from '../services/civic-analysis-service';

const safeFilename = (value: string): string => value.replace(/\\/g, '/').split('/').pop()?.replace(/[\x00-\x1f\x7f]/g, '').trim() ?? '';

export const processDatasetUpload = async (req: AuthRequest, res: Response) => {
    if (typeof req.body !== 'string' || !req.body.length) {
        return res.status(400).json({ message: 'CSV file content is required.' });
    }
    if (Buffer.byteLength(req.body, 'utf8') > MAX_CSV_BYTES) {
        return res.status(413).json({ message: `CSV exceeds the maximum file size (${MAX_CSV_BYTES} bytes).` });
    }

    const filenameHeader = req.header('x-filename') || 'upload.csv';
    const filename = safeFilename(filenameHeader);
    if (!filename || !filename.toLowerCase().endsWith('.csv')) {
        return res.status(415).json({ message: 'Only .csv files are supported.' });
    }
    const sourceHeader = req.header('x-dataset-source')?.trim();
    if (sourceHeader && sourceHeader.length > 100) {
        return res.status(400).json({ message: 'Dataset source must be 100 characters or fewer.' });
    }

    try {
        const result = ingestCsv(req.body);
        const uploadedAt = new Date();
        const dataset = new CivicDataset({
            datasetId: uuidv4(),
            filename,
            recordCount: result.recordCount,
            validRecordCount: result.validRecordCount,
            invalidRecordCount: result.invalidRecordCount,
            duplicateInputCount: result.duplicateInputCount,
            uploadedBy: req.user!.id,
            uploadedAt,
            source: sourceHeader || 'User Uploaded Dataset',
            processingStatus: result.validRecordCount > 0 ? DatasetStatus.READY : DatasetStatus.FAILED,
            records: result.records,
            validationErrors: result.validationErrors,
        });
        await dataset.save();

        return res.status(201).json({
            success: true,
            dataset: {
                id: dataset.datasetId,
                filename: dataset.filename,
                recordCount: dataset.recordCount,
                validRecords: dataset.validRecordCount,
                invalidRecords: dataset.invalidRecordCount,
                duplicateInputRows: result.duplicateInputRows,
                uploadedAt: dataset.uploadedAt,
                uploadedBy: dataset.uploadedBy,
                source: dataset.source,
                processingStatus: dataset.processingStatus,
            },
            validation: {
                valid: result.invalidRecordCount === 0,
                errors: result.validationErrors,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to process the uploaded dataset.';
        // Parser validation failures are safe to show; database/internal errors are not.
        if (message.startsWith('The uploaded CSV') || message.startsWith('CSV exceeds')) {
            return res.status(400).json({ message });
        }
        console.error('[Civic Intelligence] Dataset upload failed.');
        return res.status(500).json({ message: 'Unable to save or process the uploaded dataset.' });
    }
};

const severityValue: Record<ClusterSeverity, number> = { Low: 0.25, Medium: 0.5, High: 0.75, Critical: 1 };

function mode(values: Array<string | undefined>): string | undefined {
    const counts = new Map<string, number>();
    for (const value of values) {
        const normalized = value?.trim();
        if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

function deriveCluster(cluster: DerivedCluster) {
    const records = cluster.records;
    const sourceRowsWithRelatedEvidence = new Set(cluster.relationships.flatMap(edge => edge.sourceRows));
    const nearDuplicateRows = new Set(cluster.relationships.filter(edge => edge.relationship === 'near-duplicate').flatMap(edge => edge.sourceRows));
    const coordinates = records.filter(record => record.latitude !== undefined && record.longitude !== undefined) as Array<typeof records[number] & { latitude: number; longitude: number }>;
    const centroid = coordinates.length ? {
        latitude: Number((coordinates.reduce((sum, record) => sum + record.latitude, 0) / coordinates.length).toFixed(6)),
        longitude: Number((coordinates.reduce((sum, record) => sum + record.longitude, 0) / coordinates.length).toFixed(6)),
    } : undefined;
    const geographicRadiusMeters = centroid && coordinates.length > 1
        ? Number(Math.max(...coordinates.map(record => haversineMeters(centroid.latitude, centroid.longitude, record.latitude, record.longitude))).toFixed(1))
        : undefined;
    const severity = (records.reduce<ClusterSeverity>((highest, record) => {
        const value = record.severity ?? 'Medium'; // explicit deterministic fallback for records missing severity
        return severityValue[value] > severityValue[highest] ? value : highest;
    }, 'Low'));
    const evidenceReferences = records.flatMap(record => [
        { complaintId: record.complaintId, sourceRow: record.sourceRow, type: 'description' as const, value: record.description },
        ...(record.imageUrl ? [{ complaintId: record.complaintId, sourceRow: record.sourceRow, type: 'image' as const, value: record.imageUrl }] : []),
        ...(record.audioUrl ? [{ complaintId: record.complaintId, sourceRow: record.sourceRow, type: 'audio' as const, value: record.audioUrl }] : []),
        ...(record.latitude !== undefined && record.longitude !== undefined ? [{ complaintId: record.complaintId, sourceRow: record.sourceRow, type: 'location' as const }] : []),
    ]);
    const confidence = cluster.relationships.length
        ? Number((cluster.relationships.reduce((sum, edge) => sum + edge.relationshipScore, 0) / cluster.relationships.length).toFixed(3))
        : 0.5;
    const newest = records.reduce<Date | undefined>((latest, record) => !latest || (record.createdAt && record.createdAt > latest) ? record.createdAt : latest, undefined);
    const ageDays = newest ? Math.max(0, (Date.now() - newest.getTime()) / 86_400_000) : undefined;
    const priorityFactors = {
        severity: Math.round(severityValue[severity] * 40),
        confidence: Math.round(confidence * 20),
        evidence: Math.min(15, (evidenceReferences.filter(ref => ref.type === 'image' || ref.type === 'audio').length * 3) + (coordinates.length ? 2 : 0)),
        independentReports: Math.min(10, Math.max(0, records.length - 1) * 2),
        geographicConcentration: geographicRadiusMeters === undefined ? 0 : Math.round(Math.max(0, 1 - geographicRadiusMeters / 1000) * 10),
        recency: ageDays === undefined ? 0 : Math.round(Math.exp(-ageDays / 30) * 5),
    };
    const priorityScore = Object.values(priorityFactors).reduce((sum, value) => sum + value, 0);
    const priorityLevel: ClusterSeverity = priorityScore >= 75 ? 'Critical' : priorityScore >= 55 ? 'High' : priorityScore >= 30 ? 'Medium' : 'Low';
    const title = mode(records.map(record => record.title)) ?? records[0].description.slice(0, 100);
    const category = mode(records.map(record => record.category));
    const department = mode(records.map(record => record.department));
    const reportPhrase = records.length === 1 ? 'one source complaint' : `${records.length} related source complaints`;
    const evidenceParts = [
        evidenceReferences.filter(ref => ref.type === 'image').length ? `${evidenceReferences.filter(ref => ref.type === 'image').length} image reference${evidenceReferences.filter(ref => ref.type === 'image').length === 1 ? '' : 's'}` : '',
        evidenceReferences.filter(ref => ref.type === 'audio').length ? `${evidenceReferences.filter(ref => ref.type === 'audio').length} audio reference${evidenceReferences.filter(ref => ref.type === 'audio').length === 1 ? '' : 's'}` : '',
        coordinates.length ? `${coordinates.length} location reference${coordinates.length === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    const explanation = `Priority ${priorityLevel} (${priorityScore}/100): ${reportPhrase}, ${severity} source severity, ${Math.round(confidence * 100)}% relationship confidence${geographicRadiusMeters !== undefined ? `, reports within a ${Math.round(geographicRadiusMeters)} m radius` : ''}${evidenceParts.length ? `, and ${evidenceParts.join(', ')}` : ''}.`;
    return {
        title,
        summary: `${reportPhrase} describe ${title.toLowerCase()}.`,
        ...(category && { category }),
        ...(department && { department }),
        complaints: records.map(record => ({
            ...(record.complaintId && { complaintId: record.complaintId }),
            sourceRow: record.sourceRow,
            relationship: (records.length === 1 ? 'single' : nearDuplicateRows.has(record.sourceRow) ? 'near-duplicate' : sourceRowsWithRelatedEvidence.has(record.sourceRow) ? 'related' : 'related') as ClusterRelationship,
        })),
        complaintCount: records.length,
        ...(centroid && { centroid }),
        ...(geographicRadiusMeters !== undefined && { geographicRadiusMeters }),
        severity,
        priorityLevel,
        priorityScore,
        confidence,
        evidence: {
            descriptionCount: records.length,
            imageEvidenceCount: evidenceReferences.filter(ref => ref.type === 'image').length,
            audioEvidenceCount: evidenceReferences.filter(ref => ref.type === 'audio').length,
            locationEvidenceCount: coordinates.length,
            references: evidenceReferences,
        },
        relationshipEvidence: cluster.relationships,
        priorityFactors,
        explanation,
        analysisMethod: cluster.analysisMethod,
    };
}

export const analyzeDataset = async (req: AuthRequest, res: Response) => {
    const dataset = await CivicDataset.findOne({ datasetId: req.params.datasetId });
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });
    if (!dataset.records.length) return res.status(422).json({ message: 'Dataset has no valid records to analyze.' });
    if (dataset.processingStatus === DatasetStatus.ANALYZING) return res.status(409).json({ message: 'Dataset analysis is already in progress.' });

    try {
        dataset.processingStatus = DatasetStatus.ANALYZING;
        dataset.analysisError = undefined;
        await dataset.save();
        const result = await analyzeNormalizedDataset(dataset.records);
        const derivedClusters = result.clusters.map(cluster => ({
            clusterId: uuidv4(),
            dataset: dataset._id,
            datasetId: dataset.datasetId,
            ...deriveCluster(cluster),
        }));
        // Re-running replaces this dataset's derived analysis. Source dataset records are never modified.
        await CivicCluster.deleteMany({ datasetId: dataset.datasetId });
        const savedClusters = await CivicCluster.insertMany(derivedClusters);
        dataset.processingStatus = DatasetStatus.ANALYZED;
        await dataset.save();
        return res.status(201).json({
            success: true,
            dataset: { id: dataset.datasetId, recordCount: dataset.validRecordCount, processingStatus: dataset.processingStatus },
            analysis: {
                clusterCount: savedClusters.length,
                multiComplaintClusterCount: savedClusters.filter(cluster => cluster.complaintCount > 1).length,
                singletonCount: savedClusters.filter(cluster => cluster.complaintCount === 1).length,
                candidatePairCount: result.candidatePairCount,
                evaluatedRelationshipCount: result.evaluatedRelationshipCount,
                geminiReviewedPairCount: result.geminiReviewedPairCount,
                geminiUnavailable: result.geminiUnavailable,
            },
        });
    } catch (error) {
        dataset.processingStatus = DatasetStatus.FAILED;
        dataset.analysisError = 'Analysis could not be completed. Retry the dataset analysis.';
        await dataset.save().catch(() => undefined);
        console.error('[Civic Intelligence] Dataset analysis failed.');
        return res.status(500).json({ message: 'Unable to analyze the dataset.' });
    }
};

const datasetSummary = (dataset: typeof CivicDataset.prototype) => ({
    id: dataset.datasetId,
    filename: dataset.filename,
    recordCount: dataset.recordCount,
    validRecords: dataset.validRecordCount,
    invalidRecords: dataset.invalidRecordCount,
    duplicateInputCount: dataset.duplicateInputCount,
    source: dataset.source,
    uploadedAt: dataset.uploadedAt,
    processingStatus: dataset.processingStatus,
    ...(dataset.analysisError && { analysisError: dataset.analysisError }),
});

/** Staff-only dataset history for the Civic Intelligence workspace. */
export const getCivicDatasets = async (_req: AuthRequest, res: Response) => {
    try {
        const datasets = await CivicDataset.find().sort({ uploadedAt: -1 });
        return res.status(200).json({ datasets: datasets.map(datasetSummary) });
    } catch {
        console.error('[Civic Intelligence] Dataset history could not be loaded.');
        return res.status(500).json({ message: 'Unable to load Civic Intelligence datasets.' });
    }
};

/** Returns normalized source records and derived clusters for one dataset. */
export const getDatasetAnalysis = async (req: AuthRequest, res: Response) => {
    try {
        const dataset = await CivicDataset.findOne({ datasetId: req.params.datasetId });
        if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });
        const clusters = await CivicCluster.find({ datasetId: dataset.datasetId }).sort({ priorityScore: -1, createdAt: -1 });
        return res.status(200).json({
            dataset: { ...datasetSummary(dataset), records: dataset.records, validationErrors: dataset.validationErrors },
            clusters,
        });
    } catch {
        console.error('[Civic Intelligence] Dataset analysis could not be loaded.');
        return res.status(500).json({ message: 'Unable to load the dataset analysis.' });
    }
};
