/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/grpc-message-serializer
 * 
 * Serialize/deserialize protobuf messages for gRPC-Web
 */
import protobuf from 'protobufjs';
import { grpc } from '@improbable-eng/grpc-web';

const PROTO_PATH = '/performers/services/grpc/proto/manga.proto';

let protoRoot: protobuf.Root | null = null;

/**
 * Load proto file and return root
 */
async function loadProto(): Promise<protobuf.Root> {
  if (protoRoot) {
    return protoRoot;
  }

  try {
    // In browser, fetch the proto file
    if (typeof window !== 'undefined') {
      const response = await fetch(PROTO_PATH);
      const protoContent = await response.text();
      protoRoot = protobuf.parse(protoContent).root;
    } else {
      // In Node.js, load from file system
      protoRoot = await protobuf.load(PROTO_PATH);
    }
    return protoRoot;
  } catch (error) {
    console.error('Failed to load proto file:', error);
    throw new Error(`Failed to load proto file: ${error}`);
  }
}

/**
 * Get protobuf Type for a message name
 */
async function getMessageType(messageName: string): Promise<protobuf.Type> {
  const root = await loadProto();
  const fullName = messageName.includes('.') ? messageName : `manga_editor.${messageName}`;
  const type = root.lookupType(fullName);
  if (!type) {
    throw new Error(`Message type ${fullName} not found`);
  }
  return type;
}

/**
 * Serialize a plain object to protobuf message
 */
export async function serializeMessage<T>(messageName: string, data: T): Promise<Uint8Array> {
  const type = await getMessageType(messageName);
  const message = type.create(data as any);
  return type.encode(message).finish();
}

/**
 * Deserialize protobuf binary to plain object
 */
export async function deserializeMessage<T>(messageName: string, data: Uint8Array): Promise<T> {
  const type = await getMessageType(messageName);
  const message = type.decode(data);
  return type.toObject(message, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true,
    arrays: true,
    objects: true,
    oneofs: true,
  }) as T;
}

// Cache for message types and serializers
const messageTypeCache = new Map<string, Promise<protobuf.Type>>();
const serializerCache = new Map<string, { serialize: (data: any) => Uint8Array; deserialize: (data: Uint8Array) => any }>();

/**
 * Get serializer for a message type
 */
async function getSerializer(messageTypeName: string) {
  const cacheKey = messageTypeName;
  if (serializerCache.has(cacheKey)) {
    return serializerCache.get(cacheKey)!;
  }

  const type = await getMessageType(messageTypeName);
  const serializer = {
    serialize: (data: any) => {
      const message = type.create(data);
      return type.encode(message).finish();
    },
    deserialize: (data: Uint8Array) => {
      const message = type.decode(data);
      return type.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: true,
        arrays: true,
        objects: true,
        oneofs: true,
      });
    },
  };

  serializerCache.set(cacheKey, serializer);
  return serializer;
}

/**
 * Create a gRPC method definition with proper serialization
 */
export async function createMethodDefinition<Req, Res>(
  serviceName: string,
  methodName: string,
  requestTypeName: string,
  responseTypeName: string
): Promise<grpc.MethodDefinition<Req, Res>> {
  const root = await loadProto();
  const service = root.lookupService(`manga_editor.${serviceName}`);
  if (!service) {
    throw new Error(`Service ${serviceName} not found`);
  }

  const method = service.methods[methodName];
  if (!method) {
    throw new Error(`Method ${methodName} not found in service ${serviceName}`);
  }

  const requestSerializer = await getSerializer(requestTypeName);
  const responseSerializer = await getSerializer(responseTypeName);

  // Create a Message-like object that grpc.unary expects
  // @improbable-eng/grpc-web expects requestType to be a constructor with serializeBinary
  // and responseType to be a constructor with deserializeBinary
  const RequestMessage = function(this: any, data: any) {
    this.data = data;
  } as any;
  RequestMessage.prototype.serializeBinary = function() {
    return requestSerializer.serialize(this.data);
  };

  // ResponseMessage needs to be a constructor with deserializeBinary static method
  const ResponseMessage = function(this: any) {} as any;
  (ResponseMessage as any).deserializeBinary = function(data: Uint8Array) {
    return responseSerializer.deserialize(data);
  };

  // @improbable-eng/grpc-web expects the service name in the format "package.Service"
  // and the method path will be "/package.Service/Method"
  return {
    methodName,
    service: {
      serviceName: `manga_editor.${serviceName}`,
    },
    requestStream: method.requestStream || false,
    responseStream: method.responseStream || false,
    requestType: RequestMessage as any,
    responseType: ResponseMessage as any,
  } as grpc.MethodDefinition<Req, Res>;
}

