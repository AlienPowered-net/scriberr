import { json } from "@remix-run/node";

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { prompt } = await request.json();

    if (!prompt?.trim()) {
      return json({ error: "Prompt is required" }, { status: 400 });
    }

    // Initialize OpenAI with the API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return json({ 
        error: "OpenAI API key not configured",
        details: "Please set the OPENAI_API_KEY environment variable"
      }, { status: 500 });
    }

    // Dynamic import for OpenAI (not a server-only module, but keeping pattern consistent)
    const { default: OpenAI } = await import("openai");

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Use the gpt-5-nano model as specified in the user's request
    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: prompt,
      store: true,
    });

    // Get the generated content
    const generatedContent = response.output_text || "Sorry, I couldn't generate content for that prompt.";

    return json({ 
      content: generatedContent,
      success: true 
    });

  } catch (error) {
    console.error("AI generation error:", error);
    
    // Handle quota exceeded error gracefully
    if (error.status === 429 && error.code === 'insufficient_quota') {
      return json({ 
        error: "AI service quota exceeded. Please try again later or contact support.",
        details: "The AI service has reached its usage limit. The functionality is working correctly but requires quota to be available.",
        quotaExceeded: true
      }, { status: 429 });
    }
    
    return json({ 
      error: "Failed to generate content",
      details: error.message 
    }, { status: 500 });
  }
}
