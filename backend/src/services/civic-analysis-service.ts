import { GoogleGenerativeAI } from '@google/generative-ai';
import { INormalizedRecord } from '../models/civic-dataset-model';
import { ClusterRelationship } from '../models/civic-cluster-model';

const EARTH_RADIUS_METERS = 6_371_000;
const CANDIDATE_RADIUS_METERS = 1_000;
const CLUSTER_THRESHOLD = 0.60;
const CLUSTER_COMPATIBILITY_THRESHOLD = 0.58;
const MAX_GEMINI_CANDIDATES = 100;
const GEMINI_BATCH_SIZE = 10;
const MAX_GEO_CANDIDATES_PER_RECORD = 80;
const EXACT_DUPLICATE_ANCHOR_RADIUS_METERS = 400;
const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'at', 'be', 'by', 'for', 'from', 'has', 'in', 'is', 'it', 'near', 'of', 'on', 'or', 'the', 'this', 'to', 'with']);
const tokenCache = new WeakMap<object, Set<string>>();

export interface RelationshipEvidence {
    sourceRows: [number, number];
    relationshipScore: number;
    lexicalSimilarity: number;
    semanticSimilarity?: number;
    geographicDistanceMeters?: number;
    categorySimilarity: number;
    temporalCompatibility?: number;
    relationship: Exclude<ClusterRelationship, 'single'>;
}

interface CandidatePair {
    left: number;
    right: number;
    lexicalSimilarity: number;
    geographicDistanceMeters?: number;
    geographicSimilarity?: number;
    categorySimilarity: number;
    temporalCompatibility?: number;
    semanticSimilarity?: number;
}

export interface DerivedCluster {
    records: INormalizedRecord[];
    relationships: RelationshipEvidence[];
    analysisMethod: 'deterministic' | 'gemini-assisted';
}

export interface AnalysisResult {
    clusters: DerivedCluster[];
    candidatePairCount: number;
    evaluatedRelationshipCount: number;
    geminiReviewedPairCount: number;
    geminiUnavailable: boolean;
}

const round = (value: number, places = 3): number => Number(value.toFixed(places));

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tokens(record: INormalizedRecord): Set<string> {
    const cached = tokenCache.get(record);
    if (cached) return cached;
    const normalized = new Set(`${record.title ?? ''} ${record.description}`.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length > 2 && !STOP_WORDS.has(token)));
    tokenCache.set(record, normalized);
    return normalized;
}

/** Deterministic Jaccard similarity over normalized civic-problem tokens. */
export function lexicalSimilarity(left: INormalizedRecord, right: INormalizedRecord): number {
    const a = tokens(left);
    const b = tokens(right);
    if (!a.size || !b.size) return 0;
    let overlap = 0;
    for (const token of a) if (b.has(token)) overlap++;
    return round(overlap / new Set([...a, ...b]).size);
}

function categorySimilarity(left: INormalizedRecord, right: INormalizedRecord): number {
    if (!left.category || !right.category) return 0.5;
    return left.category.trim().toLowerCase() === right.category.trim().toLowerCase() ? 1 : 0;
}

function temporalCompatibility(left: INormalizedRecord, right: INormalizedRecord): number | undefined {
    if (!left.createdAt || !right.createdAt) return undefined;
    const days = Math.abs(left.createdAt.getTime() - right.createdAt.getTime()) / 86_400_000;
    return round(Math.exp(-days / 30));
}

function geographicInformation(left: INormalizedRecord, right: INormalizedRecord): Pick<CandidatePair, 'geographicDistanceMeters' | 'geographicSimilarity'> {
    if (left.latitude === undefined || left.longitude === undefined || right.latitude === undefined || right.longitude === undefined) return {};
    const geographicDistanceMeters = haversineMeters(left.latitude, left.longitude, right.latitude, right.longitude);
    return { geographicDistanceMeters: round(geographicDistanceMeters, 1), geographicSimilarity: round(Math.exp(-geographicDistanceMeters / 500)) };
}

function pairKey(left: number, right: number): string { return `${Math.min(left, right)}:${Math.max(left, right)}`; }

function exactTextSignature(record: INormalizedRecord): string {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return `${normalize(record.category ?? '')}|${normalize(record.title ?? '')}|${normalize(record.description)}`;
}

interface ExactDuplicateGroup {
    members: number[];
    relationships: CandidatePair[];
}

/**
 * Exact text matches must not be dropped merely because a dense-area candidate
 * cap was reached. We link them through a single anchor when coordinates are
 * within 400 m; that keeps every member pair within the 1 km geographic rule
 * while retaining linear memory instead of creating an all-pairs clique.
 */
function exactDuplicateGroups(records: INormalizedRecord[]): ExactDuplicateGroup[] {
    const buckets = new Map<string, number[]>();
    records.forEach((record, index) => {
        const key = exactTextSignature(record);
        const members = buckets.get(key) ?? [];
        members.push(index);
        buckets.set(key, members);
    });
    const groups: ExactDuplicateGroup[] = [];
    for (const members of buckets.values()) {
        const remaining = new Set(members);
        while (remaining.size) {
            const anchor = [...remaining].sort((left, right) => left - right)[0];
            remaining.delete(anchor);
            const group = [anchor];
            for (const candidate of [...remaining]) {
                const geographic = geographicInformation(records[anchor], records[candidate]);
                if (geographic.geographicDistanceMeters !== undefined && geographic.geographicDistanceMeters > EXACT_DUPLICATE_ANCHOR_RADIUS_METERS) continue;
                group.push(candidate);
                remaining.delete(candidate);
            }
            if (group.length < 2) continue;
            const relationships = group.slice(1).map(candidate => {
                const geographic = geographicInformation(records[anchor], records[candidate]);
                return {
                    left: anchor,
                    right: candidate,
                    lexicalSimilarity: 1,
                    categorySimilarity: 1,
                    temporalCompatibility: temporalCompatibility(records[anchor], records[candidate]),
                    semanticSimilarity: 1,
                    ...geographic,
                };
            });
            groups.push({ members: group, relationships });
        }
    }
    return groups;
}

/**
 * Produces candidates from nearby geographic buckets plus shared meaningful
 * words. Geography only limits work; it never alone creates a relationship.
 */
function generateCandidates(records: INormalizedRecord[]): CandidatePair[] {
    const pairs = new Map<string, CandidatePair>();
    const addPair = (left: number, right: number) => {
        if (left === right) return;
        const first = Math.min(left, right);
        const second = Math.max(left, right);
        const key = pairKey(first, second);
        if (pairs.has(key)) return;
        const geographic = geographicInformation(records[first], records[second]);
        if (geographic.geographicDistanceMeters !== undefined && geographic.geographicDistanceMeters > CANDIDATE_RADIUS_METERS) return;
        pairs.set(key, {
            left: first,
            right: second,
            lexicalSimilarity: lexicalSimilarity(records[first], records[second]),
            categorySimilarity: categorySimilarity(records[first], records[second]),
            temporalCompatibility: temporalCompatibility(records[first], records[second]),
            ...geographic,
        });
    };

    // A roughly one-kilometre grid prevents all-record geographic comparisons.
    const geographicBuckets = new Map<string, number[]>();
    records.forEach((record, index) => {
        if (record.latitude === undefined || record.longitude === undefined) return;
        const key = `${Math.floor(record.latitude / 0.01)}:${Math.floor(record.longitude / 0.01)}`;
        const bucket = geographicBuckets.get(key) ?? [];
        bucket.push(index);
        geographicBuckets.set(key, bucket);
    });
    for (const [key, members] of geographicBuckets) {
        const [latCell, lngCell] = key.split(':').map(Number);
        for (const member of members) {
            let candidateCount = 0;
            for (let latOffset = -1; latOffset <= 1 && candidateCount < MAX_GEO_CANDIDATES_PER_RECORD; latOffset++) {
                for (let lngOffset = -1; lngOffset <= 1 && candidateCount < MAX_GEO_CANDIDATES_PER_RECORD; lngOffset++) {
                    const nearby = geographicBuckets.get(`${latCell + latOffset}:${lngCell + lngOffset}`) ?? [];
                    for (const other of nearby) {
                        if (candidateCount >= MAX_GEO_CANDIDATES_PER_RECORD) break;
                        if (member !== other) {
                            addPair(member, other);
                            candidateCount++;
                        }
                    }
                }
            }
        }
    }

    // Records without coordinates can still compete through specific shared tokens.
    const inverted = new Map<string, number[]>();
    records.forEach((record, index) => {
        for (const token of tokens(record)) {
            const entries = inverted.get(token) ?? [];
            if (entries.length < 100) entries.push(index); // prevents generic terms creating an unbounded clique
            inverted.set(token, entries);
        }
    });
    for (const members of inverted.values()) {
        for (let first = 0; first < members.length; first++) for (let second = first + 1; second < members.length; second++) addPair(members[first], members[second]);
    }
    return [...pairs.values()];
}

function calculatedRelationshipScore(pair: CandidatePair): number {
    // Semantic review has the most influence when available. Missing signals
    // are re-normalized instead of treated as fabricated zero values.
    const signals: Array<[number, number | undefined]> = [
        [0.45, pair.semanticSimilarity], [0.25, pair.lexicalSimilarity], [0.18, pair.geographicSimilarity],
        [0.07, pair.categorySimilarity], [0.05, pair.temporalCompatibility],
    ];
    const available = signals.filter(([, value]) => value !== undefined);
    return round(available.reduce((sum, [weight, value]) => sum + weight * value!, 0) / available.reduce((sum, [weight]) => sum + weight, 0));
}

function canBeRelated(pair: CandidatePair): boolean {
    // Nearby but unrelated problems must not pass. A text signal is always required.
    const textSignal = pair.semanticSimilarity ?? pair.lexicalSimilarity;
    if (textSignal < 0.25) return false;
    if (pair.geographicDistanceMeters !== undefined && pair.geographicDistanceMeters > CANDIDATE_RADIUS_METERS) return false;
    return calculatedRelationshipScore(pair) >= CLUSTER_THRESHOLD;
}

/** Accept only bounded numeric scores from a Gemini JSON response. */
export function parseGeminiSemanticScores(text: string, pairCount: number): Map<number, number> {
    const scores = new Map<number, number>();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return scores;
    try {
        const parsed = JSON.parse(match[0]) as { pairs?: Array<{ id?: unknown; semanticSimilarity?: unknown }> };
        for (const result of parsed.pairs ?? []) {
            if (typeof result.id !== 'number' || typeof result.semanticSimilarity !== 'number' || result.id < 0 || result.id >= pairCount || !Number.isFinite(result.semanticSimilarity) || result.semanticSimilarity < 0 || result.semanticSimilarity > 1) continue;
            scores.set(result.id, round(result.semanticSimilarity));
        }
    } catch {
        // Invalid model output is ignored and never becomes a semantic score.
    }
    return scores;
}

async function reviewSemanticCandidates(records: INormalizedRecord[], candidates: CandidatePair[]): Promise<{ reviewed: number; unavailable: boolean }> {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') return { reviewed: 0, unavailable: true };
    const reviewable = candidates
        .filter(candidate => candidate.lexicalSimilarity >= 0.2 || (candidate.geographicDistanceMeters !== undefined && candidate.categorySimilarity === 1))
        .sort((a, b) => (b.lexicalSimilarity + (b.geographicSimilarity ?? 0)) - (a.lexicalSimilarity + (a.geographicSimilarity ?? 0)))
        .slice(0, MAX_GEMINI_CANDIDATES);
    let reviewed = 0;
    try {
        const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-1.5-flash' });
        for (let offset = 0; offset < reviewable.length; offset += GEMINI_BATCH_SIZE) {
            const batch = reviewable.slice(offset, offset + GEMINI_BATCH_SIZE);
            const pairTexts = batch.map((candidate, id) => ({
                id,
                a: { title: records[candidate.left].title, description: records[candidate.left].description, category: records[candidate.left].category },
                b: { title: records[candidate.right].title, description: records[candidate.right].description, category: records[candidate.right].category },
            }));
            const prompt = `Assess whether each pair describes the same real-world civic incident. Return only JSON: {"pairs":[{"id":0,"semanticSimilarity":0.0}]}. semanticSimilarity must be from 0 to 1. Use only the supplied text; do not infer facts, locations, evidence, IDs, or counts.\n${JSON.stringify(pairTexts)}`;
            const response = await model.generateContent(prompt);
            const scores = parseGeminiSemanticScores(response.response.text(), batch.length);
            for (const [id, score] of scores) {
                batch[id].semanticSimilarity = score;
                reviewed++;
            }
        }
        return { reviewed, unavailable: false };
    } catch {
        // Deterministic signals remain valid; failed Gemini output is never used.
        console.warn('[Civic Intelligence] Gemini semantic review unavailable; continuing with deterministic signals.');
        return { reviewed, unavailable: true };
    }
}

function formClusters(records: INormalizedRecord[], candidates: CandidatePair[]): DerivedCluster[] {
    const duplicateGroups = exactDuplicateGroups(records);
    const relationshipMap = new Map<string, CandidatePair>();
    for (const pair of candidates) relationshipMap.set(pairKey(pair.left, pair.right), pair);
    for (const group of duplicateGroups) for (const pair of group.relationships) relationshipMap.set(pairKey(pair.left, pair.right), pair);
    const relationships = [...relationshipMap.values()].filter(canBeRelated).map(pair => ({
        ...pair,
        relationshipScore: calculatedRelationshipScore(pair),
        relationship: (pair.lexicalSimilarity >= 0.85 && (pair.geographicDistanceMeters === undefined || pair.geographicDistanceMeters <= 100) ? 'near-duplicate' : 'related') as Exclude<ClusterRelationship, 'single'>,
    })).sort((a, b) => b.relationshipScore - a.relationshipScore);

    const groups: Array<Set<number>> = [];
    const groupOf = records.map(() => -1);
    for (const duplicateGroup of duplicateGroups) {
        const groupIndex = groups.length;
        groups.push(new Set(duplicateGroup.members));
        for (const member of duplicateGroup.members) groupOf[member] = groupIndex;
    }
    records.forEach((_, index) => {
        if (groupOf[index] !== -1) return;
        groupOf[index] = groups.length;
        groups.push(new Set([index]));
    });
    const relationByPair = new Map(relationships.map(relationship => [pairKey(relationship.left, relationship.right), relationship]));
    for (const relationship of relationships) {
        const leftGroup = groupOf[relationship.left];
        const rightGroup = groupOf[relationship.right];
        if (leftGroup === rightGroup) continue;
        const leftMembers = groups[leftGroup];
        const rightMembers = groups[rightGroup];
        // Complete-link compatibility blocks A≈B≈C weak chains unless A≈C also has direct evidence.
        let compatible = true;
        for (const left of leftMembers) for (const right of rightMembers) {
            const evidence = relationByPair.get(pairKey(left, right));
            if (!evidence || evidence.relationshipScore < CLUSTER_COMPATIBILITY_THRESHOLD) compatible = false;
        }
        if (!compatible) continue;
        for (const member of rightMembers) { leftMembers.add(member); groupOf[member] = leftGroup; }
        rightMembers.clear();
    }

    const edgesByGroup = new Map<number, typeof relationships>();
    for (const relationship of relationships) {
        const group = groupOf[relationship.left];
        if (group === groupOf[relationship.right]) {
            const edges = edgesByGroup.get(group) ?? [];
            edges.push(relationship);
            edgesByGroup.set(group, edges);
        }
    }
    return groups.filter(group => group.size).map(group => {
        const members = [...group].sort((a, b) => a - b);
        const edges = (edgesByGroup.get(groupOf[members[0]]) ?? []).map(edge => ({
            sourceRows: [records[edge.left].sourceRow, records[edge.right].sourceRow] as [number, number],
            relationshipScore: edge.relationshipScore,
            lexicalSimilarity: edge.lexicalSimilarity,
            ...(edge.semanticSimilarity !== undefined && { semanticSimilarity: edge.semanticSimilarity }),
            ...(edge.geographicDistanceMeters !== undefined && { geographicDistanceMeters: edge.geographicDistanceMeters }),
            categorySimilarity: edge.categorySimilarity,
            ...(edge.temporalCompatibility !== undefined && { temporalCompatibility: edge.temporalCompatibility }),
            relationship: edge.relationship,
        }));
        return { records: members.map(index => records[index]), relationships: edges, analysisMethod: edges.some(edge => edge.semanticSimilarity !== undefined) ? 'gemini-assisted' : 'deterministic' };
    });
}

export async function analyzeDataset(records: INormalizedRecord[]): Promise<AnalysisResult> {
    const candidates = generateCandidates(records);
    const semanticReview = await reviewSemanticCandidates(records, candidates);
    const clusters = formClusters(records, candidates);
    return { clusters, candidatePairCount: candidates.length, evaluatedRelationshipCount: candidates.filter(canBeRelated).length, geminiReviewedPairCount: semanticReview.reviewed, geminiUnavailable: semanticReview.unavailable };
}
