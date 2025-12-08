import { createPromiseClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { StoryboardEditorService } from './generated/client';

const grpcApiUrl = import.meta.env.PUBLIC_GRPC_API_URL || 'http://localhost:25328';

const transport = createConnectTransport({
	baseUrl: grpcApiUrl,
});

export const grpcClient = createPromiseClient(StoryboardEditorService, transport);
