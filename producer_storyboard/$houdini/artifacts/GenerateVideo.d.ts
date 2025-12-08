export type GenerateVideo = {
    readonly "input": GenerateVideo$input;
    readonly "result": GenerateVideo$result;
};

export type GenerateVideo$result = {
    readonly generateVideo: {
        readonly id: string;
        readonly storyboardId: string;
        readonly variationNumber: number;
        readonly status: string;
        readonly createdAt: string;
    };
};

export type GenerateVideo$input = {
    storyboardId: string | number;
};

export type GenerateVideo$optimistic = {
    readonly generateVideo?: {
        readonly id?: string;
        readonly storyboardId?: string;
        readonly variationNumber?: number;
        readonly status?: string;
        readonly createdAt?: string;
    };
};

export type GenerateVideo$artifact = {
    "name": "GenerateVideo";
    "kind": "HoudiniMutation";
    "hash": "673897b05eccba6be0901c04fec3e19a33a1104ad52b24b7e3284dcfaf0ef2aa";
    "raw": `mutation GenerateVideo($storyboardId: ID!) {
  generateVideo(storyboardId: $storyboardId) {
    id
    storyboardId
    variationNumber
    status
    createdAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "generateVideo": {
                "type": "VideoStatus";
                "keyRaw": "generateVideo(storyboardId: $storyboardId)";
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
                        "variationNumber": {
                            "type": "Int";
                            "keyRaw": "variationNumber";
                            "visible": true;
                        };
                        "status": {
                            "type": "String";
                            "keyRaw": "status";
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
            "storyboardId": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
};