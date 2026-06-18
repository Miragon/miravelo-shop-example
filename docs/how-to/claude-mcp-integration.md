# 🤖 Claude Meets Our Shop: MCP Server Integration Guide

Welcome to the wild world of **Model Context Protocol (MCP)** integration!
This guide will show you how to connect MCP clients to our "Miravelo" bike shop MCP server.

## 🤔 What is MCP?

**Model Context Protocol (MCP)** is an open standard that enables AI assistants to securely connect to external data
sources and tools. Think of it as a universal translator that lets AI models talk to your applications, databases, and
services in a standardized way.

**Key MCP Benefits:**

- 🔌 **Standardized Integration**: One protocol to connect AI to many different tools
- 🛡️ **Security**: Controlled access to external resources with proper authentication
- 🔄 **Real-time Data**: AI can fetch live data instead of relying on training data
- 🛠️ **Tool Integration**: AI can perform actions, not just answer questions

## 🎯 What's This MCP Madness?

Our shop backend doesn't just serve REST APIs -
it's also a fancy **MCP server** that can chat with any MCP-compatible client!
Think of it as giving AI assistants a direct hotline to the Miravelo bike shop inventory.

**What MCP clients can do with our server:**

- 🔍 Browse all available articles (no authentication required)
- 📱 Get detailed info about specific products
- 💬 Help you find the perfect bike or cycling gear
- 🛒 Basically become your personal bike shopping assistant for browsing

**Note:** The MCP client provides read-only access to the product catalog. Shopping cart and order operations require user authentication through the web frontend.

## 🚀 Setting Up with Claude Desktop

While our MCP server works with any MCP-compatible client,
we'll focus on Claude Desktop for this guide since it's a popular and well-documented option.

### Step 1: Find Your Config File

First, you'll need to locate your Claude Desktop configuration file.
It's hiding in different places depending on your OS:

**macOS:**

```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**

```bash
%APPDATA%\Claude\claude_desktop_config.json
```

### Step 2: Build the MCP Client

Before Claude can talk to our shop, we need to build the MCP client:

```bash
./gradlew :services:shop:shop-mcp-client:build
```

This creates the JAR file that Claude will use to start our MCP server. The MCP client will connect to the shop backend to fetch article data.

### Step 3: Configure the MCP Magic

Open your `claude_desktop_config.json` file and add this configuration:

```json
{
  "mcpServers": {
    "miravelo-shop": {
      "name": "Miravelo",
      "description": "A bike shop called Miravelo where you can browse gravel bikes, road bikes and cycling gear.",
      "command": "java",
      "args": [
        "-Dspring.ai.mcp.server.stdio=true",
        "-jar",
        "/path/to/your/project/services/shop/shop-mcp-client/build/libs/shop-mcp-client.jar"
      ]
    }
  }
}
```

### Step 4: Restart Claude Desktop

Close and reopen Claude Desktop.
You should now see the "Miravelo" MCP server available in your Claude interface.

## 🎪 How It Works Under the Hood

Our MCP client acts as a bridge between Claude and the shop backend:

1. **MCP Client** (`shop-mcp-client`) - Runs locally and exposes MCP tools to Claude
2. **Shop Backend** (`shop-backend`) - Provides REST API with article data
3. **Communication** - MCP client makes HTTP requests to backend's public article endpoints

**Available MCP Tools:**

1. **`getArticles()`** - Fetches all available articles from the shop backend
2. **`getArticleById(id)`** - Gets detailed info about a specific article

These tools are implemented in `ArticleTools.kt` and make REST calls to `/api/articles` (no authentication required).

## 🎉 Testing Your Setup

Once configured, you can test it by asking Claude things like:

- *"What bikes are available in the Miravelo shop?"*
- *"Can you find me a gravel bike in the shop?"*
- *"Show me the details for article XYZ"*

Claude will use the MCP server to fetch real data from our shop backend and provide you with up-to-date information!

## 🛠️ Troubleshooting

**Claude can't find the shop?**

- Check that the JAR file path is correct
- Ensure Java is installed and available in your PATH
- Verify the project built successfully

**Server won't start?**

- Make sure no other process is using the same port
- Check that you have Java 21 installed
- Verify the Spring profile is set to `mcp-server`

**Articles not showing up?**

- Ensure the shop backend is running on port 8081: `./gradlew :services:shop:shop-backend:bootRun`
- The shop backend must have access to its database (postgres in minikube for production, H2 for local dev)
- Test data is automatically imported when the backend starts
- Check that the MCP client can reach the backend at `http://localhost:8081`
- Verify article endpoints are accessible: `curl http://localhost:8081/api/articles`
