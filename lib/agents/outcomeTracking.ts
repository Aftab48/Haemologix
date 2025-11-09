/**
 * Outcome Tracking and Learning System
 * Tracks agent decisions and outcomes to enable learning and adaptation
 */

import { db } from "@/db";
import { AgentType } from "@prisma/client";

export interface DecisionOutcome {
  decisionId: string;
  agentType: AgentType;
  requestId: string;
  decision: any;
  outcome: 'success' | 'failure' | 'partial';
  outcomeDetails: {
    fulfillmentTime?: number; // minutes
    donorArrived?: boolean;
    donorNoShow?: boolean;
    inventoryUsed?: boolean;
    transportCompleted?: boolean;
    patientOutcome?: string;
  };
  performanceMetrics: {
    responseTime?: number;
    accuracy?: number;
    efficiency?: number;
  };
  learnedInsights?: string[];
}

/**
 * Track decision outcome after fulfillment
 */
export async function trackDecisionOutcome(
  outcome: DecisionOutcome
): Promise<void> {
  try {
    // Store outcome in AgentDecision table
    await db.agentDecision.update({
      where: { id: outcome.decisionId },
      data: {
        decision: {
          ...(outcome.decision as object),
          outcome: outcome.outcome,
          outcomeDetails: outcome.outcomeDetails,
          performanceMetrics: outcome.performanceMetrics,
          learnedInsights: outcome.learnedInsights,
          outcomeTrackedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`[OutcomeTracking] Tracked outcome for decision ${outcome.decisionId}: ${outcome.outcome}`);
  } catch (error) {
    console.error('[OutcomeTracking] Error tracking outcome:', error);
  }
}

/**
 * Get historical patterns for learning
 */
export async function getHistoricalPatterns(
  agentType: AgentType,
  context: {
    bloodType?: string;
    urgency?: string;
    timeOfDay?: string;
  }
): Promise<any> {
  try {
    // Get recent decisions from this agent
    const recentDecisions = await db.agentDecision.findMany({
      where: {
        agentType,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    // Analyze patterns
    const patterns: any = {
      totalDecisions: recentDecisions.length,
      successRate: 0,
      avgFulfillmentTime: 0,
      commonFactors: {},
    };

    let successCount = 0;
    let totalFulfillmentTime = 0;
    let fulfillmentCount = 0;

    for (const decision of recentDecisions) {
      const decisionData = decision.decision as any;
      
      if (decisionData.outcome === 'success') {
        successCount++;
      }
      
      if (decisionData.outcomeDetails?.fulfillmentTime) {
        totalFulfillmentTime += decisionData.outcomeDetails.fulfillmentTime;
        fulfillmentCount++;
      }
    }

    patterns.successRate = recentDecisions.length > 0 ? successCount / recentDecisions.length : 0;
    patterns.avgFulfillmentTime = fulfillmentCount > 0 ? totalFulfillmentTime / fulfillmentCount : 0;

    // Get donor response patterns
    if (agentType === AgentType.COORDINATOR || agentType === AgentType.DONOR) {
      const donorResponses = await db.donorResponseHistory.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        take: 200,
      });

      const responseRate = donorResponses.length > 0
        ? donorResponses.filter(r => r.status === 'accepted').length / donorResponses.length
        : 0.3; // Default

      patterns.donorResponseRate = responseRate;
      patterns.avgResponseTime = donorResponses.length > 0
        ? donorResponses.reduce((sum, r) => sum + (r.responseTime || 600), 0) / donorResponses.length / 60
        : 10; // minutes
    }

    return patterns;
  } catch (error) {
    console.error('[OutcomeTracking] Error getting patterns:', error);
    return {
      totalDecisions: 0,
      successRate: 0.7, // Default optimistic
      avgFulfillmentTime: 45,
      donorResponseRate: 0.3,
    };
  }
}

/**
 * Learn from outcomes and suggest improvements
 */
export async function learnFromOutcomes(
  agentType: AgentType
): Promise<{
  insights: string[];
  recommendedAdjustments: any;
}> {
  try {
    const patterns = await getHistoricalPatterns(agentType, {});

    const insights: string[] = [];
    const adjustments: any = {};

    // Analyze success rate
    if (patterns.successRate < 0.7) {
      insights.push(`Low success rate (${(patterns.successRate * 100).toFixed(1)}%). Consider more conservative donor selection.`);
      adjustments.confidenceThreshold = 0.85; // Increase threshold
    }

    // Analyze fulfillment time
    if (patterns.avgFulfillmentTime > 60) {
      insights.push(`Average fulfillment time is high (${patterns.avgFulfillmentTime.toFixed(0)}min). Consider prioritizing closer donors.`);
      adjustments.distanceWeight = 0.4; // Increase distance importance
    }

    // Analyze donor response rate
    if (patterns.donorResponseRate < 0.2) {
      insights.push(`Low donor response rate (${(patterns.donorResponseRate * 100).toFixed(1)}%). Consider notifying more donors or improving messaging.`);
      adjustments.notificationCount = 15; // Increase notifications
    }

    return {
      insights,
      recommendedAdjustments: adjustments,
    };
  } catch (error) {
    console.error('[OutcomeTracking] Error learning from outcomes:', error);
    return {
      insights: [],
      recommendedAdjustments: {},
    };
  }
}

/**
 * Get traffic conditions based on time of day
 */
export function getTrafficConditions(timeOfDay: string): string {
  const hour = new Date().getHours();
  
  if (hour >= 7 && hour <= 9) {
    return 'Rush hour morning - 50% slower';
  } else if (hour >= 17 && hour <= 19) {
    return 'Rush hour evening - 50% slower';
  } else if (hour >= 22 || hour <= 6) {
    return 'Night time - 20% faster';
  } else {
    return 'Normal traffic';
  }
}

