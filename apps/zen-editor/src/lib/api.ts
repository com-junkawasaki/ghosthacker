import { createConnectTransport } from "@connectrpc/connect-web";
import { createPromiseClient } from "@connectrpc/connect";
import { EditorService } from "./gen/editor_connect";

const transport = createConnectTransport({
  baseUrl: "http://127.0.0.1:8080",
});

export const client = createPromiseClient(EditorService, transport);
