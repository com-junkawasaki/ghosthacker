import { createPromiseClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
// @ts-ignore - Generated client will be available after buf generate
import { StoryboardEditorService } from './generated/client';

const grpcApiUrl = import.meta.env.PUBLIC_GRPC_API_URL || 'http://localhost:25328';

const transport = createConnectTransport({
	baseUrl: grpcApiUrl,
});

// @ts-ignore - Generated client will be available after buf generate
export const grpcClient = createPromiseClient(StoryboardEditorService, transport);
