export type UploadSceneImage = {
    readonly "input": UploadSceneImage$input;
    readonly "result": UploadSceneImage$result;
};

export type UploadSceneImage$result = {
    readonly uploadSceneImage: {
        readonly id: string;
        readonly sceneId: string;
        readonly imageType: string | null;
        readonly imageFormat: string | null;
        readonly createdAt: string;
    };
};

export type UploadSceneImage$input = {
    sceneId: string | number;
    imageData: string;
    imageType?: string | null | undefined;
    imageFormat?: string | null | undefined;
};

export type UploadSceneImage$optimistic = {
    readonly uploadSceneImage?: {
        readonly id?: string;
        readonly sceneId?: string;
        readonly imageType?: string | null;
        readonly imageFormat?: string | null;
        readonly createdAt?: string;
    };
};

export type UploadSceneImage$artifact = {
    "name": "UploadSceneImage";
    "kind": "HoudiniMutation";
    "hash": "de2a366b54490426e32c5a2355e05dc9c5349d9d8094f4c20a716f2249a4b7cc";
    "raw": `mutation UploadSceneImage($sceneId: ID!, $imageData: String!, $imageType: String, $imageFormat: String) {
  uploadSceneImage(
    input: {sceneId: $sceneId, imageData: $imageData, imageType: $imageType, imageFormat: $imageFormat}
  ) {
    id
    sceneId
    imageType
    imageFormat
    createdAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "uploadSceneImage": {
                "type": "GeneratedImage";
                "keyRaw": "uploadSceneImage(input: {sceneId: $sceneId, imageData: $imageData, imageType: $imageType, imageFormat: $imageFormat})";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "sceneId": {
                            "type": "ID";
                            "keyRaw": "sceneId";
                            "visible": true;
                        };
                        "imageType": {
                            "type": "String";
                            "keyRaw": "imageType";
                            "nullable": true;
                            "visible": true;
                        };
                        "imageFormat": {
                            "type": "String";
                            "keyRaw": "imageFormat";
                            "nullable": true;
                            "visible": true;
                        };
                        "createdAt": {
                            "type": "String";
                            "keyRaw": "createdAt";
                            "visible": true;
                        };
                    };
                };
                "visible": true;
            };
        };
    };
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "sceneId": "ID";
            "imageData": "String";
            "imageType": "String";
            "imageFormat": "String";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
};