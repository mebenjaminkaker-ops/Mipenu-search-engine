export default {
  async fetch(request, env) {
    // ۱. تنظیمات CORS برای اینکه مرورگر بلاک نکنه
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    };

    // ۲. جواب دادن به درخواست‌های OPTIONS (مرحله Preflight مرورگر)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ۳. تشخیص نوع درخواست (GET یا POST)
      let query = "";
      let methodUsed = request.method;

      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        query = body.query || "";
      } else if (request.method === "GET") {
        const url = new URL(request.url);
        query = url.searchParams.get("q") || "";
      } else {
        return new Response(JSON.stringify({ 
          debug_error: "متد اشتباه!", 
          received_method: methodUsed,
          message: "فقط GET و POST مجاز هستند." 
        }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!query) {
        return new Response(JSON.stringify({ 
          debug_error: "کوئری خالی است!", 
          received_query: query 
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ۴. لیست سرورهای SearXNG
      const instances = [
        "https://searx.be",
        "https://searx.tiekoetter.com",
        "https://searx.party"
      ];

      let allErrors = []; // اینجا خطاهای هر سرور رو ذخیره می‌کنیم

      for (const instance of instances) {
        try {
          const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json`;
          
          const response = await fetch(searchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json"
            }
          });

          if (!response.ok) {
            allErrors.push(`${instance} -> HTTP ${response.status}`);
            continue;
          }

          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            // موفقیت! دیتا رو برمی‌گردونیم
            return new Response(JSON.stringify(data), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } else {
            allErrors.push(`${instance} -> نتیجه‌ای نداشت`);
          }
        } catch (e) {
          allErrors.push(`${instance} -> خطای شبکه: ${e.message}`);
        }
      }

      // اگه به اینجا رسیدیم یعنی همه سرورها خطا دادن
      return new Response(JSON.stringify({ 
        debug_error: "همه سرورهای SearXNG خطا دادن!",
        details_of_failures: allErrors,
        query_received: query
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      // اگه یه خطای غیرمنتظره توی خود کد رخ داد
      return new Response(JSON.stringify({ 
        debug_error: "خطای داخلی Worker",
        full_error: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};