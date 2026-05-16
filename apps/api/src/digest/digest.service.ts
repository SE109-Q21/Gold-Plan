import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { PriceService } from '../price/price.service';
import { InternationalService } from '../international/international.service';
import { MailService } from '../mail/mail.service';
import type { GoldDigest } from '@prisma/client';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);
  private consecutiveFailures = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceService: PriceService,
    private readonly internationalService: InternationalService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  // 7:30 AM ICT weekdays (ICT = UTC+7, so 00:30 UTC)
  @Cron('30 0 * * 1-5')
  async scheduledRun(): Promise<void> {
    try {
      await this.generate();
      await this.sendEmails();
      this.consecutiveFailures = 0;
    } catch (err) {
      this.consecutiveFailures++;
      this.logger.error(`DigestService: generation failed (attempt ${this.consecutiveFailures}): ${(err as Error).message}`);

      if (this.consecutiveFailures === 1) {
        // Retry once after 5 minutes
        setTimeout(() => this.retryOnce(), 5 * 60 * 1000);
      } else if (this.consecutiveFailures >= 2) {
        this.logger.error('DigestService: 2 consecutive failures — admin notification required');
      }
    }
  }

  private async retryOnce(): Promise<void> {
    try {
      await this.generate();
      await this.sendEmails();
      this.consecutiveFailures = 0;
    } catch (err) {
      this.consecutiveFailures++;
      this.logger.error(`DigestService: retry failed: ${(err as Error).message}`);
    }
  }

  async generate(): Promise<GoldDigest> {
    // Normalise to midnight ICT (UTC+7)
    const now = new Date();
    const ictOffset = 7 * 60 * 60 * 1000;
    const ictMidnight = new Date(
      Math.floor((now.getTime() + ictOffset) / 86_400_000) * 86_400_000 - ictOffset,
    );

    // Idempotent — skip if today's digest already exists
    const existing = await this.prisma.goldDigest.findUnique({ where: { date: ictMidnight } });
    if (existing) return existing;

    // Fetch current SJC price
    const prices = await this.priceService.getCurrentPrices();
    const sjcNow = prices.find(p => p.brand === 'SJC');
    if (!sjcNow) throw new Error('No SJC price available');

    // Fetch yesterday's SJC price from price history
    const yesterday = new Date(ictMidnight.getTime() - 86_400_000);
    const prevRecord = await this.prisma.priceRecord.findFirst({
      where: {
        brand: 'SJC',
        goldType: 'MIEN_SJC',
        isAnomalous: false,
        recordedAt: { gte: yesterday, lt: ictMidnight },
      },
      orderBy: { recordedAt: 'desc' },
    });

    const pctChangeSjc = prevRecord
      ? ((sjcNow.buyPrice - Number(prevRecord.buyPrice)) / Number(prevRecord.buyPrice)) * 100
      : 0;

    // Fetch XAU/USD
    let xauUsd = 0;
    try {
      const intl = await this.internationalService.getInternationalPrice();
      xauUsd = intl.spotPriceUsd;
    } catch {
      this.logger.warn('DigestService: could not fetch XAU/USD');
    }

    const direction = pctChangeSjc > 0 ? 'tăng' : pctChangeSjc < 0 ? 'giảm' : 'không đổi';
    const highlight = `Giá SJC ${direction} ${Math.abs(pctChangeSjc).toFixed(2)}% so với hôm qua.`;

    // Optional AI summary
    let aiSummary: string | null = null;
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') ?? '';
    if (apiKey) {
      try {
        const mod = await import('openai');
        const OpenAI = mod.default;
        const client = new OpenAI({ apiKey });
        const result = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `Summarise the Vietnamese gold market in 2-3 sentences. SJC buy: ${(sjcNow.buyPrice / 1_000_000).toFixed(2)}M VND, change vs yesterday: ${pctChangeSjc.toFixed(2)}%, XAU/USD: $${xauUsd.toFixed(2)}. Be concise and factual.`,
            },
          ],
          max_tokens: 150,
        });
        aiSummary = result.choices[0]?.message?.content ?? null;
      } catch (err) {
        this.logger.warn(`DigestService: AI summary failed: ${(err as Error).message}`);
      }
    }

    return this.prisma.goldDigest.create({
      data: {
        date: ictMidnight,
        sjcBuyVnd: BigInt(Math.round(sjcNow.buyPrice)),
        sjcSellVnd: BigInt(Math.round(sjcNow.sellPrice)),
        xauUsd,
        pctChangeSjc,
        highlight,
        aiSummary,
      },
    });
  }

  async sendEmails(): Promise<void> {
    const latest = await this.getLatest();
    if (!latest) return;

    const subscribers = await this.prisma.user.findMany({
      where: { digestOptIn: true, status: 'active' },
      select: { email: true },
    });

    const dateLabel = latest.date.toISOString().slice(0, 10);
    const payload = {
      date: dateLabel,
      sjcBuyVnd: Number(latest.sjcBuyVnd),
      sjcSellVnd: Number(latest.sjcSellVnd),
      xauUsd: latest.xauUsd,
      pctChangeSjc: latest.pctChangeSjc,
      highlight: latest.highlight,
      aiSummary: latest.aiSummary,
    };

    await Promise.allSettled(
      subscribers.map(u => this.mailService.sendDigestEmail(u.email, payload)),
    );

    this.logger.log(`DigestService: digest emails sent to ${subscribers.length} subscribers`);
  }

  async getLatest(): Promise<GoldDigest | null> {
    return this.prisma.goldDigest.findFirst({ orderBy: { date: 'desc' } });
  }

  async getArchive(page = 1, limit = 20): Promise<{ items: GoldDigest[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.goldDigest.findMany({ orderBy: { date: 'desc' }, skip, take: limit }),
      this.prisma.goldDigest.count(),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }
}
