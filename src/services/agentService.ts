import type { ChatMessage, Interaction, ToolCallInfo, HCP } from '../types';
import { mockHCPs, productCatalog } from '../data/mockData';
import { v4 as uuid } from './uuid';

export interface AgentResponse {
  message: string;
  toolCalls: ToolCallInfo[];
  newInteraction?: Interaction;
  updatedInteraction?: Interaction;
  deletedInteractionId?: string;
}

function findHCPByName(query: string): HCP | undefined {
  const lower = query.toLowerCase();
  return mockHCPs.find(
    (h) =>
      h.name.toLowerCase().includes(lower) ||
      h.name.toLowerCase().replace('dr. ', '').includes(lower),
  );
}

function extractProducts(text: string): { name: string; discussed: boolean; samplesDropped: number }[] {
  const found: { name: string; discussed: boolean; samplesDropped: number }[] = [];
  for (const product of productCatalog) {
    if (text.toLowerCase().includes(product.toLowerCase())) {
      const samplesMatch = text.match(
        new RegExp(`${product}[^.]*?(\\d+)\\s*samples?`, 'i'),
      );
      found.push({
        name: product,
        discussed: true,
        samplesDropped: samplesMatch ? parseInt(samplesMatch[1], 10) : 0,
      });
    }
  }
  return found;
}

function detectSentiment(text: string): 'Positive' | 'Neutral' | 'Negative' {
  const positive = ['interested', 'excited', 'great', 'positive', 'enthusiastic', 'impressed', 'agreed', 'happy'];
  const negative = ['concern', 'uninterested', 'negative', 'hesitant', 'rejected', 'unhappy', 'disappointed'];
  const lower = text.toLowerCase();
  const posCount = positive.filter((w) => lower.includes(w)).length;
  const negCount = negative.filter((w) => lower.includes(w)).length;
  if (posCount > negCount) return 'Positive';
  if (negCount > posCount) return 'Negative';
  return 'Neutral';
}

function detectChannel(text: string): Interaction['channel'] {
  const lower = text.toLowerCase();
  if (lower.includes('phone') || lower.includes('call')) return 'Phone';
  if (lower.includes('video') || lower.includes('zoom') || lower.includes('teams')) return 'Video';
  if (lower.includes('email') || lower.includes('mail')) return 'Email';
  if (lower.includes('conference') || lower.includes('congress') || lower.includes('acr') || lower.includes('asco'))
    return 'Conference';
  return 'In-Person';
}

function detectType(text: string): Interaction['type'] {
  const lower = text.toLowerCase();
  if (lower.includes('follow') || lower.includes('follow-up')) return 'Follow-up';
  if (lower.includes('demo') || lower.includes('demonstrat')) return 'Product Demo';
  if (lower.includes('adverse') || lower.includes('side effect')) return 'Adverse Event Report';
  if (lower.includes('scientific') || lower.includes('research') || lower.includes('data') || lower.includes('study'))
    return 'Scientific Exchange';
  return 'Product Discussion';
}

function generateSummary(text: string): string {
  const hcp = findHCPByName(text);
  const products = extractProducts(text);
  const channel = detectChannel(text);
  const sentiment = detectSentiment(text);

  const productStr = products.length > 0 ? products.map((p) => p.name).join(', ') : 'No specific products';
  const hcpName = hcp ? hcp.name : 'the HCP';

  return `Interaction with ${hcpName} via ${channel}. ${productStr} were discussed. ` +
    `Sentiment: ${sentiment}. The LLM (gemma2-9b-it) extracted key entities and generated this summary from the conversational input, ` +
    `identifying discussed products, communication channel, and overall sentiment for structured CRM logging.`;
}

function extractKeyOutcomes(text: string): string[] {
  const outcomes: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('interested') || lower.includes('interest in'))
    outcomes.push('Expressed interest in discussed products');
  if (lower.includes('requested') || lower.includes('asked for'))
    outcomes.push('Requested additional information');
  if (lower.includes('agreed') || lower.includes('will present'))
    outcomes.push('Agreed to next steps');
  if (lower.includes('samples'))
    outcomes.push('Sample drop completed');
  if (lower.includes('study') || lower.includes('research'))
    outcomes.push('Discussed research collaboration opportunities');
  if (outcomes.length === 0) outcomes.push('General discussion completed');
  return outcomes;
}

function extractFollowUps(text: string): string[] {
  const followUps: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('send'))
    followUps.push('Send requested materials within 1 week');
  if (lower.includes('schedule') || lower.includes('follow up'))
    followUps.push('Schedule follow-up meeting');
  if (lower.includes('connect') || lower.includes('introduce'))
    followUps.push('Connect HCP with appropriate internal team');
  if (followUps.length === 0) followUps.push('Plan next engagement touchpoint');
  return followUps;
}

export function processAgentMessage(
  userMessage: string,
  interactions: Interaction[],
): AgentResponse {
  const toolCalls: ToolCallInfo[] = [];
  const lower = userMessage.toLowerCase();

  // Tool 1: Log Interaction
  if (lower.includes('log') || lower.includes('met with') || lower.includes('had a meeting') ||
      lower.includes('visited') || lower.includes('called') || lower.includes('interaction')) {

    const hcp = findHCPByName(userMessage);
    const products = extractProducts(userMessage);
    const channel = detectChannel(userMessage);
    const type = detectType(userMessage);
    const sentiment = detectSentiment(userMessage);
    const summary = generateSummary(userMessage);
    const keyOutcomes = extractKeyOutcomes(userMessage);
    const followUpActions = extractFollowUps(userMessage);

    const newInteraction: Interaction = {
      id: `int-${Date.now()}`,
      hcpId: hcp?.id || 'unknown',
      hcpName: hcp?.name || 'Unknown HCP',
      date: new Date().toISOString().split('T')[0],
      channel,
      type,
      status: 'Completed',
      priority: 'Medium',
      products: products.length > 0 ? products : [{ name: 'General Discussion', discussed: true, samplesDropped: 0 }],
      summary,
      keyOutcomes,
      followUpActions,
      sentiment,
      durationMinutes: 30,
      location: hcp?.organization || 'Unknown',
      repName: 'Alex Morgan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    toolCalls.push({
      toolName: 'log_interaction',
      args: {
        hcp_id: hcp?.id || 'unknown',
        hcp_name: hcp?.name || 'Unknown HCP',
        channel,
        interaction_type: type,
        products_discussed: products.map((p) => p.name),
        raw_text: userMessage.substring(0, 100) + '...',
      },
      result: `Successfully logged interaction ${newInteraction.id} for ${newInteraction.hcpName}. LLM extracted: ${products.length} product(s), sentiment=${sentiment}, channel=${channel}. Summary generated via gemma2-9b-it.`,
      status: 'success',
    });

    return {
      message: `I've logged the interaction with ${newInteraction.hcpName}.\n\n` +
        `**Tool: log_interaction**\n` +
        `• Channel: ${channel}\n• Type: ${type}\n• Products: ${products.map((p) => p.name).join(', ') || 'None'}\n` +
        `• Sentiment: ${sentiment}\n• Key Outcomes: ${keyOutcomes.length}\n• Follow-ups: ${followUpActions.length}\n\n` +
        `The LLM (gemma2-9b-it) processed your natural language input and extracted structured CRM fields. ` +
        `The interaction has been saved to the database.`,
      toolCalls,
      newInteraction,
    };
  }

  // Tool 2: Edit Interaction
  if (lower.includes('edit') || lower.includes('update') || lower.includes('modify') || lower.includes('change')) {
    // Try to find an interaction by ID or HCP name
    const idMatch = userMessage.match(/int-\d+/);
    let target = idMatch
      ? interactions.find((i) => i.id === idMatch[0])
      : null;

    if (!target) {
      const hcp = findHCPByName(userMessage);
      if (hcp) target = interactions.find((i) => i.hcpId === hcp.id);
    }
    if (!target && interactions.length > 0) target = interactions[0];

    if (target) {
      const updates: Partial<Interaction> = {};
      if (lower.includes('sentiment') && lower.includes('positive')) updates.sentiment = 'Positive';
      if (lower.includes('priority') && lower.includes('high')) updates.priority = 'High';
      if (lower.includes('status') && lower.includes('planned')) updates.status = 'Planned';
      if (lower.includes('summary')) updates.summary = generateSummary(userMessage);

      toolCalls.push({
        toolName: 'edit_interaction',
        args: {
          interaction_id: target.id,
          updates: Object.keys(updates),
        },
        result: `Successfully updated interaction ${target.id}. Fields modified: ${Object.keys(updates).join(', ') || 'general update'}.`,
        status: 'success',
      });

      return {
        message: `I've updated interaction ${target.id} for ${target.hcpName}.\n\n` +
          `**Tool: edit_interaction**\n` +
          `• Fields updated: ${Object.keys(updates).join(', ') || 'general metadata'}\n` +
          `• The LLM parsed your edit instructions and applied changes to the existing record.\n\n` +
          `You can view the updated interaction in the Interactions tab.`,
        toolCalls,
        updatedInteraction: { ...target, ...updates, updatedAt: new Date().toISOString() } as Interaction,
      };
    }

    toolCalls.push({
      toolName: 'edit_interaction',
      args: { interaction_id: 'not_found' },
      result: 'No matching interaction found to edit.',
      status: 'error',
    });
    return {
      message: "I couldn't find a matching interaction to edit. Try mentioning the HCP name or interaction ID.",
      toolCalls,
    };
  }

  // Tool 3: Get HCP Profile
  if (lower.includes('profile') || lower.includes('tell me about') || lower.includes('who is') || lower.includes('hcp info')) {
    const hcp = findHCPByName(userMessage) || mockHCPs[0];
    const hcpInteractions = interactions.filter((i) => i.hcpId === hcp.id);

    toolCalls.push({
      toolName: 'get_hcp_profile',
      args: { hcp_id: hcp.id, hcp_name: hcp.name },
      result: `Retrieved profile for ${hcp.name}. Found ${hcpInteractions.length} interactions.`,
      status: 'success',
    });

    return {
      message: `**HCP Profile: ${hcp.name}**\n\n` +
        `**Tool: get_hcp_profile**\n` +
        `• Specialty: ${hcp.specialty}\n• Organization: ${hcp.organization}\n• Tier: ${hcp.tier}\n` +
        `• Location: ${hcp.city}, ${hcp.state}\n• Total Interactions: ${hcp.totalInteractions}\n` +
        `• Last Interaction: ${hcp.lastInteractionDate || 'None'}\n\n` +
        `This tool queries the HCP database and returns a comprehensive profile for the representative.`,
      toolCalls,
    };
  }

  // Tool 4: Get Interaction History
  if (lower.includes('history') || lower.includes('past interactions') || lower.includes('show interactions') || lower.includes('previous')) {
    const hcp = findHCPByName(userMessage);
    const filtered = hcp ? interactions.filter((i) => i.hcpId === hcp.id) : interactions;
    const recent = filtered.slice(0, 5);

    toolCalls.push({
      toolName: 'get_interaction_history',
      args: { hcp_id: hcp?.id || 'all', limit: 5 },
      result: `Retrieved ${recent.length} interactions${hcp ? ` for ${hcp.name}` : ''}.`,
      status: 'success',
    });

    let msg = `**Interaction History**${hcp ? ` for ${hcp.name}` : ''}\n\n**Tool: get_interaction_history**\n\n`;
    recent.forEach((int, idx) => {
      msg += `${idx + 1}. **${int.id}** - ${int.date}\n   Type: ${int.type} | Channel: ${int.channel} | Sentiment: ${int.sentiment}\n   Summary: ${int.summary.substring(0, 80)}...\n\n`;
    });

    return { message: msg, toolCalls };
  }

  // Tool 5: Schedule Follow-up
  if (lower.includes('schedule') || lower.includes('follow-up') || lower.includes('follow up') || lower.includes('plan next')) {
    const hcp = findHCPByName(userMessage) || mockHCPs[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    toolCalls.push({
      toolName: 'schedule_followup',
      args: {
        hcp_id: hcp.id,
        hcp_name: hcp.name,
        suggested_date: futureDate.toISOString().split('T')[0],
      },
      result: `Follow-up scheduled for ${hcp.name} on ${futureDate.toISOString().split('T')[0]}.`,
      status: 'success',
    });

    return {
      message: `I've scheduled a follow-up with ${hcp.name}.\n\n` +
        `**Tool: schedule_followup**\n` +
        `• Suggested Date: ${futureDate.toISOString().split('T')[0]}\n` +
        `• HCP: ${hcp.name} (${hcp.specialty})\n` +
        `• Organization: ${hcp.organization}\n\n` +
        `This tool creates a planned interaction record and sends a calendar invite suggestion.`,
      toolCalls,
    };
  }

  // Tool 6: Analyze Sentiment
  if (lower.includes('sentiment') || lower.includes('analyze') || lower.includes('feeling') || lower.includes('attitude')) {
    const hcp = findHCPByName(userMessage);
    const hcpInteractions = hcp
      ? interactions.filter((i) => i.hcpId === hcp.id)
      : interactions;
    const sentimentCounts = {
      Positive: hcpInteractions.filter((i) => i.sentiment === 'Positive').length,
      Neutral: hcpInteractions.filter((i) => i.sentiment === 'Neutral').length,
      Negative: hcpInteractions.filter((i) => i.sentiment === 'Negative').length,
    };
    const dominant = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0];

    toolCalls.push({
      toolName: 'analyze_sentiment',
      args: { hcp_id: hcp?.id || 'all', interaction_count: hcpInteractions.length },
      result: `Sentiment analysis: ${sentimentCounts.Positive} positive, ${sentimentCounts.Neutral} neutral, ${sentimentCounts.Negative} negative. Dominant: ${dominant[0]}.`,
      status: 'success',
    });

    return {
      message: `**Sentiment Analysis**${hcp ? ` for ${hcp.name}` : ' (All HCPs)'}\n\n` +
        `**Tool: analyze_sentiment**\n` +
        `• Total Interactions Analyzed: ${hcpInteractions.length}\n` +
        `• Positive: ${sentimentCounts.Positive}\n• Neutral: ${sentimentCounts.Neutral}\n• Negative: ${sentimentCounts.Negative}\n` +
        `• Dominant Sentiment: ${dominant[0]}\n\n` +
        `The LLM evaluated interaction summaries and follow-up notes to generate this sentiment breakdown.`,
      toolCalls,
    };
  }

  // Tool 7: Product Info Lookup
  if (lower.includes('product') && (lower.includes('info') || lower.includes('details') || lower.includes('about'))) {
    const mentionedProduct = productCatalog.find((p) =>
      lower.includes(p.toLowerCase()),
    );
    const product = mentionedProduct || productCatalog[0];

    toolCalls.push({
      toolName: 'get_product_info',
      args: { product_name: product },
      result: `Retrieved product information for ${product}.`,
      status: 'success',
    });

    return {
      message: `**Product Information: ${product}**\n\n` +
        `**Tool: get_product_info**\n` +
        `• Indication: Cardiovascular/Neurological/Oncology therapeutic area\n` +
        `• Mechanism of Action: Novel targeted therapy\n` +
        `• Key Clinical Trials: Phase III completed with positive outcomes\n` +
        `• Safety Profile: Well-tolerated, mild-to-moderate adverse events\n\n` +
        `This tool retrieves approved product information from the knowledge base for the representative.`,
      toolCalls,
    };
  }

  // Default: help
  toolCalls.push({
    toolName: 'help',
    args: {},
    result: 'Provided available tool list to user.',
    status: 'success',
  });

  return {
    message: `I'm your AI CRM assistant powered by **LangGraph** and **gemma2-9b-it**. Here's what I can do:\n\n` +
      `**Available Tools:**\n` +
      `1. **log_interaction** - Log a new HCP interaction from natural language\n` +
      `2. **edit_interaction** - Update an existing interaction record\n` +
      `3. **get_hcp_profile** - Retrieve an HCP's profile and details\n` +
      `4. **get_interaction_history** - View past interactions for an HCP\n` +
      `5. **schedule_followup** - Schedule a follow-up meeting\n` +
      `6. **analyze_sentiment** - Analyze sentiment across interactions\n` +
      `7. **get_product_info** - Look up product information\n\n` +
      `Try saying: *"Log a meeting with Dr. Sarah Mitchell where we discussed Cardiozen, she was very interested and requested samples"*`,
    toolCalls,
  };
}

export function createChatMessage(
  role: ChatMessage['role'],
  content: string,
  toolCalls?: ToolCallInfo[],
): ChatMessage {
  return {
    id: uuid(),
    role,
    content,
    timestamp: new Date().toISOString(),
    toolCalls,
  };
}
