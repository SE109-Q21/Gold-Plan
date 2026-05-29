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
    // Fetch SJC prices + international
    const [prices, intl] = await Promise.allSettled([
      this.priceService.getCurrentPrices(),
      this.internationalService.getInternationalPrice(),
    ]);

    const sjc = prices.status === 'fulfilled'
      ? prices.value.find(p => p.brand === 'SJC')
      : null;

    const intlPrice = intl.status === 'fulfilled' ? intl.value : null;

    const priceContext = [
      sjc ? `SJC buy=${(sjc.buyPrice / 1_000_000).toFixed(2)}M VND, sell=${(sjc.sellPrice / 1_000_000).toFixed(2)}M VND` : '',
      intlPrice ? `XAU/USD=${intlPrice.spotPriceUsd.toFixed(2)}, USD/VND=${intlPrice.exchangeRate.toLocaleString()}` : '',
    ].filter(Boolean).join('; ');

    return [
      'You are a Vietnamese gold market assistant for GPLS (Gold Price Lookup System).',
      `Current market data: ${priceContext || 'unavailable'}.`,
      'Answer questions about gold prices, market trends, buying/selling gold, and Vietnamese gold market (SJC, DOJI, PNJ, BAO_TIN brands).',
      'Decline all questions unrelated to gold with: "I can only help with gold market questions."',
      'Append "For reference only — not financial advice." to any response containing price values.',
      'Keep responses concise (under 150 words). Respond in the same language the user writes in.',
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
      const fallback = 'OpenAI API key not configured. For reference only — not financial advice.';
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
      yield 'AI service unavailable. For reference only — not financial advice.';
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
