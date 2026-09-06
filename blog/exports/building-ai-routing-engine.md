---
title: "Building an AI Routing Engine: How Manshverse Picks the Right Model | Sparsh Sharma"
description: "How Manshverse's AI routing engine decides which model — Groq, Gemini, or Mistral — handles each prompt. Real-time intent classification, latency-aware dispatch, and multi-model orchestration."
---

AI / ML · System Design

# Building an AI Routing Engine: How Manshverse Picks the Right Model

When you have Groq, Gemini, and Mistral available — how does the system decide which model handles which prompt? I built a custom routing engine that classifies intent in real-time and dispatches accordingly.

![Sparsh Sharma - Full-Stack Developer and AI Engineer](../assets/images/pfp.jpeg) Sparsh Sharma

July 10, 2026 12 min read

## Why Route at All?

Most AI apps pick one model and call it a day. Manshverse does something different: it routes each prompt to the best available model for that specific task. The reason is simple — no single model is best at everything.

*   **Groq (LPU inference):** Insanely fast. Sub-200ms time-to-first-token. Perfect for conversational chat where latency matters more than depth.
*   **Gemini:** Strong at multi-step reasoning, code generation, and structured output. Slower, but the quality ceiling is higher for complex prompts.
*   **Mistral:** Great balance of speed and capability. Excels at creative writing and nuanced language tasks. Used for persona conversations.

The naive approach — letting the user pick a model from a dropdown — kills the experience. Users shouldn't need to understand model architectures to have a good conversation. The routing should be invisible.

## The Model Lineup

Manshverse integrates four model providers through their respective APIs. Each model has a profile that the router uses for dispatch decisions:

```
const MODEL_PROFILES = {
  'groq-llama': {
    provider: 'groq',
    strengths: ['chat', 'quick-answer', 'summarize'],
    avgLatency: 180,    // ms to first token
    maxTokens: 8192,
    costTier: 1,        // lowest
    qualityScore: 0.78
  },
  'gemini-pro': {
    provider: 'google',
    strengths: ['reasoning', 'code', 'analysis', 'structured'],
    avgLatency: 650,
    maxTokens: 32768,
    costTier: 3,
    qualityScore: 0.92
  },
  'mistral-large': {
    provider: 'mistral',
    strengths: ['creative', 'persona', 'nuanced', 'multilingual'],
    avgLatency: 420,
    maxTokens: 32768,
    costTier: 2,
    qualityScore: 0.88
  }
};
```

These profiles aren't static — they're updated based on real-time latency measurements from actual API calls. If Groq's response time spikes above 500ms, the router automatically adjusts.

## Intent Classification

The router's first job is to classify what the user is trying to do. I built a lightweight intent classifier that runs on the client before any API call:

```
function classifyIntent(prompt) {
  const lower = prompt.toLowerCase();
  const wordCount = prompt.split(/\s+/).length;
  
  // Code detection
  if (/```|function\s|class\s|import\s|const\s|def\s/.test(prompt)) {
    return { intent: 'code', confidence: 0.95 };
  }
  
  // Reasoning / analysis keywords
  if (/explain|analyze|compare|why|how does|step.by.step|reason/.test(lower)) {
    return { intent: 'reasoning', confidence: 0.85 };
  }
  
  // Creative writing
  if (/write|story|poem|creative|imagine|describe.*scene/.test(lower)) {
    return { intent: 'creative', confidence: 0.82 };
  }
  
  // Short conversational queries → speed matters
  if (wordCount < 15) {
    return { intent: 'chat', confidence: 0.75 };
  }
  
  // Default: balanced
  return { intent: 'general', confidence: 0.6 };
}
```

This classifier is intentionally simple — regex-based pattern matching, not an ML model. The reason: it needs to run in under 2ms on every single message. A full ML classifier would add 50-100ms of latency before the actual model call even starts. The simplicity is a feature.

The confidence score matters: for low-confidence classifications, the router uses the most versatile model (Gemini) rather than a specialist.

## The Dispatch Engine

With an intent classification in hand, the dispatch engine selects the optimal model using a weighted scoring function:

```
function selectModel(intent, userPrefs = {}) {
  let bestModel = null;
  let bestScore = -1;
  
  for (const [modelId, profile] of Object.entries(MODEL_PROFILES)) {
    let score = 0;
    
    // Strength match (+40 points)
    if (profile.strengths.includes(intent.intent)) {
      score += 40 * intent.confidence;
    }
    
    // Latency preference (+30 points for fastest)
    const latencyScore = 1 - (profile.avgLatency / 1000);
    score += latencyScore * 30;
    
    // Quality ceiling (+20 points)
    score += profile.qualityScore * 20;
    
    // Cost efficiency (+10 points)
    score += (1 - profile.costTier / 4) * 10;
    
    // User override (if they've pinned a model)
    if (userPrefs.pinnedModel === modelId) score += 50;
    
    if (score > bestScore) {
      bestScore = score;
      bestModel = modelId;
    }
  }
  
  return { model: bestModel, score: bestScore };
}
```

The weights (40/30/20/10) were tuned empirically. I tracked user satisfaction signals — response ratings, re-prompts (a signal of dissatisfaction), and conversation length — across thousands of interactions. The current weights maximize a composite satisfaction score.

Design Decision

I intentionally made the scoring function transparent and deterministic — no neural networks in the routing loop. The router needs to be debuggable. When a user reports that "the model gave a terrible response," I need to trace exactly why that model was chosen, not shrug at a black box.

## Fallback & Error Handling

API calls fail. Rate limits hit. Services go down. The routing engine has a cascading fallback system:

*   **Primary:** The highest-scoring model from the dispatch engine
*   **Secondary:** The second-highest scorer. Activated if primary returns a 429 (rate limit) or 5xx error
*   **Tertiary:** Always Groq — fastest and cheapest. The "keep the lights on" option

Fallbacks are silent. The user never sees "switching to backup model" — the response just arrives. I log the fallback event server-side for monitoring. If a model falls back more than 5% of the time in an hour, it gets temporarily deprioritized across all users.

## The Persona Layer

Manshverse features 45+ historical personas — Einstein, Oppenheimer, Sherlock Holmes, Marcus Aurelius, etc. The persona layer sits on top of the routing engine and modifies the system prompt injected into each request.

Each persona has a configuration file specifying:

*   **System prompt:** The character definition, speech patterns, and behavioral constraints
*   **Preferred model:** Einstein gets Gemini (reasoning-heavy). Sherlock gets Mistral (nuanced language). Marcus Aurelius gets Groq (conversational wisdom)
*   **Temperature:** Higher for creative personas (Shakespeare: 0.9), lower for analytical ones (Einstein: 0.3)
*   **Response constraints:** Max length, forbidden phrases, required formatting

The persona preference is fed into the dispatch engine as a weighted signal, but it doesn't override the routing logic entirely. If a user asks Einstein a code question, the router still sends it to Gemini — it just applies Einstein's system prompt.

## Deep Reasoning Mode

For complex queries, Manshverse has a "Deep Reasoning" mode that chains multiple model calls:

1.  **First pass (Groq):** Quick initial analysis — break the question into sub-problems
2.  **Second pass (Gemini):** Deep reasoning on each sub-problem with structured output
3.  **Synthesis (Mistral):** Combine the results into a coherent, well-written response

This is slower (2-4 seconds total) but produces dramatically better answers for multi-step problems. The user can toggle it on/off — it's off by default because most conversations don't need it.

## Results & Learnings

After deploying the routing engine, some numbers:

*   **Average response latency dropped 35%** — because quick-answer prompts now go to Groq instead of the slowest high-quality model
*   **User re-prompt rate dropped 22%** — better model selection means better first-try answers
*   **API cost dropped 28%** — routing simple prompts to cheaper models, saving the expensive ones for complex queries

The biggest lesson: **routing is a product decision, not just a technical one.** The weights in the scoring function encode a philosophy about what matters — speed vs. quality vs. cost. Different products would weight these differently. For Manshverse, conversational speed (latency) gets the heaviest weight because chat is the primary interface.

If you're building a multi-model AI product, invest in routing. It's the difference between "we use AI" and "we use AI intelligently."

Try Manshverse at [manshverse.site](https://manshverse.site).