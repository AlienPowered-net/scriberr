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

    // TODO: Replace with actual OpenAI API integration
    // For now, return a placeholder response
    const placeholderContent = `
      <h3>AI Generated Content</h3>
      <p>This is placeholder content generated for the prompt: "${prompt}"</p>
      <p>To enable actual AI generation, you'll need to:</p>
      <ol>
        <li>Add your OpenAI API key to environment variables</li>
        <li>Install the OpenAI SDK: <code>npm install openai</code></li>
        <li>Replace this placeholder with actual OpenAI API calls</li>
      </ol>
      <p><em>Generated at: ${new Date().toLocaleString()}</em></p>
    `;

    // Uncomment and configure this section when OpenAI API key is available:
    /*
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful writing assistant. Generate high-quality content based on the user's prompt. Format your response in HTML."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const generatedContent = completion.choices[0]?.message?.content || "Sorry, I couldn't generate content for that prompt.";
    */

    return json({ 
      content: placeholderContent,
      success: true 
    });

  } catch (error) {
    console.error("AI generation error:", error);
    return json({ 
      error: "Failed to generate content",
      details: error.message 
    }, { status: 500 });
  }
}