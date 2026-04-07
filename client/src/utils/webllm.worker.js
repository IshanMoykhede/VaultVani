import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Instantiate the handler
const handler = new WebWorkerMLCEngineHandler();

// Listen for messages from the main thread and pass them to the handler
self.onmessage = (msg) => {
  handler.onmessage(msg);
};
