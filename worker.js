export default {
  async fetch(request, env) {
    // تنظیمات CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const query = url.searchParams.get("q");

      if (!query) {
        return new Response(JSON.stringify({ error: "Query is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // اتصال به DuckDuckGo Instant Answer API
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await fetch(ddgUrl);
      const data = await response.json();

      // تبدیل نتیجه به فرمتی که ماشین‌حساب ما می‌فهمه
      let results = [];
      
      // اگه جواب مستقیم داشت (مثل آب و هوا یا اطلاعات)
      if (data.AbstractText) {
        results.push({
          title: data.Heading || "DuckDuckGo Answer",
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          content: data.AbstractText
        });
      }

      // اگه موضوعات مرتبط داشت
      if (data.RelatedTopics) {
        data.RelatedTopics.forEach(topic => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0],
              url: topic.FirstURL,
              content: topic.Text
            });
          }
        });
      }

      // اگه هیچ نتیجه‌ای نبود، یه لینک به خود DDG می‌دیم
      if (results.length === 0) {
        results.push({
          title: `جستجوی "${query}" در DuckDuckGo`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          content: "نتیجه مستقیمی یافت نشد. برای دیدن نتایج کامل کلیک کنید."
        });
      }

      return new Response(JSON.stringify({ results: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: "خطا در اتصال به DuckDuckGo",
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};