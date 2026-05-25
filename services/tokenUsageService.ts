import { db } from '../src/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  QueryConstraint
} from 'firebase/firestore';

export interface TokenUsageRecord {
  id?: string;
  associate_email: string;
  gl_id: string;
  product_name: string;
  case_study_id?: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  model: string;
  analysis_type: string; // "mismatch", "glid_identification", "document_scan", etc.
  status: 'completed' | 'failed' | 'pending';
  created_at?: any;
  timestamp?: number;
}

export interface TokenUsageSummary {
  totalTokens: number;
  totalCost: number;
  totalRecords: number;
  byAssociate: Record<string, {
    tokens: number;
    cost: number;
    count: number;
    caseStudies: string[];
  }>;
  byCaseStudy: Record<string, {
    tokens: number;
    cost: number;
    associate: string;
  }>;
  byAnalysisType: Record<string, {
    tokens: number;
    cost: number;
    count: number;
  }>;
}

const COLLECTION_NAME = 'token_usage';
const PRICING = {
  input: 0.0000035, // $3.50 per 1M tokens
  output: 0.0000105, // $10.50 per 1M tokens
};

/**
 * Service to manage token usage tracking and analytics
 */
export const tokenUsageService = {
  /**
   * Save token usage record
   */
  saveTokenUsage: async (record: TokenUsageRecord): Promise<string> => {
    if (!record.associate_email || !record.gl_id) {
      throw new Error("associate_email and gl_id are required");
    }

    // Calculate cost if not provided
    const cost = record.cost || 
      (record.prompt_tokens * PRICING.input) + (record.completion_tokens * PRICING.output);

    const payload = {
      ...record,
      cost,
      created_at: new Date().toISOString(),
      timestamp: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
      console.log("[TokenUsage] Saved token usage record:", docRef.id);
      return docRef.id;
    } catch (e) {
      console.error("[TokenUsage] Failed to save token usage:", e);
      throw e;
    }
  },

  /**
   * Get token usage records with filters
   */
  getTokenUsageRecords: async (
    filters?: {
      associate_email?: string;
      gl_id?: string;
      startDate?: Date;
      endDate?: Date;
      status?: 'completed' | 'failed' | 'pending';
      limit?: number;
    }
  ): Promise<TokenUsageRecord[]> => {
    try {
      const constraints: QueryConstraint[] = [];

      if (filters?.associate_email) {
        constraints.push(where('associate_email', '==', filters.associate_email));
      }
      if (filters?.gl_id) {
        constraints.push(where('gl_id', '==', filters.gl_id));
      }
      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }
      if (filters?.startDate) {
        constraints.push(where('created_at', '>=', filters.startDate.toISOString()));
      }
      if (filters?.endDate) {
        constraints.push(where('created_at', '<=', filters.endDate.toISOString()));
      }

      constraints.push(orderBy('created_at', 'desc'));

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const records: TokenUsageRecord[] = [];
      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data() as any
        });
      });

      return records.slice(0, filters?.limit || 1000);
    } catch (e) {
      console.error("[TokenUsage] Failed to fetch records:", e);
      return [];
    }
  },

  /**
   * Get consolidated summary of token usage
   */
  getTokenUsageSummary: async (
    startDate?: Date,
    endDate?: Date
  ): Promise<TokenUsageSummary> => {
    try {
      const records = await tokenUsageService.getTokenUsageRecords({
        status: 'completed',
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: endDate || new Date(),
        limit: 10000
      });

      const summary: TokenUsageSummary = {
        totalTokens: 0,
        totalCost: 0,
        totalRecords: records.length,
        byAssociate: {},
        byCaseStudy: {},
        byAnalysisType: {}
      };

      records.forEach((record) => {
        // Total stats
        summary.totalTokens += record.total_tokens;
        summary.totalCost += record.cost;

        // By Associate
        const associateKey = record.associate_email || 'Unknown';
        if (!summary.byAssociate[associateKey]) {
          summary.byAssociate[associateKey] = {
            tokens: 0,
            cost: 0,
            count: 0,
            caseStudies: []
          };
        }
        summary.byAssociate[associateKey].tokens += record.total_tokens;
        summary.byAssociate[associateKey].cost += record.cost;
        summary.byAssociate[associateKey].count += 1;
        
        if (record.case_study_id && !summary.byAssociate[associateKey].caseStudies.includes(record.case_study_id)) {
          summary.byAssociate[associateKey].caseStudies.push(record.case_study_id);
        }

        // By Case Study
        const caseStudyKey = record.case_study_id || `${record.gl_id}-${record.product_name}`;
        if (!summary.byCaseStudy[caseStudyKey]) {
          summary.byCaseStudy[caseStudyKey] = {
            tokens: 0,
            cost: 0,
            associate: associateKey
          };
        }
        summary.byCaseStudy[caseStudyKey].tokens += record.total_tokens;
        summary.byCaseStudy[caseStudyKey].cost += record.cost;

        // By Analysis Type
        const typeKey = record.analysis_type || 'other';
        if (!summary.byAnalysisType[typeKey]) {
          summary.byAnalysisType[typeKey] = {
            tokens: 0,
            cost: 0,
            count: 0
          };
        }
        summary.byAnalysisType[typeKey].tokens += record.total_tokens;
        summary.byAnalysisType[typeKey].cost += record.cost;
        summary.byAnalysisType[typeKey].count += 1;
      });

      return summary;
    } catch (e) {
      console.error("[TokenUsage] Failed to get summary:", e);
      return {
        totalTokens: 0,
        totalCost: 0,
        totalRecords: 0,
        byAssociate: {},
        byCaseStudy: {},
        byAnalysisType: {}
      };
    }
  },

  /**
   * Get per-associate daily breakdown
   */
  getAssociateTokensDailyBreakdown: async (
    associate_email: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, { tokens: number; cost: number; count: number }>> => {
    try {
      const records = await tokenUsageService.getTokenUsageRecords({
        associate_email,
        status: 'completed',
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate || new Date(),
        limit: 5000
      });

      const breakdown: Record<string, { tokens: number; cost: number; count: number }> = {};

      records.forEach((record) => {
        const date = new Date(record.created_at).toISOString().split('T')[0];
        if (!breakdown[date]) {
          breakdown[date] = { tokens: 0, cost: 0, count: 0 };
        }
        breakdown[date].tokens += record.total_tokens;
        breakdown[date].cost += record.cost;
        breakdown[date].count += 1;
      });

      return breakdown;
    } catch (e) {
      console.error("[TokenUsage] Failed to get daily breakdown:", e);
      return {};
    }
  }
};
