export default {
  async fetch(request, env) {
    // ۱. هندل کردن درخواست‌های OPTIONS برای CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      // ۲. دریافت کوئری (چه با POST چه با GET)
      let query = "";
      if (request.method === "POST") {
        const body = await request.json();
        query = body.query;
      } else {
        const url = new URL(request.url);
        query = url.searchParams.get("q");
      }

      if (!query) {
        return new Response(JSON.stringify({ error: "Query is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // ۳. لیست نمونه‌های SearXNG
      const instances = [
        "https://searx.be",
        "https://searx.tiekoetter.com",
        "https://searx.party",
        "https://search.brave4u.com"
      ];

      let lastError = null;

      for (const instance of instances) {
        try {
          const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json`;
          
          const response = await fetch(searchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json"
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              return new Response(JSON.stringify(data), {
                headers: { 
                  "Content-Type": "application/json", 
                  "Access-Control-Allow-Origin": "*" 
                },
              });
            }
          }
        } catch (e) {
          lastError = e.message;
          continue;
        }
      }

      return new Response(JSON.stringify({ 
        error: "All SearXNG instances failed", 
        details: lastError 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};