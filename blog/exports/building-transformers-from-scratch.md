---
title: "Building a Transformer from Scratch in PyTorch | Sparsh Sharma"
description: "A complete walkthrough of building a Transformer model from scratch in PyTorch — multi-head attention, positional encoding, training loops, and lessons learned from training on local hardware and cloud GPUs."
---

AI / ML Engineering

# Building a Transformer from Scratch in PyTorch

I trained my own transformer model from the ground up — no HuggingFace, no shortcuts. Here's the full breakdown: multi-head attention, positional encoding, training loops, and the mistakes that actually taught me how these things work.

![Sparsh Sharma - Full-Stack Developer and AI Engineer](../assets/images/pfp.jpeg) Sparsh Sharma

July 28, 2026 18 min read

## Why Build from Scratch?

There's a massive gap between _using_ a transformer and _understanding_ one. I spent months fine-tuning pre-trained models through APIs — Groq, Gemini, Mistral — for Manshverse. But I kept hitting this wall: when something broke, I couldn't reason about _why_. I was treating the model as a black box.

So I decided to build one from scratch. Not a toy implementation from a tutorial. An actual trainable transformer architecture, written in pure PyTorch, that I could train on my own data and study the loss curves of. The goal wasn't to compete with GPT — it was to understand the machine.

> If you can't build it from scratch, you don't really understand it. — Richard Feynman (paraphrased)

## Starting with RNNs

Before touching transformers, I started with Recurrent Neural Networks. This was deliberate — you can't appreciate **attention** until you've felt the pain of **sequential processing**.

RNNs process sequences one token at a time. The hidden state from token _t_ feeds into token _t+1_. This is elegant in theory but catastrophic in practice:

*   **Vanishing gradients:** Information from early tokens decays exponentially as the sequence grows. By token 50, the model has almost no memory of token 1.
*   **Sequential bottleneck:** You can't parallelize training. Each token depends on the previous one. On my local machine, this made training painfully slow.
*   **Long-range dependencies:** The model simply couldn't learn relationships between tokens that were more than ~20 positions apart.

I trained a character-level RNN on Shakespeare text. It learned basic word structure within a few hundred epochs, but the output was incoherent beyond individual phrases. The loss plateaued around 1.8 and refused to budge. This is where most people give up and jump to a library — I jumped to attention instead.

## Self-Attention: The Core Mechanism

The key insight of the transformer paper (["Attention Is All You Need"](https://arxiv.org/abs/1706.03762)) is replacing recurrence entirely with attention. Instead of processing tokens sequentially, every token can attend to every other token in parallel.

Here's the math. For a sequence of tokens embedded as vectors, we compute three projections:

```
# Q, K, V projections
Q = X @ self.W_q    # What am I looking for?
K = X @ self.W_k    # What do I contain?
V = X @ self.W_v    # What information do I carry?

# Scaled dot-product attention
scores = (Q @ K.transpose(-2, -1)) / math.sqrt(d_k)
attn_weights = F.softmax(scores, dim=-1)
output = attn_weights @ V
```

The `Q @ K.transpose()` operation computes a compatibility score between every pair of tokens. The softmax normalizes these into probabilities. Then `attn_weights @ V` produces a weighted combination of all token representations.

The division by `√d_k` is crucial and I initially forgot it. Without scaling, the dot products become huge for large dimensions, pushing the softmax into regions where the gradient is near-zero. My model wouldn't converge at all until I added this single line.

Key Insight

Self-attention has O(n²) complexity with sequence length — every token attends to every other token. This is why transformer context windows have hard limits. It's also why they're so powerful: they can model relationships across the entire sequence in a single pass.

## Multi-Head Attention

A single attention head can only learn one type of relationship. Multi-head attention runs several attention heads in parallel, each with its own learned projections, then concatenates and projects the results:

```
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        self.n_heads = n_heads
        self.d_k = d_model // n_heads
        
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
    
    def forward(self, x, mask=None):
        B, T, C = x.shape
        
        # Project and reshape for multiple heads
        q = self.W_q(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)
        k = self.W_k(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)
        v = self.W_v(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)
        
        # Attention scores
        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.d_k)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        
        attn = F.softmax(scores, dim=-1)
        out = (attn @ v).transpose(1, 2).contiguous().view(B, T, C)
        return self.W_o(out)
```

I used 8 heads with `d_model=512`, giving each head a dimension of 64. In practice, different heads learn to attend to different patterns — some focus on adjacent tokens (local syntax), others on distant dependencies (semantic relationships).

## Positional Encoding

Attention is permutation-invariant — it doesn't know the _order_ of tokens. Without positional information, the sentence "the cat sat on the mat" is identical to "mat the on sat cat the" from the model's perspective.

The original paper uses sinusoidal positional encodings:

```
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1).float()
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() 
            * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe.unsqueeze(0))
    
    def forward(self, x):
        return x + self.pe[:, :x.size(1)]
```

The sinusoidal encoding is clever: each dimension oscillates at a different frequency, creating a unique positional "fingerprint" for each position. And because `sin(a+b)` can be expressed as a linear combination of `sin(a)` and `cos(a)`, the model can learn relative positions through linear transformations.

## Full Architecture

The complete transformer block stacks multi-head attention with a feed-forward network, layer normalization, and residual connections:

```
class TransformerBlock(nn.Module):
    def __init__(self, d_model, n_heads, d_ff, dropout=0.1):
        super().__init__()
        self.attn = MultiHeadAttention(d_model, n_heads)
        self.ff = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Linear(d_ff, d_model),
            nn.Dropout(dropout)
        )
        self.ln1 = nn.LayerNorm(d_model)
        self.ln2 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x, mask=None):
        # Pre-norm architecture (more stable training)
        x = x + self.dropout(self.attn(self.ln1(x), mask))
        x = x + self.ff(self.ln2(x))
        return x
```

I used **pre-norm** (LayerNorm before the sublayer) instead of post-norm (the original paper's approach). Pre-norm is significantly more stable during training — the gradients flow more evenly through the residual connections, and I didn't need learning rate warmup to prevent early divergence.

My final model: 6 layers, 8 heads, `d_model=512`, `d_ff=2048`. Roughly 45M parameters.

## Training Loop

Training a transformer is where theory meets the brutal reality of compute. My first attempts were on a local machine with no GPU — pure CPU training. A single epoch on my dataset took over 40 minutes.

Key decisions that made training work:

*   **AdamW optimizer** with weight decay of 0.01. Regular Adam led to overfitting within a few epochs.
*   **Cosine annealing** learning rate schedule starting from 3e-4. The warmup phase was critical — jumping straight to the peak LR caused immediate loss divergence.
*   **Gradient clipping** at max\_norm=1.0. Without this, I'd get NaN losses every 50-100 steps due to occasional gradient explosions.
*   **Mixed precision training** (fp16) when I moved to GPU — nearly 2x speed boost with no quality loss.

Debugging Tip

If your transformer loss plateaus early and won't come down: check your attention mask. I spent two days debugging a "learning plateau" that turned out to be a wrong causal mask — the model was attending to future tokens during training, so it learned to cheat instead of predict.

## Scaling to Cloud GPU

Local training on CPU was educational but impractical. I moved to **Google T4 GPUs** on Colab and later cloud instances. The T4's 16GB VRAM comfortably fit my 45M parameter model with batch sizes up to 32.

The speed difference was staggering. Training that took 40+ minutes per epoch on CPU dropped to under 3 minutes on the T4. I could now iterate quickly — try different hyperparameters, visualize attention patterns, and watch loss curves in real-time.

After ~50 epochs with careful hyperparameter tuning, I achieved a training loss of 0.85 on my text dataset. The generated output was coherent at the sentence level and showed clear understanding of syntax and basic semantics — leagues ahead of my RNN attempts.

## What I Learned

Building a transformer from scratch taught me things that no tutorial or API wrapper ever could:

*   **Attention is not magic.** It's a learned weighted average. The "magic" comes from learning _what_ to average and _how much_ weight to give each token — across millions of gradient updates.
*   **Scale is everything.** My 45M parameter model could generate coherent text. GPT-3 has 175B parameters. The architecture is the same — the difference is pure scale, data, and compute.
*   **Debugging ML is fundamentally different.** In web dev, a bug produces a wrong output. In ML, a bug produces a _slightly less correct_ output, and you don't know if it's a bug or just insufficient training. Learning to distinguish between the two is a skill.
*   **The loss curve tells you everything.** Sharp spikes = gradient explosions. Plateaus after initial drop = learning rate too low or architectural bottleneck. Oscillation = batch size too small. I learned to read loss curves the way a doctor reads an ECG.
*   **Understanding the machine changes how you use it.** After building my own transformer, I became dramatically better at prompt engineering, fine-tuning, and debugging production AI systems. When Manshverse's Groq integration behaves unexpectedly, I can now reason about _why_ from first principles.

If you're serious about AI engineering, I'd argue that building a transformer from scratch is the single most valuable learning exercise you can do. Not because you'll build a better model than OpenAI — but because understanding the machine makes you a better builder, period.