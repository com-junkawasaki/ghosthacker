/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/grpc-proto-loader
 * 
 * Load proto files and create gRPC method definitions
 */
import protobuf from 'protobufjs';
import { grpc } from '@improbable-eng/grpc-web';

const PROTO_PATH = '/performers/services/grpc/proto/manga.proto';

let protoRoot: protobuf.Root | null = null;

/**
 * Load proto file and return root
 */
export async function loadProto(): Promise<protobuf.Root> {
  if (protoRoot) {
    return protoRoot;
  }

  // In browser, we need to fetch the proto file
  if (typeof window !== 'undefined') {
    // For now, we'll use a static import or fetch
    // TODO: Load proto file from server or bundle it
    throw new Error('Proto file loading in browser not yet implemented. Please use generated types.');
  }

  // In Node.js, load from file system
  protoRoot = await protobuf.load(PROTO_PATH);
  return protoRoot;
}

/**
 * Create gRPC method definition from proto method
 */
export function createMethodDefinition<Req, Res>(
  serviceName: string,
  methodName: string,
  requestType: protobuf.Type,
  responseType: protobuf.Type
): grpc.MethodDefinition<Req, Res> {
  return {
    methodName,
    service: {
      serviceName,
    },
    requestStream: false,
    responseStream: false,
    requestType: requestType as any,
    responseType: responseType as any,
  } as grpc.MethodDefinition<Req, Res>;
}

