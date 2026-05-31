import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriceService } from '../price/price.service';
import { InternationalService } from '../international/international.service';

const GUEST_LIMIT = 10;
const guestCounters = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly priceService: PriceService,
    private readonly internationalService: InternationalService,
  ) {}

  async buildSystemPrompt(): Promise<string> {
    const [prices, intl] = await Promise.allSettled([
      this.priceService.getCurrentPrices(),
      this.internationalService.getInternationalPrice(),
    ]);

    const domesticPrices = prices.status === 'fulfilled' ? prices.value : [];
    const intlPrice = intl.status === 'fulfilled' ? intl.value : null;

    const priceContext = [
      ...domesticPrices.map((p) =>
        `${p.brand} ${p.goldType} buy=${(p.buyPrice / 1_000_000).toFixed(2)}M VND, sell=${(p.sellPrice / 1_000_000).toFixed(2)}M VND`,
      ),
      intlPrice ? `XAU/USD=${intlPrice.spotPriceUsd.toFixed(2)}, USD/VND=${intlPrice.exchangeRate.toLocaleString()}` : '',
    ].filter(Boolean).join('; ');

    return [
      'You are a Vietnamese gold market assistant for GPLS (Gold Price Lookup System).',
      `Current market data: ${priceContext || 'unavailable'}.`,
      'Answer only questions about gold prices, market trends, buying/selling gold, and the Vietnamese gold market.',
      'Supported brands in this product are SJC, DOJI, PNJ, and BAO_TIN. Gold types may include MIEN_SJC, NHAN_9999, VANG_24K, and VANG_18K.',
      'For exact brand or gold type prices, use only the prices listed in Current market data.',
      'If the requested brand or gold type is present in Current market data, answer with its buy and sell prices.',
      'If the requested brand or gold type is missing from Current market data, say you do not have current data for that exact item and suggest checking the official brand source. Do not infer its price from SJC.',
      'For unrelated questions, respond with exactly: "I can only help with gold market questions."',
      'Do not add a financial disclaimer to unrelated-question refusals.',
      'For answers that include price values, market analysis, or buying/selling guidance, append exactly: "For reference only - not financial advice."',
      'Keep responses concise under 150 words. Respond in the same language the user writes in.',
    ].join(' ');
  }

  checkGuestLimit(ip: string): void {
    const now = Date.now();

    // Evict expired entries to prevent unbounded memory growth
    for (const [k, v] of guestCounters) {
      if (now >= v.resetAt) guestCounters.delete(k);
    }

    const entry = guestCounters.get(ip);
    const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
    const resetAt = midnight.getTime();

    if (!entry || now >= entry.resetAt) {
      guestCounters.set(ip, { count: 1, resetAt });
      return;
    }
    if (entry.count >= GUEST_LIMIT) {
      throw new HttpException(
        { message: 'Daily limit reached. Register for unlimited questions.', code: 'GUEST_LIMIT' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    entry.count++;
  }

  async *streamChat(messages: Array<{ role: string; content: string }>): AsyncIterable<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') ?? '';

    if (!apiKey) {
      // Fallback: canned response when no API key configured
      const fallback = 'OpenAI API key not configured. For reference only - not financial advice.';
      for (const char of fallback) {
        yield char;
        await new Promise(r => setTimeout(r, 10));
      }
      return;
    }

    // Dynamic import to avoid crash if openai package not installed
    let OpenAI: any;
    try {
      const mod = await import('openai');
      OpenAI = mod.default;
    } catch {
      yield 'AI service unavailable. For reference only - not financial advice.';
      return;
    }

    const systemPrompt = await this.buildSystemPrompt();
    const client = new OpenAI({ apiKey });

    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      stream: true,
      max_tokens: 300,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
