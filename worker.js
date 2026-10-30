export default {
  async fetch(request, env) {
    // تنظیمات CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    };

    // جواب دادن به درخواست‌های OPTIONS مرورگر
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let query = "";

      // دریافت کوئری از GET
      if (request.method === "GET") {
        const url = new URL(request.url);
        query = url.searchParams.get("q");
      } 
      // اگه POST بود، بازم سعی می‌کنیم از URL بخونیم (برای اینکه 405 نده)
      else if (request.method === "POST") {
        const url = new URL(request.url);
        query = url.searchParams.get("q");
        
        // اگه توی URL نبود، از body می‌خونیم
        if (!query) {
          const body = await request.json().catch(() => ({}));
          query = body.query;
        }
      } 
      else {
        return new Response(JSON.stringify({ 
          debug_error: "متد غیرمجاز", 
          method_received: request.method 
        }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!query) {
        return new Response(JSON.stringify({ error: "Query is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const instances = [
        "https://searx.be",
        "https://searx.tiekoetter.com",
        "https://searx.party"
      ];

      let allErrors = [];

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
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } else {
            allErrors.push(`${instance} -> HTTP ${response.status}`);
          }
        } catch (e) {
          allErrors.push(`${instance} -> ${e.message}`);
        }
      }

      return new Response(JSON.stringify({ 
        debug_error: "همه سرورها خطا دادن",
        details: allErrors
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        debug_error: "خطای داخلی", 
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};