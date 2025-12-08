export type GetScene = {
    readonly "input": GetScene$input;
    readonly "result": GetScene$result | undefined;
};

export type GetScene$result = {
    readonly scene: {
        readonly id: string;
        readonly storyboardId: string;
        readonly sceneNumber: number;
        readonly textDescription: string | null;
        readonly mediaType: string | null;
        readonly mediaUrl: string | null;
        readonly startTimeSeconds: number | null;
        readonly durationSeconds: number | null;
        readonly transitionType: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    } | null;
};

export type GetScene$input = {
    id: string;
};

export type GetScene$artifact = {
    "name": "GetScene";
    "kind": "HoudiniQuery";
    "hash": "e4467cc30c1f0d91102f0a90f8dcd9b9a5379703a96e690cb40767c990a773d9";
    "raw": `query GetScene($id: ID!) {
  scene(id: $id) {
    id
    storyboardId
    sceneNumber
    textDescription
    mediaType
    mediaUrl
    startTimeSeconds
    durationSeconds
    transitionType
    createdAt
    updatedAt
  }
}
`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "scene": {
                "type": "Scene";
                "keyRaw": "scene(id: $id)";
                "nullable": true;
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "storyboardId": {
                            "type": "ID";
                            "keyRaw": "storyboardId";
                            "visible": true;
                        };
                        "sceneNumber": {
                            "type": "Int";
                            "keyRaw": "sceneNumber";
                            "visible": true;
                        };
                        "textDescription": {
                            "type": "String";
                            "keyRaw": "textDescription";
                            "nullable": true;
                            "visible": true;
                        };
                        "mediaType": {
                            "type": "String";
                            "keyRaw": "mediaType";
                            "nullable": true;
                            "visible": true;
                        };
                        "mediaUrl": {
                            "type": "String";
                            "keyRaw": "mediaUrl";
                            "nullable": true;
                            "visible": true;
                        };
                        "startTimeSeconds": {
                            "type": "Float";
                            "keyRaw": "startTimeSeconds";
                            "nullable": true;
                            "visible": true;
                        };
                        "durationSeconds": {
                            "type": "Float";
                            "keyRaw": "durationSeconds";
                            "nullable": true;
                            "visible": true;
                        };
                        "transitionType": {
                            "type": "String";
                            "keyRaw": "transitionType";
                            "nullable": true;
                            "visible": true;
                        };
                        "createdAt": {
                            "type": "String";
                            "keyRaw": "createdAt";
                            "visible": true;
                        };
                        "updatedAt": {
                            "type": "String";
                            "keyRaw": "updatedAt";
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
            "id": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
    "policy": "CacheOrNetwork";
    "partial": false;
};