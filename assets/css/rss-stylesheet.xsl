<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title><xsl:value-of select="/rss/channel/title"/> - RSS Feed</title>
        <style>
          :root {
            --primary-color: #1976d2;
            --secondary-color: #f5f5f5;
            --text-color: #333;
            --light-text: #757575;
            --border-color: #e0e0e0;
            --hover-color: #eaeaea;
            --card-shadow: 0 2px 4px rgba(0,0,0,0.1);
            --header-bg: #1976d2;
            --header-text: white;
            --footer-bg: #f5f5f5;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: white;
            max-width: 100%;
            overflow-x: hidden;
          }

          a {
            color: var(--primary-color);
            text-decoration: none;
            transition: color 0.2s;
          }

          a:hover {
            text-decoration: underline;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
          }

          header {
            background-color: var(--header-bg);
            color: var(--header-text);
            padding: 40px 0;
            margin-bottom: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }

          header .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
          }

          header p {
            font-size: 1.2rem;
            margin-bottom: 20px;
            max-width: 600px;
            opacity: 0.9;
          }

          .site-meta {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 20px;
            font-size: 0.9rem;
          }

          .site-meta div {
            display: flex;
            align-items: center;
          }

          .btn {
            display: inline-block;
            background-color: white;
            color: var(--primary-color);
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: 500;
            transition: all 0.2s;
          }

          .btn:hover {
            background-color: rgba(255, 255, 255, 0.9);
            text-decoration: none;
            transform: translateY(-2px);
          }

          .feed-info {
            background-color: var(--secondary-color);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 40px;
          }

          .feed-info h2 {
            font-size: 1.4rem;
            margin-bottom: 15px;
            color: var(--primary-color);
          }

          .feed-description {
            margin-bottom: 15px;
          }

          .feed-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            font-size: 0.9rem;
            color: var(--light-text);
          }

          .articles {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 50px;
          }

          .article-card {
            border-radius: 8px;
            border: 1px solid var(--border-color);
            overflow: hidden;
            transition: all 0.3s;
            box-shadow: var(--card-shadow);
            display: flex;
            flex-direction: column;
            height: 100%;
            background-color: white;
          }

          .article-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }

          .article-image {
            height: 200px;
            overflow: hidden;
            position: relative;
            background-color: var(--secondary-color);
          }
          
          .article-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }
          
          .article-card:hover .article-image img {
            transform: scale(1.05);
          }
          
          .no-image {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--light-text);
            font-size: 1.5rem;
          }
          
          .article-content {
            padding: 20px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          }

          .article-title {
            font-size: 1.4rem;
            margin-bottom: 10px;
            line-height: 1.3;
          }

          .article-title a {
            color: var(--text-color);
          }

          .article-title a:hover {
            color: var(--primary-color);
          }

          .article-description {
            margin-bottom: 15px;
            flex-grow: 1;
            color: var(--light-text);
          }

          .article-meta {
            font-size: 0.85rem;
            color: var(--light-text);
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
          }

          .article-categories {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 15px 0;
          }

          .category-tag {
            background-color: var(--secondary-color);
            color: var(--primary-color);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            transition: background-color 0.2s;
          }

          .category-tag:hover {
            background-color: var(--hover-color);
            text-decoration: none;
          }

          footer {
            background-color: var(--footer-bg);
            padding: 30px 0;
            text-align: center;
            margin-top: 60px;
            border-top: 1px solid var(--border-color);
          }

          footer p {
            font-size: 0.9rem;
            color: var(--light-text);
          }

          .feed-url {
            background-color: var(--secondary-color);
            padding: 15px;
            border-radius: 4px;
            text-align: center;
            margin: 30px 0;
            word-break: break-all;
          }

          .feed-url code {
            background-color: white;
            padding: 5px 8px;
            border-radius: 4px;
            font-family: monospace;
          }

          @media (max-width: 768px) {
            header h1 {
              font-size: 2rem;
            }
            
            .articles {
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            }
          }

          @media (max-width: 480px) {
            header {
              padding: 30px 0;
            }
            
            .articles {
              grid-template-columns: 1fr;
            }
            
            .container {
              padding: 0 15px;
            }
          }
        </style>
      </head>
      <body>
        <header>
          <div class="container">
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p><xsl:value-of select="/rss/channel/description"/></p>
            <div class="site-meta">
              <div>Last updated: <xsl:value-of select="/rss/channel/lastBuildDate"/></div>
            </div>
            <a href="{/rss/channel/link}" class="btn">Visit Website</a>
          </div>
        </header>

        <div class="container">
          <div class="feed-info">
            <h2>About this RSS Feed</h2>
            <div class="feed-description">
              <p>This is an RSS feed for <xsl:value-of select="/rss/channel/title"/>. Subscribe to get the latest updates delivered to your favorite RSS reader.</p>
            </div>
            <div class="feed-meta">
              <div>Language: <xsl:value-of select="/rss/channel/language"/></div>
              <div>Published: <xsl:value-of select="/rss/channel/pubDate"/></div>
            </div>
          </div>

          <div class="feed-url">
            <p>Feed URL: <code><xsl:value-of select="/rss/channel/atom:link/@href"/></code></p>
          </div>

          <div class="articles">
            <xsl:for-each select="/rss/channel/item">
              <article class="article-card">
                <!-- Display featured image if available -->
                <xsl:choose>
                  <xsl:when test="enclosure">
                    <div class="article-image">
                      <img src="{enclosure/@url}" alt="{title}" />
                    </div>
                  </xsl:when>
                  <xsl:otherwise>
                    <div class="article-image">
                      <div class="no-image">📄</div>
                    </div>
                  </xsl:otherwise>
                </xsl:choose>
                
                <div class="article-content">
                  <h2 class="article-title">
                    <a href="{link}"><xsl:value-of select="title"/></a>
                  </h2>
                  
                  <xsl:if test="category">
                    <div class="article-categories">
                      <xsl:for-each select="category">
                        <a href="{@domain}" class="category-tag">
                          <xsl:value-of select="."/>
                        </a>
                      </xsl:for-each>
                    </div>
                  </xsl:if>
                  
                  <div class="article-description">
                    <xsl:value-of select="description" disable-output-escaping="yes"/>
                  </div>
                  
                  <div class="article-meta">
                    <div>
                      <xsl:value-of select="pubDate"/>
                    </div>
                    <xsl:if test="dc:creator">
                      <div>
                        By: <xsl:value-of select="dc:creator"/>
                      </div>
                    </xsl:if>
                  </div>
                </div>
              </article>
            </xsl:for-each>
          </div>
        </div>

        <footer>
          <div class="container">
            <p><xsl:value-of select="/rss/channel/copyright"/></p>
            <p>RSS feed generated by <xsl:value-of select="/rss/channel/title"/>.</p>
          </div>
        </footer>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>