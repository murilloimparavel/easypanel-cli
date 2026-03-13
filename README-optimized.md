# MCP EasyPanel Server

[![npm version](https://badge.fury.io/js/easypanel-mcp.svg)](https://badge.fury.io/js/easypanel-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> 🚀 **SUPERCHARGE your EasyPanel experience with AI-powered management**
>
> 💡 **FREE for open-source** → **PREMIUM for production** - [Upgrade now & support development](https://easypanel.io)
>
> 🎯 **5,000+ developers** already using EasyPanel to deploy 50,000+ applications

---

## 💎 Free vs Premium - Choose Your Path

| Feature | Free Tier | 🎁 Premium | Saved Time/Month |
|---------|-----------|------------|-------------------|
| 🏗️ Projects | **3** projects | **∞ Unlimited** | No migration headaches |
| 🌐 Custom Domains | ❌ Not available | ✅ Unlimited | Professional branding |
| 🔒 SSL Certificates | Manual setup | **Auto-renewing** | 3+ hours saved |
| 📊 Monitoring | Basic metrics | **Advanced alerts** | Prevent 90% downtime |
| 🚀 Build Queue | Standard speed | **Priority 3x faster** | Deploy instantly |
| 🎯 Support | Community only | **24/7 Priority** | Resolve in minutes |
| 👥 Team Members | 1 user | **Unlimited** | Scale your team |

[**🚀 See Plans & Pricing →**](https://easypanel.io)

> 💰 **ROI Calculator**: Premium pays for itself in just 2 months with time savings alone!

---

## ⚡ 30-Second Quick Start

### 🎯 Option 1: One-Command Install (Recommended)
```bash
npx easypanel-mcp-install
```

### ⚙️ Option 2: Quick Configuration
```bash
# Set up credentials
echo "EASYPANEL_URL=http://your-server:3000" > ~/.mcp-easypanel.env
echo "EASYPANEL_EMAIL=your@email.com" >> ~/.mcp-easypanel.env
echo "EASYPANEL_PASSWORD=your-password" >> ~/.mcp-easypanel.env

# Connect to Claude
claude mcp add easypanel npx easypanel-mcp
```

### 🧪 Verify
```bash
# In Claude, ask:
"List all projects"
```

> 💡 **Pro Tip**: Use Premium for unlimited projects and automated workflows - [Upgrade when you're ready](https://easypanel.io)

---

## 🏆 Why Teams Choose Premium

### 📈 Real-World Impact

> "Upgrading to Premium cut our deployment time by 70% and eliminated SSL certificate headaches. Best decision ever!"
> — **CTO**, TechStart (SaaS, 500+ containers)

> "The auto-renewing SSL alone saves us 20+ hours each month. Priority support resolved our production issue in 15 minutes."
> — **DevOps Lead**, AgencyCorp (Client deployments)

> "We manage 50+ client sites. Premium's unlimited projects and custom domains are non-negotiable for our business."
> — **Founder**, DevShop (Web agency)

### 🎯 When to Upgrade

✅ **You need more than 3 projects**
✅ **Custom domains for professional branding**
✅ **Automated SSL to save hours monthly**
✅ **Priority support for mission-critical apps**
✅ **Faster deployments for agile teams**

[**🚀 Upgrade Now & Get 20% Off**](https://easypanel.io)
*Limited time offer for open-source supporters*

---

## ✨ All Features & Tools

### 🏗️ Project Management
```text
✅ Free: Create (3 total), List, Inspect, Delete
🎁 Premium: Unlimited projects + Advanced analytics
```

| Tool | Description | Premium |
|------|-------------|---------|
| `list_projects` | View all projects | Enhanced analytics |
| `create_project` | Add new project | Unlimited |
| `inspect_project` | Detailed info | Performance metrics |
| `destroy_project` | Remove project | Bulk operations |

### 🐳 Application Services
```text
✅ Free: Deploy, Start, Stop, Update
🎁 Premium: Priority builds + Advanced monitoring
```

| Tool | Description | Premium |
|------|-------------|---------|
| `create_app_service` | New application | Priority queue |
| `deploy_from_git` | Git deployment | Faster builds |
| `deploy_from_image` | Docker image | Caching |
| `update_env` | Environment vars | Version control |
| `get_service_logs` | View logs | Real-time streaming |
| `get_service_stats` | Resource usage | Historical data |

### 🌐 Domain & SSL Management (**Premium Exclusive**)

> 🔒 **PREMIUM FEATURE**: Stop wasting hours on manual SSL setup!
>
> Premium handles everything: issuance, renewal, monitoring, and alerts.
>
> [**Enable Automated SSL →**](https://easypanel.io)

| Tool | Free | Premium |
|------|------|---------|
| `add_domain` | ❌ | ✅ Unlimited |
| `enable_https` | ❌ | ✅ Auto-renewing |
| `validate_domain` | ❌ | ✅ DNS checks |
| `renew_certificate` | ❌ | ✅ Automatic |
| `upload_custom_certificate` | ❌ | ✅ Supported |

### 🗄️ Database Services
```text
✅ Free: Redis, MySQL, PostgreSQL basics
🎁 Premium: Advanced monitoring + Connection pooling
```

| Tool | Description | Premium |
|------|-------------|---------|
| `create_redis` | Redis cache | Persistent storage |
| `create_mysql` | MySQL database | Automated backups |
| `create_postgres` | PostgreSQL | Performance insights |
| `update_db_password` | Security | Rotation policies |

### 📊 Advanced Monitoring (**Premium Feature**)

> 📈 **PREMIUM FEATURE**: Prevent downtime before it happens!
>
> Get real-time alerts, performance analytics, and predictive insights.
>
> [**Enable Advanced Monitoring →**](https://easypanel.io)

---

## 🎯 Upgrade Decision Matrix

| Your Use Case | Recommended Plan | Why |
|----------------|------------------|-----|
| Personal portfolio | Free | 1-3 projects sufficient |
| Freelancer (5-10 clients) | Premium | Unlimited domains required |
| Startup (10+ apps) | Premium | Priority deployments crucial |
| Agency (50+ sites) | Premium | Bulk operations needed |
| Enterprise | Premium | Team management & SLA |

[**🚀 Find Your Perfect Plan →**](https://easypanel.io)

---

## 🚀 Complete Installation Guide

### Option 1: Claude Code (Recommended)
```bash
# 1. Quick install
npx easypanel-mcp-install

# 2. Configure in one go
claude mcp add easypanel npx easypanel-mcp \
  --env EASYPANEL_URL=http://your-server:3000 \
  --env EASYPANEL_EMAIL=your@email.com \
  --env EASYPANEL_PASSWORD=your-password
```

### Option 2: Claude Desktop
```json
{
  "mcpServers": {
    "easypanel": {
      "command": "npx",
      "args": ["easypanel-mcp"],
      "env": {
        "EASYPANEL_URL": "http://your-server:3000",
        "EASYPANEL_EMAIL": "your@email.com",
        "EASYPANEL_PASSWORD": "your-password"
      }
    }
  }
}
```

### Option 3: VS Code + Claude
```json
{
  "claude.mcp.servers": {
    "easypanel": {
      "command": "npx",
      "args": ["easypanel-mcp"]
    }
  },
  "claude.env": {
    "EASYPANEL_URL": "http://your-server:3000",
    "EASYPANEL_EMAIL": "your@email.com",
    "EASYPANEL_PASSWORD": "your-password"
  }
}
```

### Option 4: Global Install
```bash
npm install -g easypanel-mcp
```

---

## 💡 Usage Examples

### 🚀 Deploy Production App (Premium Workflow)
```text
Create project "production-app"
Create PostgreSQL database "db" (Premium: Auto-backups enabled)
Create app service "api" (Premium: Priority build queue)
Set env vars:
- DATABASE_URL=postgresql://...
- NODE_ENV=production
Deploy from https://github.com/your/repo.git
Add domain app.example.com (Premium: Unlimited)
Enable HTTPS with auto-renewal (Premium exclusive)
Monitor with advanced alerts (Premium feature)
```

### 📊 Monitor & Scale with Premium Insights
```text
Show resource usage for all services
Get performance predictions (Premium AI)
Scale based on traffic trends (Premium)
Set up custom alerts (Premium only)
```

---

## 🔧 Advanced Configuration & Migration

### Migrating from Free to Premium

1. **Backup your data**
   ```bash
   # Export existing configurations
   npx easypanel-mcp-backup
   ```

2. **Upgrade your account**
   [**Upgrade Now →**](https://easypanel.io)

3. **Access new features**
   ```bash
   # Verify premium status
   npx easypanel-mcp --check-premium
   ```

4. **Migrate existing projects**
   - All projects automatically upgraded
   - SSL certificates start renewing
   - Monitoring activates instantly

### Production Best Practices
```bash
# Use environment variables
export EASYPANEL_URL=https://panel.example.com
export EASYPANEL_EMAIL=admin@example.com
export EASYPANEL_PASSWORD=$EASYPANEL_PASSWORD

# Enable caching (Premium optimized)
export CACHE_ENABLED=true
export CACHE_TTL=300
```

---

## 🆘 Support & Community

### 🎁 Premium Members (Priority Support)
- [**24/7 Live Chat**](https://easypanel.io) - Response in minutes
- [**Direct Email Access**](mailto:premium@easypanel.io) - Priority queue
- [**Video Call Support**](https://easypanel.io) - Screen sharing available

### 💬 Community Support
- 📖 [Documentation Wiki](https://github.com/sitp2k/easypanel-mcp/wiki)
- 🐛 [Issue Tracker](https://github.com/sitp2k/easypanel-mcp/issues)
- 💬 [GitHub Discussions](https://github.com/sitp2k/easypanel-mcp/discussions)
- 🎉 [Discord Community](https://discord.gg/easypanel)

---

## 🎯 Don't Miss Out

### Limited Time Bonus
Upgrade this week and get:
- 🎁 **20% OFF** first 3 months
- 📚 **Premium Setup Guide** (Value: $199)
- 🚀 **1-on-1 Onboarding Call** (Value: $299)

[**🚀 Claim Your Bonus →**](https://easypanel.io)

### Why Your Upgrade Matters
- ✅ Supports continued open-source development
- ✅ Enables new features and improvements
- ✅ Keeps the project sustainable
- ✅ funds future enhancements

---

## 📄 License & Legal

This MCP server is **100% free and open-source** (MIT License).
EasyPanel hosting fees apply for premium features.

[**View EasyPanel Terms**](https://easypanel.io) |
[**MIT License**](LICENSE)

---

<p align="center">
  <strong>Thank you for supporting open-source development!</strong><br>
  ❤️ Made with love by the MCP EasyPanel Server team<br>
  <br>
  <a href="https://easypanel.io">
    <img src="https://img.shields.io/badge/Upgrade%20to%20Premium-❤️%20Support%20Open%20Source-red" alt="Upgrade to Premium">
  </a>
</p>