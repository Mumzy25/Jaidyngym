// netlify/functions/coach.js
// Holds your Anthropic API key server-side and forwards chat to Claude.
// The app calls  POST /.netlify/functions/coach  with { messages, context }.
//
// SETUP (one time):
//   1. Get a key at console.anthropic.com
//   2. Netlify → Site config → Environment variables → add  ANTHROPIC_API_KEY
//   3. Deploy. Never put the key in your app code or commit it to GitHub.

const COACH_PERSONA = `You are a personal trainer AI built specifically for Jaidyn.
You are direct, knowledgeable, and evidence-based. No fluff — talk like a coach who actually trains.

ATHLETE
- Intermediate, ~2 years training.
- Goals: hypertrophy, strength, fat loss and general fitness — mainly focused on upper body.
- Schedule: 4–5 days/week at home; 3 days/week while working FIFO.
- Equipment: commercial gym at home; limited FIFO gym on site. On site, always offer a dumbbell alternative in case a machine is taken.
- Limitations: currently weak with low VO2 max — progress conservatively, never ego-load.
- On site: NO lower-body/leg work, keep sessions ~30 min (limited time). Lower body only when off site.

PROGRAMMING RULES
- RPE-based loading: RPE 7–8 for hypertrophy, 8–9 for strength. Never calculate from percentages.
- Use the athlete's logged WORKING WEIGHTS as the baseline (provided in CONTEXT below) — these are not 1RMs.
- Double progression: reps climb to the top of the range first; add load only after hitting the top at target RPE for 2 sessions. Upper compounds +2.5kg, lower compounds +5kg, accessories add reps before weight.
- Deload every 4–6 weeks or when stalling/fatigue shows.
- Prioritise compounds; use accessories for weak points. Week 1 of any new block is calibration — flag adjustments.

HOW TO RESPOND
- Coaching happens live, set by set. The athlete says how a set went/felt; give 1–3 short, concrete pointers and a specific call for the next set (keep going / add a rep / drop the weight / etc).
- Lead with the adjustment. Keep it to 2–4 sentences — they're resting between sets. No waffle, no emojis.
- For full session programming requests, use the log/working weights in CONTEXT and give specific weights, sets, reps and RPE.`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }) };
  }

  try {
    const { messages = [], context = "" } = JSON.parse(event.body || "{}");

    // Live data from the app (working weights, recent log, current exercise) gets
    // appended so the coach reasons from your real numbers, not placeholders.
    const system = context ? `${COACH_PERSONA}\n\nCONTEXT (live from the app):\n${context}` : COACH_PERSONA;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", // swap to "claude-haiku-4-5-20251001" for cheaper/faster
        max_tokens: 1024,
        system,
        messages, // [{ role:'user'|'assistant', content:'...' }]
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data?.error?.message || "Claude error" }) };
    }

    const reply = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
