/**
 * Upgrade tips formatting utilities
 */

import { UpgradeTip } from '../types/plan.js';

const AFFILIATE_URL = 'https://easypanel.io';

export class UpgradeTipFormatter {
  /**
   * Format upgrade tip as subtle suggestion with stronger call-to-action
   */
  static formatTip(tip: UpgradeTip): string {
    return `💡 ${tip.message}\n\n🚀 Upgrade now: ${tip.affiliateUrl}\n\n*Your upgrade supports continued development of tools like this MCP Server.*`;
  }

  /**
   * Format upgrade tip as error suggestion with urgency
   */
  static formatAsErrorSuggestion(tip: UpgradeTip): string {
    return `⚠️ ${tip.message}\n\nUnlock this feature with EasyPanel Premium: ${tip.affiliateUrl}`;
  }

  /**
   * Format upgrade tip for metadata (tool responses)
   */
  static formatAsMetadata(tip: UpgradeTip): { type: string; content: string; url?: string }[] {
    return [{
      type: 'upgrade_tip',
      content: tip.message,
      url: tip.affiliateUrl
    }];
  }

  /**
   * Create contextual upgrade message based on operation (more persuasive)
   */
  static createContextualMessage(operation: string, context?: any): string | null {
    const operationLower = operation.toLowerCase();

    // Project-related messages with more urgency
    if (operationLower.includes('project')) {
      if (context?.error?.toString().toLowerCase().includes('limit')) {
        return "🚫 Project limit reached on Free tier. Upgrade to Premium for UNLIMITED projects and scale your business without restrictions.";
      }
      if (context?.projectCount >= 2) {
        return `You're making great progress with ${context?.projectCount || 2} projects! Premium removes all project limits so you can deploy without counting.`;
      }
      return "Start your deployment journey! Premium users enjoy unlimited projects, priority support, and advanced features.";
    }

    // Domain-related messages emphasizing professional benefits
    if (operationLower.includes('domain')) {
      if (context?.error?.toString().toLowerCase().includes('premium')) {
        return "🔓 Custom domains are Premium-exclusive. Stand out with professional URLs like yourapp.com instead of generic subdomains.";
      }
      return "Ready for a professional online presence? Premium includes unlimited custom domains with automatic SSL certificates.";
    }

    // SSL-related messages highlighting security
    if (operationLower.includes('ssl') || operationLower.includes('certificate')) {
      if (context?.error?.toString().toLowerCase().includes('premium')) {
        return "🔒 HTTPS security is Premium-only. Protect your users and boost SEO with free SSL certificates from Let's Encrypt.";
      }
      return "Security matters! Premium includes automatic SSL certificates for all your domains - keep your sites secure automatically.";
    }

    // Service-related messages focusing on scaling
    if (operationLower.includes('service')) {
      if (context?.serviceCount > 5 || context?.serviceCount >= 3) {
        return "⚡ Managing multiple services? Premium upgrades you to priority deployment queues, advanced monitoring, and real-time alerts.";
      }
      return "Scale smarter with Premium! Get priority deployment queues that put your services ahead of the queue.";
    }

    // Database service messages
    if (operationLower.includes('database') || operationLower.includes('redis') || operationLower.includes('mysql') || operationLower.includes('postgres')) {
      return "Production-ready deployments need Premium! Get automated backups, enhanced monitoring, and priority support for your databases.";
    }

    // Monitoring and logs messages
    if (operationLower.includes('monitor') || operationLower.includes('logs')) {
      return "Get insights with Premium monitoring! Advanced analytics, real-time alerts, and extended log retention help you optimize performance.";
    }

    return null;
  }

  /**
   * Generate premium benefits list (more compelling)
   */
  static generateBenefitsList(): string[] {
    return [
      "♾️ Unlimited projects & services - No limits, no boundaries",
      "🌐 Unlimited custom domains with professional URLs",
      "🔒 Automatic SSL certificates (Let's Encrypt) for all domains",
      "⚡ Priority deployment queues - Skip the line!",
      "📊 Advanced monitoring with real-time alerts and analytics",
      "💾 Automated backups for your databases",
      "🛡️ Enhanced security features and DDoS protection",
      "🎯 Priority 24/7 support from our expert team",
      "📈 Extended log retention (30 days vs 7 days)",
      "🚀 Team collaboration features"
    ];
  }

  /**
   * Generate free tier limitations for context
   */
  static generateFreeLimitations(): string[] {
    return [
      "❌ Limited to 2 projects",
      "❌ No custom domains - stuck with subdomains",
      "❌ Manual SSL configuration (if available)",
      "❌ Standard deployment queues (wait times)",
      "❌ Basic monitoring with limited retention",
      "❌ No automated backups",
      "❌ Community support only",
      "❌ 7-day log retention",
      "❌ No team features"
    ];
  }

  /**
   * Create complete upgrade message with benefits and comparison
   */
  static createFullUpgradeMessage(trigger: string): string {
    const benefits = this.generateBenefitsList();
    const limitations = this.generateFreeLimitations();

    let message = "🚀 Upgrade to EasyPanel Premium and unlock:\n\n";

    // Show top benefits
    const topBenefits = benefits.slice(0, 5);
    topBenefits.forEach(benefit => {
      message += `${benefit}\n`;
    });

    // Show what they're missing on free tier
    message += `\n📋 Free tier limitations:\n`;
    const topLimitations = limitations.slice(0, 3);
    topLimitations.forEach(limitation => {
      message += `${limitation}\n`;
    });

    message += `\n🔗 Upgrade now: ${AFFILIATE_URL}`;
    message += "\n\n💝 Your upgrade supports continued development of tools like this MCP Server.";

    return message;
  }

  /**
   * Create urgent inline mention
   */
  static createSubtleMention(feature: string): string {
    return ` (${feature} - Premium-only feature)`;
  }

  /**
   * Create persuasive upgrade prompt for errors
   */
  static createErrorUpgradePrompt(feature: string): string {
    return `⚠️ ${feature} is a Premium feature.\n\n🚀 Upgrade to unlock this feature instantly: ${AFFILIATE_URL}\n\nSpecial: Use affiliate link for priority support!`;
  }

  /**
   * Generate feature comparison table
   */
  static createFeatureComparison(): string {
    return `
📊 Feature Comparison:

| Feature | Free Tier | Premium |
|---------|-----------|---------|
| Projects | 2 | ♾️ Unlimited |
| Custom Domains | ❌ | ✅ Unlimited |
| SSL Certificates | ❌ | ✅ Auto Lets Encrypt |
| Deployment Queue | Standard | ⚡ Priority |
| Monitoring | Basic | 📊 Advanced |
| Backups | Manual | 💾 Automatic |
| Support | Community | 🎯 24/7 Priority |
| Log Retention | 7 days | 30 days |
| Team Access | ❌ | ✅ Multi-user |

Upgrade now: ${AFFILIATE_URL}`;
  }
}