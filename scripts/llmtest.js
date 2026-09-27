const { LlmChat, UserMessage } = require("emergentintegrations");
(async () => {
  const chat = new LlmChat("sk-emergent-1B2601e14567d3cBa9", "test-1", "You are a helpful assistant.", [
    { role: "system", content: "You are a helpful assistant. Reply briefly." },
    { role: "user", content: "My name is Budi." },
    { role: "assistant", content: "Hi Budi!" },
  ]).withModel("openai", "gpt-4o-mini").withParams({ temperature: 0.3, max_tokens: 100 });
  let out = "";
  for await (const ev of chat.streamMessage(new UserMessage({ text: "What is my name? Reply with: stream works, <name>" }))) {
    if (ev.type === "text_delta") { out += ev.content; process.stdout.write("."); }
    if (ev.type === "stream_done") console.log("\nDONE:", ev.content);
  }
  console.log("OUT:", out);
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
